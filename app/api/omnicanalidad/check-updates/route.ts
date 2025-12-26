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
    filters.push(`datetime > "${lastCheckISO}"`);

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

        const data = await meilisearchAPI.searchDocuments(
          INDEX_UID,
          '',
          batchLimit,
          currentOffset,
          { filter: filters.join(' AND ') }
        );

        if (data.hits && data.hits.length > 0) {
          allDocuments.push(...data.hits);
          currentOffset += batchLimit;
          
          if (data.hits.length < batchLimit || allDocuments.length >= (data.totalHits || 0)) {
            hasMore = false;
          }
        } else {
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
    const groupedConversations = groupDocumentsIntoConversations(allDocuments, agentName);

    // Crear mapeo de conversaciones actualizadas
    const updatedConversations: string[] = [];
    const newMessages: Record<string, {
      lastMessage: string;
      lastMessageTime: string;
      messageCount: number;
    }> = {};

    groupedConversations.forEach(conversation => {
      updatedConversations.push(conversation.id);
      newMessages[conversation.id] = {
        lastMessage: conversation.lastMessage,
        lastMessageTime: conversation.lastMessageTime,
        messageCount: conversation.messages.length
      };
    });

    const currentTimestamp = new Date().toISOString();

    console.log('[CHECK-UPDATES] Conversaciones actualizadas:', updatedConversations.length);

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

