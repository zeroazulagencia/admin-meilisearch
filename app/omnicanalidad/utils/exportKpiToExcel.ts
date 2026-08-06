import * as ExcelJS from 'exceljs';

interface KpiData {
  uniqueVisitors: number;
  totalConversations: number;
  successfulConversations: number;
  abandonedConversations: number;
  successRate: number;
  abandonmentRate: number;
  facturasRegistradas: number;
  totalMessages: number;
  newUniqueVisitors: number;
  returningVisitors: number;
  growth: {
    rate: number;
    previousConversations: number;
    currentConversations: number;
    visitorsRate: number;
    previousVisitors: number;
    currentVisitors: number;
    invoicesRate: number;
    previousInvoices: number;
    currentInvoices: number;
  };
}

interface KpiResponse {
  period: string;
  current: KpiData;
  previous: Partial<KpiData>;
  start: string;
  end: string;
}

// ── Colores ──
const C = {
  primary: '1A73E8',
  success: '0F9D58',
  danger: 'EA4335',
  warning: 'FBBC04',
  header: '1A237E',
  subHeader: '3949AB',
  lightBg: 'F5F5F5',
  white: 'FFFFFF',
  dark: '333333',
  gray: '999999',
  border: 'D0D0D0',
};

function border(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } },
    right: { style: 'thin', color: { argb: C.border } },
  };
}

function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    bold?: boolean;
    color?: string;
    bg?: string;
    align?: 'center' | 'left' | 'right';
    fmt?: string;
    size?: number;
  },
) {
  cell.font = {
    name: 'Calibri',
    size: opts.size ?? 11,
    bold: opts.bold ?? false,
    color: { argb: opts.color ?? C.dark },
  };
  if (opts.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
  }
  if (opts.align) {
    cell.alignment = { horizontal: opts.align, vertical: 'middle' };
  } else {
    cell.alignment = { vertical: 'middle' };
  }
  if (opts.fmt) cell.numFmt = opts.fmt;
  cell.border = border();
}

// ── Canvas chart renderers ──

function renderBarChart(
  labels: string[],
  datasets: { label: string; data: number[]; color: string }[],
  title: string,
  width = 600,
  height = 360,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const pad = { top: 50, right: 30, bottom: 55, left: 60 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Fondo
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, width, height);

  // Título
  ctx.fillStyle = '#1A237E';
  ctx.font = 'bold 16px Calibri, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 28);

  const groupW = chartW / labels.length;
  const barW = Math.min((groupW * 0.7) / datasets.length, 40);
  const maxVal = Math.max(...datasets.flatMap((d) => d.data), 1);

  // Grid lines
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '10px Calibri, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((maxVal * i) / 4).toString(), pad.left - 8, y + 4);
  }

  // Barras
  labels.forEach((label, i) => {
    datasets.forEach((ds, j) => {
      const x = pad.left + i * groupW + (groupW - datasets.length * barW) / 2 + j * barW;
      const barH = (ds.data[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      // Gradiente
      const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
      grad.addColorStop(0, ds.color);
      grad.addColorStop(1, ds.color + '88');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW - 2, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Valor encima
      if (ds.data[i] > 0) {
        ctx.fillStyle = C.dark;
        ctx.font = '10px Calibri, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ds.data[i].toString(), x + (barW - 2) / 2, y - 5);
      }
    });

    // Label eje X
    ctx.fillStyle = '#555';
    ctx.font = '11px Calibri, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, pad.left + i * groupW + groupW / 2, height - pad.bottom + 20);
  });

  // Leyenda
  const legendY = height - 18;
  let legendX = pad.left;
  datasets.forEach((ds, i) => {
    ctx.fillStyle = ds.color;
    ctx.fillRect(legendX, legendY - 8, 14, 14);
    ctx.fillStyle = C.dark;
    ctx.font = '10px Calibri, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ds.label, legendX + 18, legendY + 4);
    legendX += ctx.measureText(ds.label).width + 50;
  });

  return canvas.toDataURL('image/png');
}

function renderPieChart(
  labels: string[],
  data: number[],
  title: string,
  width = 400,
  height = 340,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const colors = ['#1A73E8', '#0F9D58', '#EA4335', '#FBBC04', '#AB47BC', '#00BCD4', '#FF7043'];
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const cx = width / 2 - 40;
  const cy = height / 2 - 10;
  const radius = Math.min(cx, cy) - 20;

  // Fondo
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, width, height);

  // Título
  ctx.fillStyle = '#1A237E';
  ctx.font = 'bold 15px Calibri, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 25);

  let startAngle = -Math.PI / 2;
  data.forEach((val, i) => {
    if (val === 0) return;
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Etiqueta
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = radius * 0.65;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;
    const pct = ((val / total) * 100).toFixed(1);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 11px Calibri, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${pct}%`, lx, ly + 4);

    startAngle += sliceAngle;
  });

  // Leyenda a la derecha
  const legendX = width - 140;
  let legendY = 60;
  data.forEach((val, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = C.dark;
    ctx.font = '10px Calibri, Arial, sans-serif';
    ctx.textAlign = 'left';
    const pct = ((val / total) * 100).toFixed(1);
    ctx.fillText(`${labels[i]} (${pct}%)`, legendX + 18, legendY + 10);
    legendY += 22;
  });

  return canvas.toDataURL('image/png');
}
async function canvasToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// ── Main export function ──

export async function exportKpiToExcel(
  data: KpiResponse[],
  agentName: string,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WORKERS Analytics';

  const getPeriod = (p: string, start?: string, end?: string) =>
    p.startsWith('custom:') ? (start && end ? `${start} → ${end}` : 'Período Personalizado') :
    p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año';

  // ═══════════════════════════════════════════
  // SHEET 1: Resumen KPIs
  // ═══════════════════════════════════════════
  const s1 = wb.addWorksheet('Resumen KPIs', { views: [{ showGridLines: false }] });
  s1.getColumn(1).width = 34;
  for (let ci = 2; ci <= data.length + 1; ci++) s1.getColumn(ci).width = 20;

  // Título
  const lastCol = s1.getColumn(data.length + 1).letter;
  s1.mergeCells(`A1:${lastCol}1`);
  styleCell(s1.getCell('A1'), { bold: true, size: 18, color: C.header, align: 'center' });
  s1.getCell('A1').value = `KPIs - ${agentName.charAt(0).toUpperCase() + agentName.slice(1)}`;
  s1.getRow(1).height = 42;

  s1.mergeCells(`A2:${lastCol}2`);
  styleCell(s1.getCell('A2'), { size: 10, color: C.gray, align: 'center' });
  s1.getCell('A2').value = `Exportado: ${new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })}`;
  s1.getRow(2).height = 20;

  // Cabeceras
  const periodLabels = data.map(d => getPeriod(d.period, d.start, d.end));
  const hRow = s1.getRow(4);
  hRow.values = ['Métrica', ...periodLabels];
  hRow.height = 28;
  hRow.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  const metrics: { label: string; key: keyof KpiData; fmt?: string }[] = [
    { label: 'Visitantes Únicos', key: 'uniqueVisitors' },
    { label: 'Visitantes Nuevos', key: 'newUniqueVisitors' },
    { label: 'Visitantes Recurrentes', key: 'returningVisitors' },
    { label: 'Conversaciones Atendidas', key: 'totalConversations' },
    { label: 'Conversaciones Exitosas', key: 'successfulConversations' },
    { label: 'Conversaciones Abandonadas', key: 'abandonedConversations' },
    { label: 'Tasa de Éxito', key: 'successRate', fmt: '0.0%' },
    { label: 'Tasa de Abandono', key: 'abandonmentRate', fmt: '0.0%' },
    { label: 'Facturas Registradas', key: 'facturasRegistradas' },
    { label: 'Mensajes Totales', key: 'totalMessages' },
  ];

  metrics.forEach((m, i) => {
    const r = s1.getRow(5 + i);
    r.height = 24;
    styleCell(r.getCell(1), { bold: true });
    r.getCell(1).value = m.label;
    data.forEach((d, j) => {
      const val = d.current[m.key] as number;
      const cell = r.getCell(j + 2);
      cell.value = m.fmt === '0.0%' ? val / 100 : val;
      styleCell(cell, {
        align: 'center',
        fmt: m.fmt ?? '#,##0',
        bg: i % 2 === 0 ? C.lightBg : undefined,
      });
    });
  });

  // Crecimiento
  const gRow = s1.getRow(5 + metrics.length);
  gRow.height = 24;
  styleCell(gRow.getCell(1), { bold: true });
  gRow.getCell(1).value = 'Crecimiento vs Período Anterior';
  data.forEach((d, j) => {
    const rate = d.current.growth.rate;
    const cell = gRow.getCell(j + 2);
    cell.value = rate / 100;
    styleCell(cell, {
      align: 'center',
      fmt: '+0.0%;-0.0%',
      bold: true,
      color: rate >= 0 ? C.success : C.danger,
    });
  });

  // ═══════════════════════════════════════════
  // SHEET 2: Comparativa
  // ═══════════════════════════════════════════
  const s2 = wb.addWorksheet('Comparativa', { views: [{ showGridLines: false }] });
  s2.getColumn(1).width = 30;
  [2, 3, 4, 5, 6].forEach((c) => (s2.getColumn(c).width = 18));

  let row = 1;
  data.forEach((d) => {

    s2.mergeCells(`A${row}:F${row}`);
    const t = s2.getCell(`A${row}`);
    t.value = `${getPeriod(d.period, d.start, d.end)} (${d.start} → ${d.end})`;
    styleCell(t, { bold: true, size: 13, color: C.white, bg: C.header, align: 'center' });
    s2.getRow(row).height = 30;
    row++;

    const hRow2 = s2.getRow(row);
    hRow2.values = ['Métrica', 'Actual', 'Anterior', 'Cambio', '', 'Indicador'];
    hRow2.height = 26;
    hRow2.eachCell((c) => styleCell(c, { bold: true, size: 10, color: C.white, bg: C.subHeader, align: 'center' }));
    row++;

    const compM: { label: string; cur: number; prev: number; fmt?: string }[] = [
      { label: 'Conversaciones', cur: d.current.totalConversations, prev: d.previous.totalConversations ?? 0 },
      { label: 'Visitantes Únicos', cur: d.current.uniqueVisitors, prev: d.previous.uniqueVisitors ?? 0 },
      { label: 'Tasa de Éxito', cur: d.current.successRate / 100, prev: (d.previous.successRate ?? 0) / 100, fmt: '0.0%' },
      { label: 'Facturas', cur: d.current.facturasRegistradas, prev: d.previous.facturasRegistradas ?? 0 },
      { label: 'Abandono', cur: d.current.abandonmentRate / 100, prev: (d.previous.abandonmentRate ?? 0) / 100, fmt: '0.0%' },
      { label: 'Mensajes', cur: d.current.totalMessages, prev: d.previous.totalMessages ?? 0 },
    ];

    compM.forEach((m) => {
      const r = s2.getRow(row);
      r.height = 22;
      styleCell(r.getCell(1), { bold: true });
      r.getCell(1).value = m.label;

      [m.cur, m.prev].forEach((v, j) => {
        const c = r.getCell(j + 2);
        c.value = v;
        styleCell(c, { align: 'center', fmt: m.fmt ?? '#,##0' });
      });

      // Cambio
      const diff = typeof m.cur === 'number' && typeof m.prev === 'number' && m.prev !== 0
        ? (m.cur - m.prev) / m.prev
        : 0;
      const cc = r.getCell(4);
      cc.value = diff;
      styleCell(cc, {
        align: 'center',
        fmt: '+0.0%;-0.0%',
        bold: true,
        color: diff >= 0 ? C.success : C.danger,
      });

      // Barra visual
      const barCell = r.getCell(5);
      barCell.value = '';
      if (diff !== 0) {
        const barW = Math.min(Math.abs(diff) * 40, 50);
        barCell.value = diff > 0 ? '█'.repeat(Math.ceil(barW / 8)) : '█'.repeat(Math.ceil(barW / 8));
        barCell.font = {
          name: 'Calibri',
          size: 8,
          color: { argb: diff >= 0 ? C.success : C.danger },
        };
      }

      // Indicador
      const ic = r.getCell(6);
      ic.value = m.prev === 0 && m.cur > 0 ? '🆕' : diff >= 0 ? '▲' : '▼';
      styleCell(ic, {
        align: 'center',
        size: 14,
        color: m.prev === 0 && m.cur > 0 ? C.success : diff >= 0 ? C.success : C.danger,
      });

      row++;
    });

    // Fila crecimiento
    const gr = s2.getRow(row);
    gr.height = 26;
    styleCell(gr.getCell(1), { bold: true, color: C.header });
    gr.getCell(1).value = 'CRECIMIENTO GENERAL';
    const grRate = d.current.growth.rate;
    const gc = gr.getCell(4);
    gc.value = grRate / 100;
    styleCell(gc, {
      align: 'center', fmt: '+0.0%;-0.0%',
      bold: true, size: 12,
      color: grRate >= 0 ? C.success : C.danger, bg: C.lightBg,
    });
    const gi = gr.getCell(6);
    gi.value = grRate >= 0 ? '▲' : '▼';
    styleCell(gi, { align: 'center', size: 16, color: grRate >= 0 ? C.success : C.danger, bg: C.lightBg });
    row += 2;
  });

  // ═══════════════════════════════════════════
  // SHEET 3: Gráficos (canvas charts as images)
  // ═══════════════════════════════════════════
  const s3 = wb.addWorksheet('Gráficos', { views: [{ showGridLines: false }] });
  s3.getColumn(1).width = 80;

  // Chart 1: Barras - Conversaciones y Facturas
  const chartLabels = data.map(d => getPeriod(d.period, d.start, d.end));
  const chart1Data = [
    {
      label: 'Conversaciones',
      data: data.map((d) => d.current.totalConversations),
      color: '#1A73E8',
    },
    {
      label: 'Facturas',
      data: data.map((d) => d.current.facturasRegistradas),
      color: '#0F9D58',
    },
    {
      label: 'Abandonadas',
      data: data.map((d) => d.current.abandonedConversations),
      color: '#EA4335',
    },
  ];

  const chart1Url = renderBarChart(chartLabels, chart1Data, 'Conversaciones, Facturas y Abandonadas');
  // Chart 2: Nuevos vs Recurrentes
  const chart2Data = [
    {
      label: 'Nuevos',
      data: data.map((d) => d.current.newUniqueVisitors),
      color: '#1A73E8',
    },
    {
      label: 'Recurrentes',
      data: data.map((d) => d.current.returningVisitors),
      color: '#0F9D58',
    },
  ];
  const chart2Url = renderBarChart(chartLabels, chart2Data, 'Visitantes Nuevos vs Recurrentes');

  // Chart 3: Tasa éxito vs abandono
  const chart3Data = [
    {
      label: 'Éxito',
      data: data.map((d) => Math.round(d.current.successRate * 10) / 10),
      color: '#0F9D58',
    },
    {
      label: 'Abandono',
      data: data.map((d) => Math.round(d.current.abandonmentRate * 10) / 10),
      color: '#EA4335',
    },
  ];
  const chart3Url = renderBarChart(chartLabels, chart3Data, 'Tasa de Éxito vs Abandono', 500, 320);

  // Chart 4: Pie - Visitantes totales (primer periodo como referencia)
  const refData = data[0];
  let chart4Url = '';
  if (refData) {
    chart4Url = renderPieChart(
      ['Nuevos', 'Recurrentes'],
      [refData.current.newUniqueVisitors, refData.current.returningVisitors],
      'Distribución de Visitantes',
    );
  }

  // Insert images
  const imgRows = [
    { url: chart1Url, row: 1 },
    { url: chart2Url, row: 22 },
  ];

  for (const img of imgRows) {
    const blob = await canvasToBlob(img.url);
    const buffer = await blob.arrayBuffer();
    const imgId = wb.addImage({ buffer: new Uint8Array(buffer) as any, extension: 'png' });
    s3.addImage(imgId, {
      tl: { col: 0, row: img.row },
      ext: { width: 620, height: 370 },
    });
  }

  if (chart4Url) {
    const blob = await canvasToBlob(chart4Url);
    const buffer = await blob.arrayBuffer();
    const imgId = wb.addImage({ buffer: new Uint8Array(buffer) as any, extension: 'png' });
    s3.addImage(imgId, {
      tl: { col: 0, row: 43 },
      ext: { width: 420, height: 350 },
    });
  }

  // Chart 3 below others
  {
    const blob = await canvasToBlob(chart3Url);
    const buffer = await blob.arrayBuffer();
    const imgId = wb.addImage({ buffer: new Uint8Array(buffer) as any, extension: 'png' });
    s3.addImage(imgId, {
      tl: { col: 0, row: 63 },
      ext: { width: 520, height: 330 },
    });
  }

  // ═══════════════════════════════════════════
  // SHEET 4: Detalle
  // ═══════════════════════════════════════════
  const s4 = wb.addWorksheet('Detalle', { views: [{ showGridLines: false }] });
  s4.getColumn(1).width = 34;
  [2, 3, 4].forEach((c) => (s4.getColumn(c).width = 20));

  const dH = s4.getRow(1);
  dH.values = ['Dato', ...periodLabels];
  dH.height = 28;
  dH.eachCell((c) => styleCell(c, { bold: true, color: C.white, bg: C.header, align: 'center' }));

  const detailM: { label: string; fn: (d: KpiResponse) => string | number }[] = [
    { label: 'Total Mensajes', fn: (d) => d.current.totalMessages },
    {
      label: 'Prom. Msgs/Conversación',
      fn: (d) =>
        d.current.totalConversations > 0
          ? Math.round((d.current.totalMessages / d.current.totalConversations) * 10) / 10
          : 0,
    },
    { label: 'Visitantes por Conversación', fn: (d) => (d.current.totalConversations > 0
      ? (d.current.uniqueVisitors / d.current.totalConversations).toFixed(2)
      : '0') },
    { label: 'Facturas por Conversación', fn: (d) => (d.current.totalConversations > 0
      ? (d.current.facturasRegistradas / d.current.totalConversations).toFixed(2)
      : '0') },
    { label: 'Crecimiento', fn: (d) => `${d.current.growth.rate >= 0 ? '+' : ''}${d.current.growth.rate.toFixed(1)}%` },
    { label: 'Período Inicio', fn: (d) => d.start },
    { label: 'Período Fin', fn: (d) => d.end },
    { label: 'Agente', fn: () => agentName },
  ];

  detailM.forEach((m, i) => {
    const r = s4.getRow(i + 2);
    r.height = 22;
    styleCell(r.getCell(1), { bold: true });
    r.getCell(1).value = m.label;
    data.forEach((d, j) => {
      const cell = r.getCell(j + 2);
      cell.value = m.fn(d);
      styleCell(cell, { align: 'center', bg: i % 2 === 0 ? C.lightBg : undefined });
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as unknown as Uint8Array;
}