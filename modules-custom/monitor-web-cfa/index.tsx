'use client';

import { useEffect, useMemo, useState } from 'react';

const BASE = '/api/custom-module18/monitor-web-cfa';

type TabId = 'inicio' | 'config' | 'logs';

type CheckResult = {
  statusCode: number | null;
  responseTimeMs: number | null;
  contentValid: boolean;
  contentLength: number | null;
  errorMessage: string | null;
  wafDetected: boolean;
};

type CheckLog = {
  id: number;
  status_code: number | null;
  response_time_ms: number | null;
  content_valid: boolean;
  content_length: number | null;
  error_message: string | null;
  waf_detected: boolean;
  checked_at: string;
};

export default function MonitorWebCFAModule({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [config, setConfig] = useState({ url: 'https://www.cfa.com.co/', interval_minutes: '5', enabled: true });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Logs
  const [logs, setLogs] = useState<CheckLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Check manual
  const [checking, setChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState('');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'config', label: 'Configuración' },
    { id: 'logs', label: 'Logs' },
  ];

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.config) {
        setConfig({
          url: json.config.url || 'https://www.cfa.com.co/',
          interval_minutes: json.config.interval_minutes || '5',
          enabled: json.config.enabled === '1' || json.config.enabled === true,
        });
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${BASE}/logs?limit=150`, { cache: 'no-store' });
      const json = await res.json();
      setLogs(json.ok && Array.isArray(json.logs) ? json.logs : []);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${BASE}/stats`, { cache: 'no-store' });
      const json = await res.json();
      setStats(json.ok ? json : null);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const saveConfigHandler = async () => {
    setSavingConfig(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'No se pudo guardar');
      setSaveMessage('Configuración guardada');
    } catch (e: any) {
      setSaveError(e?.message || 'Error guardando configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const doCheck = async () => {
    setChecking(true);
    setLastCheckResult(null);
    setCheckError('');
    try {
      const res = await fetch(`${BASE}/check`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error en verificación');
      setLastCheckResult(json.check);
      // Refrescar stats y logs
      loadStats();
      loadLogs();
    } catch (e: any) {
      setCheckError(e?.message || 'Error');
    } finally {
      setChecking(false);
    }
  };

  const clearLogsHandler = async () => {
    setClearingLogs(true);
    try {
      await fetch(`${BASE}/logs`, { method: 'DELETE' });
      setLogs([]);
      loadStats();
    } finally {
      setClearingLogs(false);
    }
  };

  const statusBadge = (code: number | null) => {
    if (code === null) return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Sin respuesta</span>;
    if (code === 200) return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">200</span>;
    if (code >= 400) return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">{code}</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{code}</span>;
  };

  const badgeOk = <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">OK</span>;
  const badgeFail = <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Falló</span>;
  const badgeWaf = <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">WAF</span>;

  const miniGraph = useMemo(() => {
    if (!stats?.recentHistory?.length) return null;
    const items = stats.recentHistory.slice(0, 48);
    return (
      <div className="flex items-end gap-0.5 h-12">
        {items.reverse().map((item: any, i: number) => {
          let color = 'bg-green-400';
          if (item.waf_detected) color = 'bg-yellow-400';
          else if (!item.content_valid || item.status_code !== 200) color = 'bg-red-400';
          const height = item.status_code === 200 ? 12 : 20;
          return (
            <div
              key={i}
              className={`w-2 ${color} rounded-t`}
              style={{ height: `${height}px`, minWidth: '3px' }}
              title={`${item.status_code} - ${new Date(item.checked_at).toLocaleString()}`}
            />
          );
        })}
      </div>
    );
  }, [stats]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{moduleData?.title || 'monitor-web-cfa'}</h2>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB INICIO ===== */}
      {activeTab === 'inicio' && (
        <div className="space-y-4">
          {loadingStats ? (
            <div className="text-sm text-gray-500">Cargando estadísticas...</div>
          ) : stats ? (
            <>
              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`border rounded-lg p-3 ${stats.lastCheck?.status_code === 200 && stats.lastCheck?.content_valid && !stats.lastCheck?.waf_detected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-xs text-gray-500">Estado actual</div>
                  <div className="text-lg font-bold mt-1">
                    {stats.lastCheck
                      ? (stats.lastCheck.status_code === 200 && stats.lastCheck.content_valid && !stats.lastCheck.waf_detected
                          ? 'OK'
                          : 'CAÍDO')
                      : 'Sin datos'}
                  </div>
                  {stats.lastCheck && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(stats.lastCheck.checked_at).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <div className="text-xs text-gray-500">Uptime</div>
                  <div className="text-lg font-bold text-blue-700 mt-1">
                    {stats.uptimePercent}%
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {stats.okCount} de {stats.total} checks
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                  <div className="text-xs text-gray-500">Caídas</div>
                  <div className="text-lg font-bold text-orange-700 mt-1">
                    {stats.downCount}
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                  <div className="text-xs text-gray-500">WAF detectado</div>
                  <div className="text-lg font-bold text-yellow-700 mt-1">
                    {stats.wafCount}
                  </div>
                </div>
              </div>

              {/* Mini gráfica de historial reciente */}
              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">Últimas verificaciones (verde=OK, rojo=caída, amarillo=WAF)</div>
                {miniGraph || <div className="text-xs text-gray-400">Sin datos en las últimas 24h</div>}
              </div>

              {/* Botón verificar ahora */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={doCheck}
                  disabled={checking}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {checking ? 'Verificando...' : 'Verificar ahora'}
                </button>
                {checkError && <span className="text-xs text-red-600">{checkError}</span>}
              </div>

              {/* Resultado de la última verificación manual */}
              {lastCheckResult && (
                <div className="border rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-500">Status:</span>
                    {statusBadge(lastCheckResult.statusCode)}
                    <span className="text-gray-400 ml-2">{lastCheckResult.responseTimeMs}ms</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-500">Contenido:</span>
                    {lastCheckResult.contentValid ? badgeOk : badgeFail}
                    {lastCheckResult.wafDetected && badgeWaf}
                  </div>
                  {lastCheckResult.contentLength != null && (
                    <div className="text-gray-500">Tamaño: {(lastCheckResult.contentLength / 1024).toFixed(1)} KB</div>
                  )}
                  {lastCheckResult.errorMessage && (
                    <div className="text-red-600 text-xs">{lastCheckResult.errorMessage}</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500">No hay datos aún. Haz una verificación para comenzar.</div>
          )}
        </div>
      )}

      {/* ===== TAB CONFIGURACIÓN ===== */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {loadingConfig ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL a monitorear</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://www.cfa.com.co/"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL completa del sitio a verificar</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (minutos)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border rounded"
                    value={config.interval_minutes}
                    onChange={(e) => setConfig({ ...config, interval_minutes: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Cada cuántos minutos se ejecuta la verificación automática</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    />
                    Módulo habilitado
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">Si está desactivado, no se ejecutarán verificaciones automáticas</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveConfigHandler}
                  disabled={savingConfig}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar configuración'}
                </button>
                {saveMessage && <span className="text-xs text-green-600">{saveMessage}</span>}
                {saveError && <span className="text-xs text-red-600">{saveError}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== TAB LOGS ===== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {logs.length > 0 ? `${logs.length} registros` : 'Sin registros'}
            </div>
            <button
              type="button"
              onClick={clearLogsHandler}
              disabled={clearingLogs || logs.length === 0}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded disabled:opacity-50"
            >
              {clearingLogs ? 'Limpiando...' : 'Limpiar logs'}
            </button>
          </div>

          {loadingLogs ? (
            <div className="text-sm text-gray-500">Cargando logs...</div>
          ) : logs.length === 0 ? (
            <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-400 text-sm">
              No hay logs aún. Ejecuta una verificación para ver resultados aquí.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Tiempo</th>
                    <th className="px-2 py-2">Tamaño</th>
                    <th className="px-2 py-2">Contenido</th>
                    <th className="px-2 py-2">Error / Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.checked_at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">{statusBadge(log.status_code)}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">
                        {log.response_time_ms != null ? `${log.response_time_ms}ms` : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600">
                        {log.content_length != null ? `${(log.content_length / 1024).toFixed(1)} KB` : '-'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          {(log.content_valid && log.status_code === 200 && !log.waf_detected) ? badgeOk : badgeFail}
                          {log.waf_detected && badgeWaf}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {log.error_message ? (
                          <span className="text-red-600">{log.error_message}</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}