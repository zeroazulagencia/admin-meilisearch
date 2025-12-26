import { NextRequest, NextResponse } from 'next/server';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { groupDocumentsIntoConversations } from '@/app/omnicanalidad/utils/omnicanalidad-helpers';

const INDEX_UID = 'bd_conversations_dworkers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentName = searchParams.get('agent_name');
    const lastCheckTimestamp = searchParams.get('lastCheckTimestamp');

    if (!agentName) {
      return NextResponse.json(
        { ok: false, error: 'agent_name es requerido' },
        { status: 400 }
      );
    }

    if (!lastCheckTimestamp) {
      return NextResponse.json(
        { ok: false, error: 'lastCheckTimestamp es requerido' },
        { status: 400 }
      );
    }

    console.log('[CHECK-UPDATES] Verificando actualizaciones para agente:', agentName, 'desde:', lastCheckTimestamp);

    // Construir filtros para Meilisearch
    const filters: string[] = [];
    filters.push(`agent = "${agentName}"`);
    filters.push(`(type = "agent" OR type = "user")`);
    
    // Filtrar por datetime mayor que lastCheckTimestamp
    // Meilisearch necesita fechas como strings ISO
    const lastCheckDate = new Date(lastCheckTimestamp);
    const lastCheckISO = lastCheckDate.toISOString();
    console.log('[CHECK-UPDATES] Filtro datetime >', lastCheckISO);
    filters.push(`datetime > "${lastCheckISO}"`);
    
    const filterString = filters.join(' AND ');
    console.log('[CHECK-UPDATES] Filtro completo:', filterString);

    // Consultar Meilisearch con filtros
    const allDocuments: Document[] = [];
    let currentOffset = 0;
    const batchLimit = 1000;
    let hasMore = true;

    while (hasMore) {
      try {
        const searchParams: any = {
          q: '',
          hitsPerPage: batchLimit,
          page: Math.floor(currentOffset / batchLimit) + 1,
          filter: filters.join(' AND ')
        };

        console.log('[CHECK-UPDATES] Consultando Meilisearch, offset:', currentOffset, 'limit:', batchLimit);
        
        const data = await meilisearchAPI.searchDocuments(
          INDEX_UID,
          '',
          batchLimit,
          currentOffset,
          { filter: filterString }
        );

        console.log('[CHECK-UPDATES] Respuesta Meilisearch - hits:', data.hits?.length || 0, 'totalHits:', data.totalHits || 0);

        if (data.hits && data.hits.length > 0) {
          allDocuments.push(...data.hits);
          console.log('[CHECK-UPDATES] Documentos acumulados:', allDocuments.length);
          currentOffset += batchLimit;
          
          if (data.hits.length < batchLimit || allDocuments.length >= (data.totalHits || 0)) {
            console.log('[CHECK-UPDATES] No hay más documentos, terminando búsqueda');
            hasMore = false;
          }
        } else {
          console.log('[CHECK-UPDATES] No se encontraron hits, terminando búsqueda');
          hasMore = false;
        }
      } catch (e) {
        console.error('[CHECK-UPDATES] Error en búsqueda de Meilisearch:', e);
        hasMore = false;
      }
    }

    console.log('[CHECK-UPDATES] Documentos encontrados con cambios:', allDocuments.length);

    if (allDocuments.length === 0) {
      return NextResponse.json({
        ok: true,
        updatedConversations: [],
        newMessages: {},
        lastCheckTimestamp: new Date().toISOString()
      });
    }

    // Agrupar documentos en conversaciones
    console.log('[CHECK-UPDATES] Agrupando', allDocuments.length, 'documentos en conversaciones');
    const groupedConversations = groupDocumentsIntoConversations(allDocuments, agentName);
    console.log('[CHECK-UPDATES] Conversaciones agrupadas:', groupedConversations.length);

    // Crear mapeo de conversaciones actualizadas
    const updatedConversations: string[] = [];
    const newMessages: Record<string, {
      lastMessage: string;
      lastMessageTime: string;
      messageCount: number;
    }> = {};

    groupedConversations.forEach(conversation => {
      console.log('[CHECK-UPDATES] Procesando conversación:', conversation.id, 'lastMessage:', conversation.lastMessage.substring(0, 30));
      updatedConversations.push(conversation.id);
      newMessages[conversation.id] = {
        lastMessage: conversation.lastMessage,
        lastMessageTime: conversation.lastMessageTime,
        messageCount: conversation.messages.length
      };
    });

    const currentTimestamp = new Date().toISOString();

    console.log('[CHECK-UPDATES] Conversaciones actualizadas:', updatedConversations.length);
    console.log('[CHECK-UPDATES] IDs de conversaciones:', updatedConversations);
    console.log('[CHECK-UPDATES] Retornando lastCheckTimestamp:', currentTimestamp);

    return NextResponse.json({
      ok: true,
      updatedConversations,
      newMessages,
      lastCheckTimestamp: currentTimestamp
    });

  } catch (error: any) {
    console.error('[CHECK-UPDATES] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error al verificar actualizaciones' },
      { status: 500 }
    );
  }
}

