'use client';

import ExcelJS from 'exceljs';
import type { Document } from '@/utils/meilisearch';
import { classifyQueryType } from '@/app/omnicanalidad/utils/query-classifier';

// ── helpers de estilo ──
const C = {
  header: '1F4E79',
  subHeader: '2E75B6',
  white: 'FFFFFF',
  gray: '808080',
  lightBg: 'F2F2F2',
  success: '27AE60',
  danger: 'E74C3C',
  accent: '5DE1E5',
};

function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    bg?: string;
    align?: 'left' | 'center' | 'right';
    fmt?: string;
  },
) {
  const f = cell.font || {};
  cell.font = {
    ...f,
    bold: opts.bold ?? f.bold,
    size: opts.size ?? f.size ?? 11,
    color: opts.color ? { argb: opts.color } : f.color,
  };
  if (opts.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  }
  if (opts.align) {
    cell.alignment = { horizontal: opts.align, vertical: 'middle', wrapText: true };
  }
  if (opts.fmt) {
    cell.numFmt = opts.fmt;
  }
}

// ── tipos ──
interface TypeStats {
  mensajes: number;
  conversaciones: number;
}

interface DayRow {
  date: string;
  conversations: number;
  messages: number;
  visitors: number;
}

// ── Main export ──
export async function exportConversacionesExcel(
  documents: Document[],
  mensajesPorTipo: Record<string, TypeStats>,
  agentName: string,
  dateFrom: string,
  dateTo: string,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WORKERS Analytics';

  // ── compute stats ──
  const totalDocs = documents.length;
  const uniqueVisitors = new Set(
    documents.map(d => d.user_id || d.phone_id || d.phone_number_id || d.session_id || ''),
  ).size;

  // Conversations: group by phone_id/session_id
  const convMap = new Map<string, Document[]>();
  for (const doc of documents) {
    const key =
      doc.phone_id || doc.phone_number_id
        ? `phone_${doc.phone_id || doc.phone_number_id}`
        : doc.session_id
          ? `session_${doc.session_id}`
          : doc.user_id
            ? `user_${doc.user_id}`
            : 'unknown';
    if (!convMap.has(key)) convMap.set(key, []);
    convMap.get(key)!.push(doc);
  }
  const totalConversations = convMap.size;
  const avgMessages = totalConversations > 0 ? Math.round(totalDocs / totalConversations) : 0;

  // Daily breakdown
  const dayMap = new Map<string, DayRow>();
  for (const doc of documents) {
    if (!doc.datetime) continue;
    const day = doc.datetime.slice(0, 10);
    if (!dayMap.has(day)) {
      dayMap.set(day, { date: day, conversations: 0, messages: 0, visitors: 0 });
    }
    const row = dayMap.get(day)!;
    row.messages++;
  }
  // Count conversations per day
  convMap.forEach((msgs) => {
    // Get the unique days for this conversation
    const dates = msgs.map(m => m.datetime?.slice(0, 10)).filter(Boolean) as string[];
    const days = Array.from(new Set(dates));
    for (const day of days) {
      if (dayMap.has(day)) {
        dayMap.get(day)!.conversations++;
        // Count unique visitors per day
        const visitorsOnDay = new Set(
          msgs.filter(m => m.datetime?.startsWith(day)).map(m => m.user_id || m.phone_id || ''),
        );
        dayMap.get(day)!.visitors += visitorsOnDay.size;
      }
    }
  });
  const dailyRows = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // ═══════════════════════════════════════════
  // SHEET 1: Resumen
  // ═══════════════════════════════════════════
  const s1 = wb.addWorksheet('Resumen Conversaciones', { views: [{ showGridLines: false }] });
  s1.getColumn(1).width = 36;
  s1.getColumn(2).width = 22;
  s1.getColumn(3).width = 22;

  // Title
  s1.mergeCells('A1:C1');
  styleCell(s1.getCell('A1'), { bold: true, size: 18, color: C.header, align: 'center' });
  s1.getCell('A1').value = `${agentName} — Estadísticas de Conversaciones`;
  s1.getRow(1).height = 42;

  s1.mergeCells('A2:C2');
  styleCell(s1.getCell('A2'), { size: 10, color: C.gray, align: 'center' });
  const now = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  s1.getCell('A2').value = `${dateFrom} → ${dateTo} — Exportado: ${now}`;
  s1.getRow(2).height = 20;

  // Metrics header
  const hRow = s1.getRow(4);
  hRow.values = ['Métrica', 'Valor', ''];
  hRow.height = 28;
  hRow.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  const metrics: { label: string; value: number | string }[] = [
    { label: 'Total Conversaciones', value: totalConversations },
    { label: 'Total Mensajes', value: totalDocs },
    { label: 'Promedio Mensajes / Conversación', value: avgMessages },
    { label: 'Usuarios Únicos', value: uniqueVisitors },
    { label: 'Tipos de Consulta Distintos', value: Object.keys(mensajesPorTipo).length },
    { label: 'Rango de Fechas', value: `${dateFrom} → ${dateTo}` },
  ];

  metrics.forEach((m, i) => {
    const r = s1.getRow(5 + i);
    r.height = 24;
    styleCell(r.getCell(1), { bold: true });
    r.getCell(1).value = m.label;
    const vCell = r.getCell(2);
    vCell.value = m.value;
    styleCell(vCell, { align: 'center', fmt: typeof m.value === 'number' ? '#,##0' : undefined, bg: i % 2 === 0 ? C.lightBg : undefined });
  });

  // ── Breakdown by type ──
  const typeStartRow = 5 + metrics.length + 2;
  s1.mergeCells(`A${typeStartRow}:C${typeStartRow}`);
  styleCell(s1.getCell(`A${typeStartRow}`), { bold: true, size: 14, color: C.white, bg: C.subHeader, align: 'center' });
  s1.getCell(`A${typeStartRow}`).value = 'Desglose por Tipo de Consulta';
  s1.getRow(typeStartRow).height = 30;

  const typeHdr = s1.getRow(typeStartRow + 1);
  typeHdr.values = ['Tipo de Consulta', 'Conversaciones', 'Mensajes'];
  typeHdr.height = 26;
  typeHdr.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  const typeEntries = Object.entries(mensajesPorTipo).sort(([, a], [, b]) => b.conversaciones - a.conversaciones);
  typeEntries.forEach(([type, stats], i) => {
    const r = s1.getRow(typeStartRow + 2 + i);
    r.height = 22;
    styleCell(r.getCell(1), { bold: false });
    r.getCell(1).value = type;
    r.getCell(2).value = stats.conversaciones;
    styleCell(r.getCell(2), { align: 'center', fmt: '#,##0' });
    r.getCell(3).value = stats.mensajes;
    styleCell(r.getCell(3), { align: 'center', fmt: '#,##0', bg: i % 2 === 0 ? C.lightBg : undefined });
  });

  // ── Totals row ──
  const totalTypeRow = typeStartRow + 2 + typeEntries.length;
  const tRow = s1.getRow(totalTypeRow);
  tRow.height = 24;
  styleCell(tRow.getCell(1), { bold: true });
  tRow.getCell(1).value = 'TOTALES';
  const totalConvs = typeEntries.reduce((s, [, v]) => s + v.conversaciones, 0);
  const totalMsgs = typeEntries.reduce((s, [, v]) => s + v.mensajes, 0);
  tRow.getCell(2).value = totalConvs;
  styleCell(tRow.getCell(2), { bold: true, align: 'center', fmt: '#,##0' });
  tRow.getCell(3).value = totalMsgs;
  styleCell(tRow.getCell(3), { bold: true, align: 'center', fmt: '#,##0' });

  // ═══════════════════════════════════════════
  // SHEET 2: Desglose Diario
  // ═══════════════════════════════════════════
  const s2 = wb.addWorksheet('Desglose Diario', { views: [{ showGridLines: false }] });
  s2.getColumn(1).width = 16;
  s2.getColumn(2).width = 20;
  s2.getColumn(3).width = 16;
  s2.getColumn(4).width = 18;

  s2.mergeCells('A1:D1');
  styleCell(s2.getCell('A1'), { bold: true, size: 16, color: C.header, align: 'center' });
  s2.getCell('A1').value = 'Desglose Diario';
  s2.getRow(1).height = 36;

  const dhRow = s2.getRow(3);
  dhRow.values = ['Fecha', 'Conversaciones', 'Mensajes', 'Usuarios'];
  dhRow.height = 26;
  dhRow.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  dailyRows.forEach((row, i) => {
    const r = s2.getRow(4 + i);
    r.height = 22;
    r.getCell(1).value = row.date;
    styleCell(r.getCell(1), { align: 'center' });
    r.getCell(2).value = row.conversations;
    styleCell(r.getCell(2), { align: 'center', fmt: '#,##0' });
    r.getCell(3).value = row.messages;
    styleCell(r.getCell(3), { align: 'center', fmt: '#,##0' });
    r.getCell(4).value = row.visitors;
    styleCell(r.getCell(4), { align: 'center', fmt: '#,##0', bg: i % 2 === 0 ? C.lightBg : undefined });
  });

  // Totals
  const totRow2 = s2.getRow(4 + dailyRows.length);
  totRow2.height = 24;
  styleCell(totRow2.getCell(1), { bold: true });
  totRow2.getCell(1).value = 'TOTALES';
  totRow2.getCell(2).value = dailyRows.reduce((s, r) => s + r.conversations, 0);
  styleCell(totRow2.getCell(2), { bold: true, align: 'center', fmt: '#,##0' });
  totRow2.getCell(3).value = dailyRows.reduce((s, r) => s + r.messages, 0);
  styleCell(totRow2.getCell(3), { bold: true, align: 'center', fmt: '#,##0' });
  totRow2.getCell(4).value = dailyRows.reduce((s, r) => s + r.visitors, 0);
  styleCell(totRow2.getCell(4), { bold: true, align: 'center', fmt: '#,##0' });

  // ═══════════════════════════════════════════
  // SHEET 3: Datos Crudos
  // ═══════════════════════════════════════════
  const s3 = wb.addWorksheet('Datos Crudos', { views: [{ showGridLines: false }] });
  const cols = ['user_id', 'phone_id', 'session_id', 'agent', 'type', 'datetime', 'message-Human', 'message-AI', 'tipo_consulta'];
  cols.forEach((_, i) => (s3.getColumn(i + 1).width = 22));

  const dHdr = s3.getRow(1);
  dHdr.values = cols;
  dHdr.height = 24;
  dHdr.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  documents.forEach((doc, i) => {
    const r = s3.getRow(2 + i);
    r.height = 18;
    const humanText = String(doc['message-Human'] || doc['message'] || '');
    r.getCell(1).value = doc.user_id || doc.iduser || '';
    r.getCell(2).value = doc.phone_id || doc.phone_number_id || '';
    r.getCell(3).value = doc.session_id || '';
    r.getCell(4).value = doc.agent || '';
    r.getCell(5).value = doc.type || '';
    r.getCell(6).value = doc.datetime ? doc.datetime.slice(0, 19).replace('T', ' ') : '';
    r.getCell(7).value = humanText;
    r.getCell(8).value = doc['message-AI'] || '';
    r.getCell(9).value = classifyQueryType(humanText);
    if (i % 2 === 0) {
      for (let c = 1; c <= cols.length; c++) {
        styleCell(r.getCell(c), { bg: C.lightBg });
      }
    }
  });

  return wb.xlsx.writeBuffer() as unknown as Promise<Uint8Array>;
}