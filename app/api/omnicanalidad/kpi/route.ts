import { NextRequest, NextResponse } from 'next/server';
import { MEILISEARCH_CONFIG } from '@/utils/constants';
import {
  buildKnownUsers,
  getKnownUsers,
  classifyUsers,
  addKnownUsers,
} from '@/app/omnicanalidad/utils/known-users';

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
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    default: {
      start = new Date(end);
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }
  }

  return { start, end };
}

function getPreviousPeriodRange(period: string, curStart: Date, curEnd: Date): { start: Date; end: Date } {
  const diff = curEnd.getTime() - curStart.getTime();
  return {
    start: new Date(curStart.getTime() - diff),
    end: new Date(curStart.getTime()),
  };
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

function esMensajeFactura(doc: any): boolean {
  // Una factura registrada se identifica por:
  // 1. El mensaje AI contiene confirmación de registro
  // 2. El usuario envió una imagen (image_base64)
  const aiMsg = (doc['message-AI'] || '').toLowerCase();
  const tieneImagen = !!doc.image_base64;
  const esConfirmacion = /factura\s*(registrada|recibida|en\s*proceso)/i.test(aiMsg) ||
                         /ya\s*fue\s*registrada/i.test(aiMsg) ||
                         /registro\s*exitoso/i.test(aiMsg);

  return esConfirmacion || (tieneImagen && /factura/i.test(aiMsg));
}

async function loadDocuments(agentName: string, filterStr: string): Promise<any[]> {
  const allDocs: any[] = [];
  let offset = 0;
  const batchLimit = 1000;

  while (allDocs.length < MAX_DOCS) {
    const results = await searchMeilisearch(agentName, filterStr, batchLimit, offset);
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

  return allDocs;
}

function calculateKPIs(documents: any[]) {
  const uniqueUsers = new Set<string>();
  const convMap = new Map<string, { userMsgs: number; aiMsgs: number }>();
  let facturasRegistradas = 0;

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

    // Contar facturas registradas
    if (esMensajeFactura(doc)) {
      facturasRegistradas++;
    }
  }

  let successful = 0;
  let abandoned = 0;
  Array.from(convMap.values()).forEach((conv) => {
    if (conv.userMsgs > 0 && conv.aiMsgs > 0) {
      successful++;
    } else if (conv.userMsgs > 0 && conv.aiMsgs === 0) {
      // Usuario preguntó pero agente nunca respondió → abandono
      abandoned++;
    }
    // Si aiMsgs > 0 pero userMsgs === 0 es solo mensaje de bienvenida, no cuenta
  });

  const totalConvs = convMap.size;

  return {
    uniqueVisitors: uniqueUsers.size,
    totalConversations: totalConvs,
    successfulConversations: successful,
    abandonedConversations: abandoned,
    successRate: totalConvs > 0 ? Number((successful / totalConvs * 100).toFixed(1)) : 0,
    abandonmentRate: totalConvs > 0 ? Number(((abandoned / totalConvs) * 100).toFixed(1)) : 0,
    facturasRegistradas,
    totalMessages: documents.length,
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const agent_name = sp.get('agent_name');
    const period = sp.get('period') || 'week';
    const date_from = sp.get('date_from');
    const date_to = sp.get('date_to');
    const useCustomRange = !!(date_from && date_to);

    if (!agent_name) {
      return NextResponse.json({ ok: false, error: 'agent_name requerido' }, { status: 400 });
    }

    let curStart: Date, curEnd: Date, periodLabel: string;

    if (useCustomRange) {
      curStart = new Date(date_from!);
      curEnd = new Date(date_to!);
      periodLabel = `custom:${date_from}:${date_to}`;
    } else {
      const range = getPeriodRange(period);
      curStart = range.start;
      curEnd = range.end;
      periodLabel = period;
    }

    const startStr = formatDate(curStart);
    const endOfDay = new Date(curEnd);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endStr = formatDate(endOfDay);

    // Período anterior (para crecimiento)
    const prevPeriod = getPreviousPeriodRange(periodLabel.startsWith('custom') ? 'month' : periodLabel, curStart, curEnd);
    const prevStartStr = formatDate(prevPeriod.start);
    const prevEndOfDay = new Date(prevPeriod.end);
    prevEndOfDay.setDate(prevEndOfDay.getDate() + 1);
    const prevEndStr = formatDate(prevEndOfDay);

    // Cargar documentos del período actual
    const filterStr = `agent = "${agent_name}" AND datetime >= ${startStr} AND datetime < ${endStr}`;
    const currentDocs = await loadDocuments(agent_name, filterStr);

    // Cargar documentos del período anterior
    const prevFilterStr = `agent = "${agent_name}" AND datetime >= ${prevStartStr} AND datetime < ${prevEndStr}`;
    const prevDocs = await loadDocuments(agent_name, prevFilterStr);

    // Calcular KPIs
    const current = calculateKPIs(currentDocs);
    const previous = calculateKPIs(prevDocs);

    // --- Visitantes nuevos vs conocidos ---
    // Obtener o construir la BD de usuarios conocidos (histórico completo)
    const knownUsers = await getKnownUsers(agent_name);
    const currentUserIds = Array.from(new Set(currentDocs.map(getUserId).filter(Boolean)));
    const { newUsers, returningUsers } = classifyUsers(currentUserIds, knownUsers);

    // --- Crecimiento por métrica ---
    const calcGrowth = (curVal: number, prevVal: number): number => {
      if (prevVal > 0) return Number(((curVal - prevVal) / prevVal * 100).toFixed(1));
      if (curVal > 0) return 100;
      return 0;
    };

    // Actualizar BD con nuevos usuarios
    addKnownUsers(agent_name, newUsers);

    return NextResponse.json({
      ok: true,
      period: periodLabel,
      current: {
        ...current,
        newUniqueVisitors: newUsers.length,
        returningVisitors: returningUsers.length,
        growth: {
          rate: calcGrowth(current.totalConversations, previous.totalConversations),
          previousConversations: previous.totalConversations,
          currentConversations: current.totalConversations,
          visitorsRate: calcGrowth(current.uniqueVisitors, previous.uniqueVisitors),
          previousVisitors: previous.uniqueVisitors,
          currentVisitors: current.uniqueVisitors,
          invoicesRate: calcGrowth(current.facturasRegistradas, previous.facturasRegistradas),
          previousInvoices: previous.facturasRegistradas,
          currentInvoices: current.facturasRegistradas,
        },
      },
      previous: {
        ...previous,
        totalConversations: previous.totalConversations,
        facturasRegistradas: previous.facturasRegistradas,
        successRate: previous.successRate,
        uniqueVisitors: previous.uniqueVisitors,
      },
      start: startStr,
      end: endStr,
    });
  } catch (e: any) {
    console.error('[KPI API] Error:', e?.message, e?.response?.data || '');
    return NextResponse.json({ ok: false, error: e?.message || 'Error calculando KPIs' }, { status: 500 });
  }
}