'use client';

import { useMemo, useState } from 'react';
import type { Document } from '@/utils/meilisearch';

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

export default function KpiDashboard({ documents, agentName, mensajesPorTipo }: KpiDashboardProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [showTipos, setShowTipos] = useState(false);
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
    let pendingClassification = 0;
    convMap.forEach((conv) => {
      if (conv.userMsgs > 0 && conv.aiMsgs > 0) successful++;
      if (conv.userMsgs > 0 && conv.aiMsgs === 0) pendingClassification++;
    });

    const totalConvs = convMap.size;

    let totalUserMessages = 0;
    let totalAgentMessages = 0;
    for (const doc of documents) {
      if ((doc as any)['message-Human']?.trim()) totalUserMessages++;
      if ((doc as any)['message-AI']?.trim()) totalAgentMessages++;
    }

    // Build daily array sorted by date desc
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
        pendingClassification,
        successRate: totalConvs > 0 ? Number((successful / totalConvs * 100).toFixed(1)) : 0,
        totalMessages: documents.length,
        totalUserMessages,
        totalAgentMessages,
      },
      dailyData: daily,
    };
  }, [documents]);

  // Format date to readable Spanish format
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          KPIs · {agentName}
        </h2>
      </div>

      {!stats ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No hay datos para este período
        </div>
      ) : (
        <>
          {/* Main KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conversaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Visitantes Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueVisitors}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tasa de Éxito</p>
              <p className={`text-2xl font-bold ${stats.successRate >= 70 ? 'text-green-600' : stats.successRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.successRate}%
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Finalizadas con Éxito</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successfulConversations}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mensajes Totales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Por Clasificar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingClassification}</p>
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