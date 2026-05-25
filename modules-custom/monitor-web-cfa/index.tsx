'use client';

import { useEffect, useState } from 'react';

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

type LogEntry = CheckResult & {
  id: number;
  checked_at: string;
};

type StatsResponse = {
  total: number;
  okCount: number;
  downCount: number;
  wafCount: number;
  uptimePercent: number;
  lastCheck: string | null;
  recentHistory: { statusCode: number | null; contentValid: boolean; checked_at: string }[];
};

type ConfigState = {
  url: string;
  interval_minutes: string;
  enabled: boolean;
};

const DEFAULT_CONFIG: ConfigState = {
  url: 'https://www.cfa.com.co/',
  interval_minutes: '5',
  enabled: true,
};

export default function MonitorWebCFA({
  moduleData,
}: {
  moduleData?: { id: number; title: string };
}) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

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
          url: String(json.config.url || DEFAULT_CONFIG.url),
          interval_minutes: String(json.config.interval_minutes || DEFAULT_CONFIG.interval_minutes),
          enabled: json.config.enabled === '1' || json.config.enabled === true,
        });
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${BASE}/stats`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setStats(json);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${BASE}/logs`, { cache: 'no-store' });
      const json = await res.json();
      setLogs(json.ok && Array.isArray(json.logs) ? json.logs : []);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'inicio') loadStats();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const saveConfigAction = async () => {
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

  const runCheck = async () => {
    setChecking(true);
    setLastCheckResult(null);
    try {
      const res = await fetch(`${BASE}/check`, { method: 'POST' });
      const json = await res.json();
      setLastCheckResult(json);
      if (activeTab === 'inicio') loadStats();
      if (activeTab === 'logs') loadLogs();
    } finally {
      setChecking(false);
    }
  };

  const clearLogsAction = async () => {
    setClearingLogs(true);
    try {
      const res = await fetch(`${BASE}/logs`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) setLogs([]);
    } finally {
      setClearingLogs(false);
    }
  };

  const Field = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{moduleData?.title || 'Monitor web CFA'}</h2>
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

      {activeTab === 'inicio' && (
        <div className="space-y-4">
          {loadingConfig && loadingStats ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className={`border rounded p-3 ${stats && stats.downCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border'}`}>
                  Estado: <b>{stats && stats.lastCheck ? (stats.downCount > 0 ? 'Con problemas' : 'OK') : '—'}</b>
                </div>
                <div className="bg-gray-50 border rounded p-3">
                  Uptime: <b>{stats ? `${stats.uptimePercent.toFixed(1)}%` : '—'}</b>
                </div>
                <div className="bg-gray-50 border rounded p-3">
                  Caídas: <b>{stats ? stats.downCount : '—'}</b>
                </div>
                <div className="bg-gray-50 border rounded p-3">
                  WAF: <b>{stats ? stats.wafCount : '—'}</b>
                </div>
              </div>

              {stats && stats.recentHistory && stats.recentHistory.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Últimas verificaciones</h3>
                  <div className="flex gap-1">
                    {stats.recentHistory.map((h, i) => (
                      <div
                        key={i}
                        className={`w-4 h-8 rounded-sm ${
                          !h.contentValid ? 'bg-red-500' : h.statusCode === 200 ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        title={`${fmtTime(h.checked_at)}: ${h.statusCode}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {lastCheckResult && (
                <div className="text-xs space-y-1 p-3 bg-gray-50 border rounded">
                  {lastCheckResult.check?.statusCode != null && (
                    <div>
                      HTTP {lastCheckResult.check.statusCode} |{' '}
                      {lastCheckResult.check.responseTimeMs}ms |{' '}
                      {lastCheckResult.check.contentValid ? 'Contenido válido' : 'Contenido inválido'}
                      {lastCheckResult.check.wafDetected && ' | WAF detectado'}
                      {lastCheckResult.alert?.alerted && ' | ALERTA ENVIADA'}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={runCheck}
                disabled={checking}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {checking ? 'Verificando...' : 'Verificar ahora'}
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          {loadingConfig ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="URL a monitorear"
                  description="Dirección web que se verificará periódicamente."
                >
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  />
                </Field>
                <Field
                  label="Intervalo (minutos)"
                  description="Cada cuántos minutos se ejecuta la verificación automática."
                >
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border rounded"
                    value={config.interval_minutes}
                    onChange={(e) => setConfig({ ...config, interval_minutes: e.target.value })}
                  />
                </Field>
                <Field
                  label="Módulo habilitado"
                  description="Activa o desactiva las verificaciones periódicas."
                >
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveConfigAction}
                  disabled={savingConfig}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar configuración'}
                </button>
                {saveMessage && <span className="text-sm text-green-600">{saveMessage}</span>}
                {saveError && <span className="text-sm text-red-600">{saveError}</span>}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runCheck}
              disabled={checking}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {checking ? 'Verificando...' : 'Verificar ahora'}
            </button>
            <button
              type="button"
              onClick={clearLogsAction}
              disabled={clearingLogs}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded disabled:opacity-50"
            >
              {clearingLogs ? 'Limpiando...' : 'Limpiar logs'}
            </button>
          </div>

          {loadingLogs ? (
            <div className="text-sm text-gray-500">Cargando logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-400 italic">No hay logs aún</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3">Fecha</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Tiempo</th>
                    <th className="text-left py-2 pr-3">Tamaño</th>
                    <th className="text-left py-2 pr-3">Contenido</th>
                    <th className="text-left py-2 pr-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(log.checked_at)}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.statusCode === 200 && !log.wafDetected
                            ? 'bg-green-100 text-green-700'
                            : log.wafDetected
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {log.statusCode ?? 'ERR'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{log.responseTimeMs != null ? `${log.responseTimeMs}ms` : '—'}</td>
                      <td className="py-2 pr-3">{log.contentLength != null ? `${(log.contentLength / 1024).toFixed(1)}KB` : '—'}</td>
                      <td className="py-2 pr-3">
                        {log.contentValid
                          ? <span className="text-green-600 font-medium">OK</span>
                          : log.wafDetected
                            ? <span className="text-yellow-600 font-medium">WAF</span>
                            : <span className="text-red-600 font-medium">Falló</span>
                        }
                      </td>
                      <td className="py-2 pr-3 max-w-[200px] truncate text-gray-500">{log.errorMessage ?? '—'}</td>
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