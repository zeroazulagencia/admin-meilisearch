import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { MEILISEARCH_CONFIG } from '@/utils/constants';
import { classifyQueryType } from '@/app/omnicanalidad/utils/query-classifier';

export const dynamic = 'force-dynamic';

const INDEX_UID = 'bd_conversations_dworkers';
const MAX_DOCS = 50000;

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = -4 * 60;
  const tzSign = offset >= 0 ? '+' : '-';
  const tzHours = pad(Math.floor(Math.abs(offset) / 60));
  const tzMins = pad(Math.abs(offset) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000${tzSign}${tzHours}:${tzMins}`;
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

function extractContactName(docs: any[]): string {
  for (const doc of docs) {
    if (doc.name) return String(doc.name);
    if (doc.contact_name) return String(doc.contact_name);
    if (doc.user_name) return String(doc.user_name);
    if (doc.customer_name) return String(doc.customer_name);
  }
  const lastDoc = docs[docs.length - 1];
  const userId = getUserId(lastDoc);
  const phoneId = lastDoc.phone_number_id || lastDoc.phone_id || '';
  if (userId) return `Usuario ${userId.slice(-4)}`;
  if (phoneId) return `Tel. ${String(phoneId).slice(-4)}`;
  return 'Sin nombre';
}

async function loadAllDocuments(agentName: string, start: Date, end: Date): Promise<any[]> {
  const allDocs: any[] = [];
  let offset = 0;
  const batchLimit = 1000;
  let hasMore = true;

  const filterStr = `agent = "${agentName}" AND datetime >= "${formatDate(start)}" AND datetime <= "${formatDate(end)}"`;

  while (hasMore && allDocs.length < MAX_DOCS) {
    const url = `${MEILISEARCH_CONFIG.url}indexes/${INDEX_UID}/search`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      params: {
        q: '',
        hitsPerPage: batchLimit,
        page: Math.floor(offset / batchLimit) + 1,
        filter: filterStr,
      },
    });

    const hits = response.data.hits || [];
    const filteredHits = hits.filter((doc: any) => doc.type === 'agent' || doc.type === 'user');
    allDocs.push(...filteredHits);

    if (hits.length < batchLimit) {
      hasMore = false;
    } else {
      offset += batchLimit;
    }
  }

  return allDocs;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const agent_name = sp.get('agent_name');
    const period = sp.get('period') || 'all';

    if (!agent_name) {
      return NextResponse.json({ ok: false, error: 'agent_name requerido' }, { status: 400 });
    }

    // Calcular rango de fechas
    let startDate: Date;
    const endDate = new Date();

    if (period === 'all') {
      startDate = new Date('2020-01-01');
    } else {
      const periodDays: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };
      const days = periodDays[period] || 7;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Cargar documentos
    const documents = await loadAllDocuments(agent_name, startDate, endDate);

    // Agrupar por conversacion
    const convMap = new Map<string, any[]>();

    for (const doc of documents) {
      const key = getConversationKey(doc);
      if (!convMap.has(key)) convMap.set(key, []);
      convMap.get(key)!.push(doc);
    }

    // Construir filas del Excel
    const rows: any[] = [];

    Array.from(convMap.entries()).forEach(([convKey, docs]: [string, any[]]) => {
      // Ordenar por datetime
      docs.sort((a: any, b: any) => {
        const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
        const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
        return dateA - dateB;
      });

      const firstDate = docs[0]?.datetime || '';
      const lastDate = docs[docs.length - 1]?.datetime || '';
      const contactName = extractContactName(docs);

      // Extraer phone_id y user_id
      const lastDoc = docs[docs.length - 1];
      const phoneId = lastDoc.phone_number_id || lastDoc.phone_id || '';
      const userId = getUserId(lastDoc);

      // Clasificar tipo de consulta (primer mensaje humano)
      let queryType = 'General';
      for (const doc of docs) {
        const humanMsg = doc['message-Human']?.trim?.();
        if (humanMsg) {
          queryType = classifyQueryType(humanMsg);
          break;
        }
        const userMsg = doc['message']?.trim?.();
        if (userMsg) {
          queryType = classifyQueryType(userMsg);
          break;
        }
      }

      // Construir transcript consolidado
      let transcript = '';
      let userMsgs = 0;
      let aiMsgs = 0;

      for (const doc of docs) {
        const humanMsg = doc['message-Human']?.trim?.();
        const aiMsg = doc['message-AI']?.trim?.();
        const timestamp = doc.datetime ? new Date(doc.datetime).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour12: false }) : '';

        if (humanMsg) {
          transcript += `[${timestamp}]\nUsuario: ${humanMsg}\n\n`;
          userMsgs++;
        }
        if (aiMsg) {
          transcript += `[${timestamp}]\n${agent_name}: ${aiMsg}\n\n`;
          aiMsgs++;
        }
      }

      rows.push({
        Contacto: contactName,
        Teléfono: phoneId,
        'ID Usuario': userId,
        Inicio: firstDate,
        Fin: lastDate,
        'Mensajes Usuario': userMsgs,
        'Mensajes Agente': aiMsgs,
        'Total Mensajes': userMsgs + aiMsgs,
        'Tipo Consulta': queryType,
        Transcripción: transcript.trim(),
      });
    });

    // Ordenar por Fin descendente
    rows.sort((a, b) => new Date(b.Fin).getTime() - new Date(a.Fin).getTime());

    // Generar XLSX
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 20 },  // Contacto
      { wch: 16 },  // Teléfono
      { wch: 16 },  // ID Usuario
      { wch: 22 },  // Inicio
      { wch: 22 },  // Fin
      { wch: 14 },  // Mensajes Usuario
      { wch: 14 },  // Mensajes Agente
      { wch: 14 },  // Total Mensajes
      { wch: 16 },  // Tipo Consulta
      { wch: 80 },  // Transcripción
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Conversaciones');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `conversaciones_${agent_name}_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    console.error('[EXPORT XLSX] Error:', e?.message, e?.response?.data || '');
    return NextResponse.json({ ok: false, error: e?.message || 'Error generando exportacion' }, { status: 500 });
  }
}