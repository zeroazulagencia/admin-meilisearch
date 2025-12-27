import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { groupDocumentsIntoConversations } from '@/app/omnicanalidad/utils/conversation-helpers';
import { Conversation } from '@/app/omnicanalidad/utils/types';

const INDEX_UID = 'bd_conversations_dworkers';

// GET - Cargar lista de conversaciones agrupadas con contador de no leídos
export async function GET(req: NextRequest) {
  try {
    console.log('[OMNICANALIDAD CONVERSATIONS] INICIO');
    const searchParams = req.nextUrl.searchParams;
    const agent_name = searchParams.get('agent_name');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const read_by = searchParams.get('read_by'); // client_id del usuario actual

    if (!read_by) {
      return NextResponse.json({ ok: false, error: 'read_by (client_id) es requerido' }, { status: 400 });
    }

    console.log('[OMNICANALIDAD CONVERSATIONS] Cargando conversaciones:', { agent_name, limit, offset, read_by });

    // 1. Obtener agente si se proporciona agent_name
    let agent_id: number | null = null;
    if (agent_name) {
      try {
        const [agentRows] = await query<any>(
          'SELECT id FROM agents WHERE conversation_agent_name = ? LIMIT 1',
          [agent_name]
        );
        if (agentRows && agentRows.length > 0) {
          agent_id = agentRows[0].id;
        }
      } catch (e: any) {
        console.error('[OMNICANALIDAD CONVERSATIONS] Error obteniendo agente:', e?.message);
      }
    }

    // 2. Cargar documentos de Meilisearch
    const allDocuments: Document[] = [];
    let currentOffset = 0;
    const batchLimit = 1000;
    let hasMore = true;

    while (hasMore && allDocuments.length < limit * 2) {
      try {
        const filters: string[] = [];
        if (agent_name) {
          filters.push(`agent = "${agent_name}"`);
        }
        // NO filtrar por type en Meilisearch - se filtra manualmente después
        // porque type no es filtrable en Meilisearch

        const filterString = filters.length > 0 ? filters.join(' AND ') : undefined;
        console.log('[OMNICANALIDAD CONVERSATIONS] Filtro Meilisearch:', filterString);
        
        const searchResults = await meilisearchAPI.searchDocuments(
          INDEX_UID,
          '',
          batchLimit,
          currentOffset,
          filterString ? { filter: filterString } : undefined
        );

        const hits = searchResults.hits as Document[];
        
        // Filtrar manualmente por type (agent o user)
        // porque type no es filtrable en Meilisearch
        const filteredHits = hits.filter((doc: Document) => {
          return doc.type === 'agent' || doc.type === 'user';
        });
        
        allDocuments.push(...filteredHits);
        console.log(`[OMNICANALIDAD CONVERSATIONS] Documentos obtenidos: ${hits.length}, filtrados por type: ${filteredHits.length}`);

        if (hits.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      } catch (e: any) {
        console.error('[OMNICANALIDAD CONVERSATIONS] Error cargando documentos:', e?.message);
        hasMore = false;
      }
    }

    console.log('[OMNICANALIDAD CONVERSATIONS] Total documentos cargados:', allDocuments.length);

    // 3. Agrupar documentos en conversaciones
    const conversations = groupDocumentsIntoConversations(allDocuments);

    // 4. Consultar conversation_reads para cada conversación y calcular no leídos
    const conversationsWithUnread: Conversation[] = [];

    for (const conv of conversations.slice(offset, offset + limit)) {
      // Extraer agent_id, user_id, phone_number_id de la conversación
      const convAgentId = agent_id;
      const convUserId = conv.user_id;
      const convPhoneId = conv.phone_number_id || '';

      if (!convAgentId || !convUserId) {
        conversationsWithUnread.push(conv);
        continue;
      }

      try {
        // Consultar conversation_reads
        const [readRows] = await query<any>(
          `SELECT last_read_datetime, last_message_datetime, unread_count 
           FROM conversation_reads 
           WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND read_by = ? 
           LIMIT 1`,
          [convAgentId, convUserId, convPhoneId, read_by]
        );

        if (readRows && readRows.length > 0) {
          const readData = readRows[0];
          const lastRead = readData.last_read_datetime ? new Date(readData.last_read_datetime) : null;
          const lastMessage = new Date(conv.lastMessageTime);

          // Calcular no leídos comparando timestamps
          if (!lastRead || lastMessage > lastRead) {
            // Hay mensajes nuevos
            const unreadCount = readData.unread_count || 0;
            conv.unreadCount = unreadCount > 0 ? unreadCount : 1;
          } else {
            conv.unreadCount = 0;
          }
        } else {
          // No hay registro, todos los mensajes son no leídos
          conv.unreadCount = 1;
        }
      } catch (e: any) {
        console.error('[OMNICANALIDAD CONVERSATIONS] Error consultando conversation_reads:', e?.message);
        conv.unreadCount = 0;
      }

      conversationsWithUnread.push(conv);
    }

    console.log('[OMNICANALIDAD CONVERSATIONS] Conversaciones procesadas:', conversationsWithUnread.length);
    console.log('[OMNICANALIDAD CONVERSATIONS] Total conversaciones agrupadas:', conversations.length);
    console.log('[OMNICANALIDAD CONVERSATIONS] FIN');

    return NextResponse.json({
      ok: true,
      conversations: conversationsWithUnread,
      total: conversations.length,
      limit,
      offset
    });
  } catch (e: any) {
    console.error('[OMNICANALIDAD CONVERSATIONS] Error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Error cargando conversaciones' }, { status: 500 });
  }
}

