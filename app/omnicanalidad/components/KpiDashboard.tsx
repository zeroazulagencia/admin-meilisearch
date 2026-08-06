'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Document } from '@/utils/meilisearch';
import { exportKpiToExcel } from '@/app/omnicanalidad/utils/exportKpiToExcel';

interface KpiDashboardProps {
  documents: Document[];
  agentName: string;
  mensajesPorTipo?: Record<string, { mensajes: number; conversaciones: number }>;
}

interface DayStats {
  date: string;
  conversations: number;
  messages: number;
  visitors: number;
  agentMessages: number;
  userMessages: number;
}

interface KpiApiResponse {
  ok: boolean;
  period: string;
  current: {
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
    };
  };
  previous: {
    totalConversations: number;
    facturasRegistradas: number;
    successRate: number;
  };
  start: string;
  end: string;
}

function getUserId(doc: Document): string {
  const candidates = [(doc as any).user_id, (doc as any).iduser, (doc as any).userid, (doc as any).i_user, (doc as any).id_user, (doc as any).userId];
  for (const val of candidates) {
    if (val && val !== 'unknown' && String(val).trim().length > 0) return String(val).trim();
  }
  return '';
}

function getConversationKey(doc: Document): string {
  const phoneId = (doc as any).phone_id || (doc as any).phone_number_id || '';
  const userId = getUserId(doc);
  const sessionId = (doc as any).session_id || '';
  if (phoneId && userId) return `phone_${phoneId}_user_${userId}`;
  if (phoneId) return `phone_${phoneId}`;
  if (sessionId && sessionId !== 'unknown') return `session_${sessionId}`;
  if (userId) return `user_${userId}`;
  return 'unknown';
}

type Period = 'week' | 'month' | 'year';

export default function KpiDashboard({ documents, agentName, mensajesPorTipo }: KpiDashboardProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [showTipos, setShowTipos] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState<Period>('month');
  const [kpiData, setKpiData] = useState<KpiApiResponse | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const periods: Period[] = ['week', 'month', 'year'];
      const results = await Promise.all(
        periods.map(p =>
          fetch(`/api/omnicanalidad/kpi/?agent_name=${encodeURIComponent(agentName)}&period=${p}`)
            .then(r => r.json())
            .then(d => d.ok ? d : null)
        )
      );
      const validData = results.filter(Boolean) as KpiApiResponse[];
      if (validData.length === 0) throw new Error('No se pudieron obtener datos');

      const buffer = await exportKpiToExcel(validData, agentName);
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KPIs_${agentName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export] Error:', err);
      alert('Error al exportar. Revisa la consola.');
    } finally {
      setExporting(false);
    }
  }, [agentName]);

  // Fetch KPI from API
  useEffect(() => {
    if (!agentName) return;
    setLoadingKpi(true);
    fetch(`/api/omnicanalidad/kpi/?agent_name=${encodeURIComponent(agentName)}&period=${kpiPeriod}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setKpiData(data);
      })
      .catch(err => console.error('[KPI] Error fetching:', err))
      .finally(() => setLoadingKpi(false));
  }, [agentName, kpiPeriod]);

  const { stats, dailyData } = useMemo(() => {
    if (!documents || documents.length === 0) return { stats: null, dailyData: [] };

    const uniqueUsers = new Set<string>();
    const convMap = new Map<string, { userMsgs: number; aiMsgs: number }>();
    const dayMap = new Map<string, Set<string>>();
    const dayCountMap = new Map<string, number>();
    const dayVisitors = new Map<string, Set<string>>();
    const dayUserMsgs = new Map<string, number>();
    const dayAgentMsgs = new Map<string, number>();

    for (const doc of documents) {
      const uid = getUserId(doc);
      if (uid) uniqueUsers.add(uid);

      const key = getConversationKey(doc);
      if (!convMap.has(key)) {
        convMap.set(key, { userMsgs: 0, aiMsgs: 0 });
      }
      const conv = convMap.get(key)!;
      if ((doc as any)['message-Human']?.trim()) conv.userMsgs++;
      if ((doc as any)['message-AI']?.trim()) conv.aiMsgs++;

      // Daily breakdown
      const dateStr = (doc as any).datetime
        ? (doc as any).datetime.split('T')[0]
        : (doc as any).date
          ? (doc as any).date.split('T')[0]
          : null;

      if (dateStr) {
        if (!dayMap.has(dateStr)) {
          dayMap.set(dateStr, new Set());
          dayCountMap.set(dateStr, 0);
          dayVisitors.set(dateStr, new Set());
          dayUserMsgs.set(dateStr, 0);
          dayAgentMsgs.set(dateStr, 0);
        }
        dayMap.get(dateStr)!.add(key);
        dayCountMap.set(dateStr, (dayCountMap.get(dateStr) || 0) + 1);
        if (uid) dayVisitors.get(dateStr)!.add(uid);
        if ((doc as any)['message-Human']?.trim()) dayUserMsgs.set(dateStr, (dayUserMsgs.get(dateStr) || 0) + 1);
        if ((doc as any)['message-AI']?.trim()) dayAgentMsgs.set(dateStr, (dayAgentMsgs.get(dateStr) || 0) + 1);
      }
    }

    let successful = 0;
    let abandoned = 0;
    convMap.forEach((conv) => {
      if (conv.userMsgs > 0 && conv.aiMsgs > 0) successful++;
      if (conv.userMsgs > 0 && conv.aiMsgs === 0) abandoned++;
    });

    const totalConvs = convMap.size;

    let totalUserMessages = 0;
    let totalAgentMessages = 0;
    for (const doc of documents) {
      if ((doc as any)['message-Human']?.trim()) totalUserMessages++;
      if ((doc as any)['message-AI']?.trim()) totalAgentMessages++;
    }

    const daily: DayStats[] = Array.from(dayMap.entries())
      .map(([date, convs]) => ({
        date,
        conversations: convs.size,
        messages: dayCountMap.get(date) || 0,
        visitors: dayVisitors.get(date)?.size || 0,
        agentMessages: dayAgentMsgs.get(date) || 0,
        userMessages: dayUserMsgs.get(date) || 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      stats: {
        uniqueVisitors: uniqueUsers.size,
        totalConversations: totalConvs,
        successfulConversations: successful,
        abandonedConversations: abandoned,
        successRate: totalConvs > 0 ? Number((successful / totalConvs * 100).toFixed(1)) : 0,
        abandonmentRate: totalConvs > 0 ? Number((abandoned / totalConvs * 100).toFixed(1)) : 0,
        totalMessages: documents.length,
        totalUserMessages,
        totalAgentMessages,
      },
      dailyData: daily,
    };
  }, [documents]);

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  // Use API data for the extra KPIs, local stats for daily
  const currentKpi = kpiData?.current;

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'year', label: 'Año' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          KPIs · {agentName}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exportando…
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar Excel
              </span>
            )}
          </button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setKpiPeriod(p.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                kpiPeriod === p.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      {!currentKpi ? (
        <div className="text-center py-8 text-sm text-gray-500">
          {loadingKpi ? 'Cargando KPIs...' : 'No hay datos para este período'}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Conversaciones */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conversaciones</p>
              <p className="text-2xl font-bold text-gray-900">{currentKpi.totalConversations}</p>
              {currentKpi.growth && (
                <p className={`text-xs mt-1 ${currentKpi.growth.rate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {currentKpi.growth.rate >= 0 ? '↑' : '↓'} {Math.abs(currentKpi.growth.rate)}% vs período anterior
                </p>
              )}
            </div>

            {/* Visitantes Únicos Nuevos */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Visitantes Nuevos</p>
              <p className="text-2xl font-bold text-blue-600">{currentKpi.newUniqueVisitors}</p>
              <p className="text-xs text-gray-400 mt-1">{currentKpi.returningVisitors} recurrentes</p>
            </div>

            {/* Tasa de Éxito */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tasa de Éxito</p>
              <p className={`text-2xl font-bold ${currentKpi.successRate >= 70 ? 'text-green-600' : currentKpi.successRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {currentKpi.successRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">{currentKpi.successfulConversations} resueltas</p>
            </div>

            {/* Tasa de Abandono */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tasa de Abandono</p>
              <p className={`text-2xl font-bold ${currentKpi.abandonmentRate === 0 ? 'text-green-600' : currentKpi.abandonmentRate <= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                {currentKpi.abandonmentRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">{currentKpi.abandonedConversations} abandonadas</p>
            </div>

            {/* Facturas Registradas */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Facturas Registradas</p>
              <p className="text-2xl font-bold text-purple-600">{currentKpi.facturasRegistradas}</p>
              <p className="text-xs text-gray-400 mt-1">
                {kpiData?.previous?.facturasRegistradas !== undefined
                  ? `Anterior: ${kpiData.previous.facturasRegistradas}`
                  : 'desde el chat'}
              </p>
            </div>

            {/* Crecimiento */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Crecimiento</p>
              <p className={`text-2xl font-bold ${currentKpi.growth?.rate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {currentKpi.growth?.rate != null ? `${currentKpi.growth.rate >= 0 ? '+' : ''}${currentKpi.growth.rate}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {currentKpi.growth?.previousConversations != null
                  ? `Anterior: ${currentKpi.growth.previousConversations} conv.`
                  : 'vs período anterior'}
              </p>
            </div>
          </div>

          {/* Tipos de Consulta - collapsible */}
          {mensajesPorTipo && Object.keys(mensajesPorTipo).length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <button
                onClick={() => setShowTipos(!showTipos)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-gray-700">Tipos de Consulta</h3>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showTipos ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTipos && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Mensajes</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Conversaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mensajesPorTipo)
                        .sort(([, a], [, b]) => b.conversaciones - a.conversaciones)
                        .map(([tipo, data]) => (
                          <tr key={tipo} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-700 font-medium">{tipo}</td>
                            <td className="py-2 px-2 text-right text-gray-900">{data.mensajes}</td>
                            <td className="py-2 px-2 text-right text-gray-900">{data.conversaciones}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Daily breakdown - collapsible */}
          {dailyData.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <button
                onClick={() => setShowDaily(!showDaily)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-gray-700">Desglose Diario</h3>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showDaily ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDaily && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Conversaciones</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Mensajes</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Visitantes</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Agente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((day) => (
                        <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-700 font-medium">{fmtDate(day.date)}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{day.conversations}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{day.messages}</td>
                          <td className="py-2 px-2 text-right text-gray-900">{day.visitors}</td>
                          <td className="py-2 px-2 text-right text-gray-500">{day.userMessages}</td>
                          <td className="py-2 px-2 text-right text-blue-600 font-medium">{day.agentMessages}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
