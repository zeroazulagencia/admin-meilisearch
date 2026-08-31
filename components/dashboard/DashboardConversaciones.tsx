'use client';

import { useMemo, useState } from 'react';
import type { Document } from '@/utils/meilisearch';
import { exportConversacionesExcel } from '@/app/conversaciones/utils/exportConversacionesExcel';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TypeStats {
  mensajes: number;
  conversaciones: number;
}

interface DashboardConversacionesProps {
  documents: Document[];
  mensajesPorTipo: Record<string, TypeStats>;
  agentName: string;
  agentDisplayName: string;
  dateFrom: string;
  dateTo: string;
}

const COLORS = [
  '#5DE1E5', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#A855F7', '#22C55E', '#EAB308', '#3B82F6',
];

export default function DashboardConversaciones({
  documents,
  mensajesPorTipo,
  agentName,
  agentDisplayName,
  dateFrom,
  dateTo,
}: DashboardConversacionesProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [showTipos, setShowTipos] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── KPIs ──
  const totalMessages = documents.length;
  const uniqueUsers = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => {
      const id = d.user_id || d.phone_id || d.phone_number_id || d.session_id || '';
      if (id) s.add(id);
    });
    return s.size;
  }, [documents]);

  // Group conversations
  const conversationMap = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const doc of documents) {
      const key =
        doc.phone_id || doc.phone_number_id
          ? `phone_${doc.phone_id || doc.phone_number_id}`
          : doc.session_id
            ? `session_${doc.session_id}`
            : doc.user_id
              ? `user_${doc.user_id}`
              : 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return map;
  }, [documents]);

  const totalConversations = conversationMap.size;
  const avgMessages = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

  // ── Daily breakdown ──
  const dailyStats = useMemo(() => {
    const dayMap = new Map<string, { conversations: Set<string>; messages: number }>();

    // Count messages per day
    for (const doc of documents) {
      if (!doc.datetime) continue;
      const day = doc.datetime.slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, { conversations: new Set(), messages: 0 });
      dayMap.get(day)!.messages++;
    }

    // Count conversations per day
    conversationMap.forEach((msgs, convKey) => {
      const daySet = new Set(msgs.map(m => m.datetime?.slice(0, 10)).filter(Boolean));
      daySet.forEach((day) => {
        if (day && dayMap.has(day)) {
          dayMap.get(day)!.conversations.add(convKey);
        }
      });
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        conversations: stats.conversations.size,
        messages: stats.messages,
      }));
  }, [documents, conversationMap]);

  // ── Growth (compare current period vs same-length previous period) ──
  const growth = useMemo(() => {
    const totalDays = dailyStats.length;
    if (totalDays < 2) return { conversations: 0, messages: 0, rate: 'N/A' };

    const mid = Math.floor(totalDays / 2);
    const currentConversations = dailyStats.slice(mid).reduce((s, d) => s + d.conversations, 0);
    const previousConversations = dailyStats.slice(0, mid).reduce((s, d) => s + d.conversations, 0);
    const currentMessages = dailyStats.slice(mid).reduce((s, d) => s + d.messages, 0);
    const previousMessages = dailyStats.slice(0, mid).reduce((s, d) => s + d.messages, 0);

    const convRate = previousConversations > 0
      ? ((currentConversations - previousConversations) / previousConversations) * 100
      : 0;
    const msgRate = previousMessages > 0
      ? ((currentMessages - previousMessages) / previousMessages) * 100
      : 0;

    return {
      conversations: Math.round(convRate * 10) / 10,
      messages: Math.round(msgRate * 10) / 10,
      rate: `${convRate >= 0 ? '+' : ''}${convRate.toFixed(1)}%`,
    };
  }, [dailyStats]);

  // ── Pie chart data ──
  const pieData = useMemo(() => {
    return Object.entries(mensajesPorTipo)
      .sort(([, a], [, b]) => b.conversaciones - a.conversaciones)
      .map(([name, stats], i) => ({
        name,
        value: stats.conversaciones,
        color: COLORS[i % COLORS.length],
        mensajes: stats.mensajes,
      }));
  }, [mensajesPorTipo]);

  // ── Export ──
  const handleExport = async () => {
    try {
      setExporting(true);
      const buffer = await exportConversacionesExcel(
        documents,
        mensajesPorTipo,
        agentDisplayName,
        dateFrom,
        dateTo,
      );
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversaciones_${agentName}_${dateFrom}_${dateTo}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          📊 Estadísticas de Conversaciones — {agentDisplayName}
        </h2>
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
          Exportar Excel
        </button>
      </div>

      {/* Date range info */}
      <div className="text-xs text-gray-400 flex gap-3">
        <span>📅 Rango: {dateFrom} → {dateTo}</span>
        <span>📄 {totalMessages} mensajes</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversaciones</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalConversations}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className={growth.conversations >= 0 ? 'text-green-600' : 'text-red-600'}>
              {growth.conversations >= 0 ? '↑' : '↓'} {Math.abs(growth.conversations)}%
            </span>
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensajes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalMessages}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className={growth.messages >= 0 ? 'text-green-600' : 'text-red-600'}>
              {growth.messages >= 0 ? '↑' : '↓'} {Math.abs(growth.messages)}%
            </span>
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Promedio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{avgMessages}</p>
          <p className="text-xs text-gray-400 mt-0.5">mensajes / conversación</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Usuarios</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueUsers}</p>
          <p className="text-xs text-gray-400 mt-0.5">únicos en el período</p>
        </div>
      </div>

      {/* Pie chart + type breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <button
          onClick={() => setShowTipos(!showTipos)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"
        >
          <svg className={`w-4 h-4 transition-transform ${showTipos ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Tipos de Consulta
        </button>

        {showTipos && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut chart */}
            {pieData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} conversaciones`, name]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Type stats table */}
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-3">Tipo</th>
                    <th className="pb-2 pr-3 text-right">Conversaciones</th>
                    <th className="pb-2 text-right">Mensajes</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((item) => (
                    <tr key={item.name} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-700">{item.name}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-900">{item.value}</td>
                      <td className="py-1.5 text-right text-gray-600">{item.mensajes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Daily breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <button
          onClick={() => setShowDaily(!showDaily)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"
        >
          <svg className={`w-4 h-4 transition-transform ${showDaily ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Desglose Diario
          <span className="text-xs font-normal text-gray-400 ml-1">({dailyStats.length} días)</span>
        </button>

        {showDaily && (
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4 text-right">Conversaciones</th>
                  <th className="pb-2 text-right">Mensajes</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((row) => (
                  <tr key={row.date} className="border-t border-gray-100 hover:bg-gray-100/50">
                    <td className="py-1.5 pr-4 text-gray-700">
                      {new Date(row.date + 'T12:00:00').toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-medium text-gray-900">{row.conversations}</td>
                    <td className="py-1.5 text-right text-gray-600">{row.messages}</td>
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