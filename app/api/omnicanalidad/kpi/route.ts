import { NextRequest, NextResponse } from 'next/server';
import { MEILISEARCH_CONFIG } from '@/utils/constants';

export const dynamic = 'force-dynamic';

const INDEX_UID = 'bd_conversations_dworkers';
const MAX_DOCS = 5000;

function getPeriodRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      break;
    case 'week': {
      start = new Date(end);
      start.setDate(end.getDate() - 7);
      // 7 days ago at 00:00:00
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(end);
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function searchMeilisearch(agentName: string, filter: string, limit: number, offset: number) {
  const url = `${MEILISEARCH_CONFIG.url}indexes/${INDEX_UID}/search`;
  const params = {
    q: '',
    limit,
    offset,
    filter,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meilisearch error ${response.status}: ${text}`);
  }

  return response.json();
}

function getUserId(doc: any): string {
  const candidates = [doc.user_id, doc.iduser, doc.userid, doc.i_user, doc.id_user, doc.userId, doc.userID, doc.IDuser, doc.ID_user];
  for (const val of candidates) {
    if (val && val !== 'unknown' && String(val).trim().length > 0) return String(val).trim();
  }
  return '';
}

function getConversationKey(doc: any): string {
  const phoneId = doc.phone_id || doc.phone_number_id || '';
  const userId = getUserId(doc);
  const sessionId = doc.session_id || '';

  if (phoneId && userId) return `phone_${phoneId}_user_${userId}`;
  if (phoneId) return `phone_${phoneId}`;
  if (sessionId && sessionId !== 'unknown') return `session_${sessionId}`;
  if (userId) return `user_${userId}`;
  return 'unknown';
}

function calculateKPIs(documents: any[]) {
  const uniqueUsers = new Set<string>();
  const convMap = new Map<string, { userMsgs: number; aiMsgs: number }>();

  for (const doc of documents) {
    const uid = getUserId(doc);
    if (uid) uniqueUsers.add(uid);

    const key = getConversationKey(doc);
    if (!convMap.has(key)) {
      convMap.set(key, { userMsgs: 0, aiMsgs: 0 });
    }
    const conv = convMap.get(key)!;
    if (doc['message-Human']?.trim()) conv.userMsgs++;
    if (doc['message-AI']?.trim()) conv.aiMsgs++;
  }

  let successful = 0;
  Array.from(convMap.values()).forEach((conv) => {
    if (conv.userMsgs > 0 && conv.aiMsgs > 0) successful++;
  });

  const totalConvs = convMap.size;

  // Contar mensajes por tipo
  let totalUserMessages = 0;
  let totalAgentMessages = 0;
  for (const doc of documents) {
    if (doc['message-Human']?.trim()) totalUserMessages++;
    if (doc['message-AI']?.trim()) totalAgentMessages++;
  }

  return {
    uniqueVisitors: uniqueUsers.size,
    totalConversations: totalConvs,
    successfulConversations: successful,
    successRate: totalConvs > 0 ? Number((successful / totalConvs * 100).toFixed(1)) : 0,
    totalMessages: documents.length,
    totalUserMessages,
    totalAgentMessages,
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const agent_name = sp.get('agent_name');
    const period = sp.get('period') || 'week';

    if (!agent_name) {
      return NextResponse.json({ ok: false, error: 'agent_name requerido' }, { status: 400 });
    }

    const { start: curStart, end: curEnd } = getPeriodRange(period);

    // Construir filtro Meilisearch con rango de fechas
    // Construir filtro Meilisearch con rango de fechas (solo YYYY-MM-DD)
    const startStr = formatDate(curStart);
    // endOfDay = día siguiente para capturar todo el día actual
    const endOfDay = new Date(curEnd);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endStr = formatDate(endOfDay);
    const filterStr = `agent = "${agent_name}" AND datetime >= ${startStr} AND datetime < ${endStr}`;

    // Cargar documentos del período actual
    const allDocs: any[] = [];
    let offset = 0;
    const batchLimit = 1000;

    while (allDocs.length < MAX_DOCS) {
      const results = await searchMeilisearch(agent_name, filterStr, batchLimit, offset);
      const hits = results.hits || [];
      if (hits.length === 0) break;

      for (const doc of hits) {
        if (doc.type === 'user' || doc.type === 'agent') {
          allDocs.push(doc);
        }
      }

      if (hits.length < batchLimit) break;
      offset += batchLimit;
    }

    const current = calculateKPIs(allDocs);

    return NextResponse.json({
      ok: true,
      period,
      current,
      start: startStr,
      end: endStr,
    });
  } catch (e: any) {
    console.error('[KPI API] Error:', e?.message, e?.response?.data || '');
    return NextResponse.json({ ok: false, error: e?.message || 'Error calculando KPIs' }, { status: 500 });
  }
}