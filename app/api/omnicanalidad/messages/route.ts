import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { documentsToMessages } from '@/app/omnicanalidad/utils/conversation-helpers';
import { Message } from '@/app/omnicanalidad/utils/types';

const INDEX_UID = 'bd_conversations_dworkers';

// GET - Cargar mensajes completos de una conversación y marcar como leído
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const conversation_id = searchParams.get('conversation_id'); // Formato: phone_XXX_user_YYY
    const agent_name = searchParams.get('agent_name');
    const read_by = searchParams.get('read_by'); // client_id del usuario

    if (!conversation_id || !agent_name) {
      return NextResponse.json({ ok: false, error: 'conversation_id y agent_name son requeridos' }, { status: 400 });
    }

    console.log('[OMNICANALIDAD MESSAGES] Cargando mensajes:', { conversation_id, agent_name, read_by });

    // 1. Parsear conversation_id para extraer user_id y phone_number_id
    let userId = '';
    let phoneId = '';
    
    if (conversation_id.startsWith('phone_')) {
      const parts = conversation_id.split('_');
      if (parts.length >= 4 && parts[2] === 'user') {
        phoneId = parts[1];
        userId = parts.slice(3).join('_');
      } else {
        phoneId = parts.slice(1).join('_');
      }
    } else if (conversation_id.startsWith('user_')) {
      userId = conversation_id.replace('user_', '');
    } else if (conversation_id.startsWith('session_')) {
      // Para session_id, necesitamos buscar en los documentos
    }

    // 2. Obtener agent_id
    let agent_id: number | null = null;
    try {
      const [agentRows] = await query<any>(
        'SELECT id FROM agents WHERE conversation_agent_name = ? LIMIT 1',
        [agent_name]
      );
      if (agentRows && agentRows.length > 0) {
        agent_id = agentRows[0].id;
      }
    } catch (e: any) {
      console.error('[OMNICANALIDAD MESSAGES] Error obteniendo agente:', e?.message);
    }

    // 3. Cargar documentos de Meilisearch para esta conversación
    const allDocuments: Document[] = [];
    let currentOffset = 0;
    const batchLimit = 1000;
    let hasMore = true;

    while (hasMore) {
      try {
        const filters: string[] = [`agent = "${agent_name}"`];
        // NO filtrar por type en Meilisearch - se filtra manualmente después

        if (phoneId) {
          filters.push(`(phone_id = "${phoneId}" OR phone_number_id = "${phoneId}")`);
        }
        if (userId) {
          filters.push(`user_id = "${userId}"`);
        }

        const searchResults = await meilisearchAPI.searchDocuments(
          INDEX_UID,
          '',
          batchLimit,
          currentOffset,
          { filter: filters.join(' AND ') }
        );

        const hits = searchResults.hits as Document[];
        
        // Filtrar documentos que coincidan con la conversación Y por type
        const matchingDocs = hits.filter(doc => {
          // Filtrar por type primero
          const isTypeValid = doc.type === 'agent' || doc.type === 'user';
          if (!isTypeValid) return false;
          
          const docPhoneId = doc.phone_id || doc.phone_number_id || '';
          const docUserId = doc.user_id || '';
          
          if (phoneId && userId) {
            return (docPhoneId === phoneId || String(docPhoneId) === String(phoneId)) &&
                   (docUserId === userId || String(docUserId) === String(userId));
          } else if (phoneId) {
            return docPhoneId === phoneId || String(docPhoneId) === String(phoneId);
          } else if (userId) {
            return docUserId === userId || String(docUserId) === String(userId);
          }
          return false;
        });

        allDocuments.push(...matchingDocs);
        console.log(`[OMNICANALIDAD MESSAGES] Documentos obtenidos: ${hits.length}, filtrados: ${matchingDocs.length}`);

        if (hits.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      } catch (e: any) {
        console.error('[OMNICANALIDAD MESSAGES] Error cargando documentos:', e?.message);
        hasMore = false;
      }
    }

    console.log('[OMNICANALIDAD MESSAGES] Total documentos cargados:', allDocuments.length);

    // 4. Convertir documentos a mensajes
    const messages = documentsToMessages(allDocuments);

    // 5. Obtener último mensaje para marcar como leído
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMessageDatetime = lastMessage ? lastMessage.datetime : new Date().toISOString();

    // 6. Marcar como leído si se proporciona read_by
    if (read_by && agent_id && userId) {
      try {
        await query(
          `INSERT INTO conversation_reads 
           (agent_id, user_id, phone_number_id, read_by, last_read_datetime, last_message_datetime, unread_count)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE
           last_read_datetime = VALUES(last_read_datetime),
           last_message_datetime = VALUES(last_message_datetime),
           unread_count = 0,
           updated_at = CURRENT_TIMESTAMP`,
          [agent_id, userId, phoneId || '', read_by, lastMessageDatetime, lastMessageDatetime]
        );
        console.log('[OMNICANALIDAD MESSAGES] Conversación marcada como leída');
      } catch (e: any) {
        console.error('[OMNICANALIDAD MESSAGES] Error marcando como leído:', e?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      messages,
      total: messages.length
    });
  } catch (e: any) {
    console.error('[OMNICANALIDAD MESSAGES] Error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Error cargando mensajes' }, { status: 500 });
  }
}

