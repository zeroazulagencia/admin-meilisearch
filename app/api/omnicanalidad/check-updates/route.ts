import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { groupDocumentsIntoConversations } from '@/app/omnicanalidad/utils/conversation-helpers';

const INDEX_UID = 'bd_conversations_dworkers';

// GET - Verificar nuevas conversaciones/mensajes
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const agent_name = searchParams.get('agent_name');
    const lastCheckTimestamp = searchParams.get('lastCheckTimestamp');
    const read_by = searchParams.get('read_by'); // client_id del usuario

    if (!agent_name || !lastCheckTimestamp || !read_by) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    console.log('[OMNICANALIDAD CHECK-UPDATES] Verificando actualizaciones:', {
      agent_name,
      lastCheckTimestamp,
      read_by
    });

    // 1. Obtener agent_id
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
      console.error('[OMNICANALIDAD CHECK-UPDATES] Error obteniendo agente:', e?.message);
    }

    if (!agent_id) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
    }

    // 2. Ajustar timestamp para incluir un pequeño margen (2 segundos atrás)
    const checkDate = new Date(lastCheckTimestamp);
    checkDate.setSeconds(checkDate.getSeconds() - 2);
    const adjustedTimestamp = checkDate.toISOString();

    // 3. Consultar Meilisearch para documentos nuevos
    const filters: string[] = [`agent = "${agent_name}"`];
    filters.push(`datetime >= "${adjustedTimestamp}"`);
    // NO filtrar por type en Meilisearch - se filtra manualmente después

    const searchResults = await meilisearchAPI.searchDocuments(
      INDEX_UID,
      '',
      1000,
      0,
      { filter: filters.join(' AND ') }
    );

    const hits = searchResults.hits as Document[];
    
    // Filtrar manualmente por type (agent o user)
    const newDocuments = hits.filter((doc: Document) => {
      return doc.type === 'agent' || doc.type === 'user';
    });
    
    console.log('[OMNICANALIDAD CHECK-UPDATES] Documentos obtenidos:', hits.length, 'filtrados por type:', newDocuments.length);

    if (newDocuments.length === 0) {
      return NextResponse.json({
        ok: true,
        updatedConversations: [],
        newMessages: []
      });
    }

    // 4. Agrupar documentos en conversaciones
    const updatedConversations = groupDocumentsIntoConversations(newDocuments);

    // 5. Consultar conversation_reads para identificar conversaciones con nuevos mensajes
    const conversationsWithNewMessages: string[] = [];
    const newMessages: Array<{ conversationId: string; unreadCount: number }> = [];

    for (const conv of updatedConversations) {
      const userId = conv.user_id;
      const phoneId = conv.phone_number_id || '';

      try {
        const [readRows] = await query<any>(
          `SELECT last_read_datetime, last_message_datetime, unread_count 
           FROM conversation_reads 
           WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND read_by = ? 
           LIMIT 1`,
          [agent_id, userId, phoneId, read_by]
        );

        const lastMessageTime = new Date(conv.lastMessageTime);
        let hasNewMessages = false;

        if (readRows && readRows.length > 0) {
          const readData = readRows[0];
          const lastRead = readData.last_read_datetime ? new Date(readData.last_read_datetime) : null;

          if (!lastRead || lastMessageTime > lastRead) {
            hasNewMessages = true;
            // Incrementar unread_count
            const newUnreadCount = (readData.unread_count || 0) + 1;
            
            await query(
              `UPDATE conversation_reads 
               SET last_message_datetime = ?, 
                   unread_count = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND read_by = ?`,
              [conv.lastMessageTime, newUnreadCount, agent_id, userId, phoneId, read_by]
            );

            newMessages.push({
              conversationId: conv.id,
              unreadCount: newUnreadCount
            });
          }
        } else {
          // No hay registro, crear uno nuevo
          hasNewMessages = true;
          await query(
            `INSERT INTO conversation_reads 
             (agent_id, user_id, phone_number_id, read_by, last_read_datetime, last_message_datetime, unread_count)
             VALUES (?, ?, ?, ?, NULL, ?, 1)
             ON DUPLICATE KEY UPDATE
             last_message_datetime = VALUES(last_message_datetime),
             unread_count = unread_count + 1,
             updated_at = CURRENT_TIMESTAMP`,
            [agent_id, userId, phoneId, read_by, conv.lastMessageTime]
          );

          newMessages.push({
            conversationId: conv.id,
            unreadCount: 1
          });
        }

        if (hasNewMessages) {
          conversationsWithNewMessages.push(conv.id);
        }
      } catch (e: any) {
        console.error('[OMNICANALIDAD CHECK-UPDATES] Error procesando conversación:', e?.message);
      }
    }

    console.log('[OMNICANALIDAD CHECK-UPDATES] Conversaciones actualizadas:', conversationsWithNewMessages.length);

    return NextResponse.json({
      ok: true,
      updatedConversations: conversationsWithNewMessages,
      newMessages
    });
  } catch (e: any) {
    console.error('[OMNICANALIDAD CHECK-UPDATES] Error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Error verificando actualizaciones' }, { status: 500 });
  }
}

