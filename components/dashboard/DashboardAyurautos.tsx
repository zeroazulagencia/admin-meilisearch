'use client';

import { useMemo, useState } from 'react';
import type { Document } from '@/utils/meilisearch';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// ── Datos de vehículos conocidos de Ayurautos ──
const CAR_BRANDS = [
  'Subaru', 'Suzuki', 'Citroën', 'Citroen', 'Seres', 'GWM',
  'Nissan', 'Toyota', 'Hyundai', 'Kia', 'Renault', 'Chevrolet',
  'Mazda', 'Mitsubishi', 'Volkswagen', 'Ford', 'BMW', 'Mercedes',
  'Audi', 'Honda', 'Peugeot', 'Fiat', 'Volvo', 'Jeep',
];

const CAR_KEYWORDS = [
  'carro', 'vehículo', 'vehiculo', 'camioneta', 'auto', 'automóvil',
  'camión', 'camion', 'moto', 'motocicleta',
];

// ── Categorías de intención ──
const INTENT_RULES: { name: string; keywords: string[] }[] = [
  { name: 'Servicio Técnico / Taller', keywords: ['servicio', 'taller', 'mantenimiento', 'revisión', 'revision', 'diagnóstico', 'diagnostico', 'reparar', 'mecánico', 'mecanico', 'avería', 'averia', 'falla', 'daño', 'dano'] },
  { name: 'Cotización / Precios', keywords: ['cotización', 'cotizacion', 'cotizar', 'precio', 'cuanto cuesta', 'cuánto cuesta', 'vale', 'cuesta', 'valor', 'presupuesto'] },
  { name: 'Compra / Adquisición', keywords: ['comprar', 'compra', 'adquirir', 'quiero un', 'necesito un', 'voy a comprar', 'para comprar'] },
  { name: 'Agendar Cita', keywords: ['cita', 'agendar', 'horario', 'agend', 'agenda', 'programar', 'reservar', 'turno'] },
  { name: 'Repuestos / Partes', keywords: ['repuesto', 'parte', 'pieza', 'accesorio', 'llanta', 'neumático', 'neumatico', 'motor', 'freno', 'embrague', 'batería', 'bateria'] },
  { name: 'Cartera / Pagos', keywords: ['cartera', 'pago', 'factura', 'cuota', 'deuda', 'crédito', 'credito', 'abono', 'saldo', 'financiación', 'financiacion'] },
  { name: 'Garantía', keywords: ['garantía', 'garantia', 'cobertura', 'seguro'] },
  { name: 'Saludo', keywords: ['hola', 'buenos días', 'buenos dias', 'buenas tardes', 'buenas noches', 'bien y tú', 'bien y tu'] },
  { name: 'Agradecimiento', keywords: ['gracias', 'muchas gracias', 'agradezco', 'te agradezco'] },
];

const COLORS = [
  '#5DE1E5', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#A855F7', '#22C55E', '#EAB308', '#3B82F6',
];

interface DashboardAyurautosProps {
  documents: Document[];
  agentName: string;
  dateFrom: string;
  dateTo: string;
}

function classifyAyurautosIntent(text: string): string {
  const lower = text.toLowerCase().trim();
  if (!lower) return 'General / Otros';
  
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.name;
    }
  }
  return 'General / Otros';
}

function extractVehicleBrands(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const brand of CAR_BRANDS) {
    if (lower.includes(brand.toLowerCase().replace('ë', 'e').replace('é', 'e'))) {
      found.push(brand);
    }
  }
  // Check for generic vehicle mentions
  if (found.length === 0) {
    for (const kw of CAR_KEYWORDS) {
      if (lower.includes(kw)) return ['Vehículo (sin marca)'];
    }
  }
  return found;
}

export default function DashboardAyurautos({
  documents,
  agentName,
  dateFrom,
  dateTo,
}: DashboardAyurautosProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const uniqueUsers = new Set(
      documents.map(d => d.user_id || d.session_id || '')
    ).size;

    // Group by session/user for conversations count
    const convMap = new Map<string, Document[]>();
    for (const doc of documents) {
      const key = doc.session_id || doc.user_id || 'unknown';
      if (!convMap.has(key)) convMap.set(key, []);
      convMap.get(key)!.push(doc);
    }
    const totalConversations = convMap.size;
    const avgMessages = totalConversations > 0 ? Math.round(totalDocs / totalConversations) : 0;

    // Intent classification (per message)
    const intentCount: Record<string, number> = {};
    const intentConversations: Record<string, Set<string>> = {};
    
    // Vehicle brand mentions (per message)
    const brandCount: Record<string, number> = {};
    const brandConversations: Record<string, Set<string>> = {};

    for (const doc of documents) {
      const msg = String(doc['message-Human'] || doc.message || '');
      if (!msg.trim()) continue;

      const intent = classifyAyurautosIntent(msg);
      intentCount[intent] = (intentCount[intent] || 0) + 1;
      if (!intentConversations[intent]) intentConversations[intent] = new Set();
      intentConversations[intent].add(doc.session_id || doc.user_id || '');

      // Extract brands
      const brands = extractVehicleBrands(msg);
      for (const brand of brands) {
        brandCount[brand] = (brandCount[brand] || 0) + 1;
        if (!brandConversations[brand]) brandConversations[brand] = new Set();
        brandConversations[brand].add(doc.session_id || doc.user_id || '');
      }
    }

    return {
      totalDocs,
      totalConversations,
      uniqueUsers,
      avgMessages,
      intentCount,
      intentConversations,
      brandCount,
      brandConversations,
    };
  }, [documents]);

  // ── Daily breakdown ──
  const dailyStats = useMemo(() => {
    const dayMap = new Map<string, { conversations: Set<string>; messages: number }>();

    for (const doc of documents) {
      if (!doc.datetime) continue;
      const day = doc.datetime.slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, { conversations: new Set(), messages: 0 });
      dayMap.get(day)!.messages++;
    }

    // Count conversations per day
    const convMap = new Map<string, string[]>();
    for (const doc of documents) {
      const key = doc.session_id || doc.user_id || '';
      if (!convMap.has(key)) convMap.set(key, []);
      convMap.get(key)!.push(doc.datetime || '');
    }
    convMap.forEach((datetimes) => {
      const days = new Set(datetimes.map(d => d.slice(0, 10)).filter(Boolean));
      days.forEach(day => {
        if (dayMap.has(day)) dayMap.get(day)!.conversations.add('conv');
      });
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({
        date,
        conversations: s.conversations.size,
        messages: s.messages,
      }));
  }, [documents]);

  // ── Growth comparison ──
  const growth = useMemo(() => {
    const totalDays = dailyStats.length;
    if (totalDays < 2) return { conversations: 0, messages: 0, label: 'N/A' };

    const mid = Math.floor(totalDays / 2);
    const current = dailyStats.slice(mid).reduce((s, d) => s + d.conversations, 0);
    const previous = dailyStats.slice(0, mid).reduce((s, d) => s + d.conversations, 0);
    const currentMsgs = dailyStats.slice(mid).reduce((s, d) => s + d.messages, 0);
    const previousMsgs = dailyStats.slice(0, mid).reduce((s, d) => s + d.messages, 0);

    const convRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const msgRate = previousMsgs > 0 ? ((currentMsgs - previousMsgs) / previousMsgs) * 100 : 0;

    return {
      conversations: Math.round(convRate * 10) / 10,
      messages: Math.round(msgRate * 10) / 10,
      label: `${convRate >= 0 ? '+' : ''}${convRate.toFixed(1)}%`,
    };
  }, [dailyStats]);

  // ── Pie data (intent distribution) ──
  const intentPieData = useMemo(() => {
    return Object.entries(stats.intentCount)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({
        name,
        value,
        conversations: stats.intentConversations[name]?.size || 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [stats.intentCount, stats.intentConversations]);

  // ── Bar data (vehicle brands ranking) ──
  const brandData = useMemo(() => {
    return Object.entries(stats.brandCount)
      .sort(([, a], [, b]) => b - a)
      .map(([name, mentions], i) => ({
        name,
        mentions,
        conversations: stats.brandConversations[name]?.size || 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [stats.brandCount, stats.brandConversations]);

  // ── Export Excel ──
  const handleExport = async () => {
    try {
      setExporting(true);

      // Build CSV-like export for simplicity (no external deps)
      let csv = '\uFEFF'; // BOM for Excel UTF-8
      
      // Sheet 1 header: Summary
      csv += `RESUMEN AYURAUTOS - ESTADÍSTICAS VEHICULARES\n`;
      csv += `Rango: ${dateFrom} → ${dateTo}\n\n`;
      csv += `Métrica,Valor\n`;
      csv += `Total Conversaciones,${stats.totalConversations}\n`;
      csv += `Total Mensajes,${stats.totalDocs}\n`;
      csv += `Usuarios Únicos,${stats.uniqueUsers}\n`;
      csv += `Promedio Mensajes/Conversación,${stats.avgMessages}\n\n`;

      // Vehicle brands ranking
      csv += `\nMARCAS DE VEHÍCULOS MENCIONADAS\n`;
      csv += `Marca,Menciones,Conversaciones\n`;
      brandData.forEach(b => {
        csv += `"${b.name}",${b.mentions},${b.conversations}\n`;
      });

      // Intents
      csv += `\n\nCATEGORÍAS DE CONSULTA\n`;
      csv += `Tipo Consulta,Mensajes,Conversaciones\n`;
      intentPieData.forEach(d => {
        csv += `"${d.name}",${d.value},${d.conversations}\n`;
      });

      // Daily
      csv += `\n\nDESGLOSE DIARIO\n`;
      csv += `Fecha,Conversaciones,Mensajes\n`;
      dailyStats.forEach(d => {
        csv += `${d.date},${d.conversations},${d.messages}\n`;
      });

      // Raw data
      csv += `\n\nDATOS CRUDOS\n`;
      csv += `"user_id","session_id","tipo","fecha","mensaje_cliente","vehiculos_mencionados","categoria"\n`;
      documents.forEach(doc => {
        const msg = String(doc['message-Human'] || doc.message || '').replace(/"/g, '""');
        const intent = classifyAyurautosIntent(msg);
        const brands = extractVehicleBrands(msg).join(' / ');
        csv += `"${doc.user_id || ''}","${doc.session_id || ''}","${doc.type || ''}","${(doc.datetime || '').slice(0,19)}","${msg}","${brands}","${intent}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ayurautos_estadisticas_${dateFrom}_${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Date info ──
  const dateRange = (() => {
    if (documents.length === 0) return '—';
    const dates = documents.map(d => d.datetime || '').filter(Boolean).sort();
    return `${dates[0]?.slice(0, 10) || '?'} → ${dates[dates.length - 1]?.slice(0, 10) || '?'}`;
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            🚗 Dashboard Ayurautos — Estadísticas Vehiculares
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Análisis enfocado en consultas de vehículos, marcas y servicios automotrices
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || documents.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          {exporting ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293V19a2 2 0 01-2 2z" />
            </svg>
          )}
          Exportar CSV
        </button>
      </div>

      {/* Date info */}
      <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
        <span>📅 Datos: {dateRange}</span>
        <span>📄 {stats.totalDocs} mensajes</span>
        <span>👤 {stats.uniqueUsers} usuarios</span>
        <span>{stats.totalConversations} conversaciones</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Conversaciones</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalConversations}</p>
          <p className="text-xs text-gray-500 mt-0.5">sesiones únicas</p>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3">
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Mensajes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDocs}</p>
          <p className="text-xs text-gray-500 mt-0.5">{stats.avgMessages} avg/conv</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Usuarios Únicos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.uniqueUsers}</p>
          <p className="text-xs text-gray-500 mt-0.5">clientes distintos</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Crecimiento</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{growth.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">conversaciones (vs período anterior)</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brand ranking - Bar chart */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🏆 Marcas de Vehículos Más Consultadas
          </h3>
          {brandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180, brandData.length * 40)}>
              <BarChart
                data={brandData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'mentions' ? 'Menciones' : name,
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                  {brandData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">
              No se detectaron menciones a marcas específicas en este período
            </p>
          )}
        </div>

        {/* Intent distribution - Pie chart */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📊 Tipos de Consulta
          </h3>
          {intentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={intentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {intentPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} mensajes · ${props.payload.conversations} conversaciones`,
                    props.payload.name,
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Intent table */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowDaily(!showDaily)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>📋 Desglose por Tipo de Consulta</span>
          <svg
            className={`w-4 h-4 transition-transform ${showDaily ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDaily && (
          <div className="px-4 pb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Tipo de Consulta</th>
                  <th className="text-right py-2 font-medium text-gray-600">Mensajes</th>
                  <th className="text-right py-2 font-medium text-gray-600">%</th>
                  <th className="text-right py-2 font-medium text-gray-600">Conversaciones</th>
                </tr>
              </thead>
              <tbody>
                {intentPieData.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 text-gray-800">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </td>
                    <td className="py-1.5 text-right font-medium">{d.value}</td>
                    <td className="py-1.5 text-right text-gray-500">
                      {stats.totalDocs > 0 ? ((d.value / stats.totalDocs) * 100).toFixed(1) : '0'}%
                    </td>
                    <td className="py-1.5 text-right">{d.conversations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}