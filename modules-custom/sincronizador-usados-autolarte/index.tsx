'use client';

import { useEffect, useState, useRef } from 'react';

const BASE = '/api/custom-module19/sincronizador-usados-autolarte';

type TabId = 'inicio' | 'config' | 'logs';

type LogItem = {
  id: number;
  placa: string | null;
  operacion: string | null;
  resultado: string | null;
  status: string | null;
  detalle: string | null;
  created_at: string;
};

type SyncStats = {
  total: number;
  okCount: number;
  errorCount: number;
  ultimaSync: string | null;
  resumen: { operacion: string; count: number }[];
};

type SyncResult = {
  placa: string;
  operacion: string;
  resultado: string;
  status: string;
};

type TestResult = {
  placa: string;
  imagenPrincipal: string;
  frontalStatus: string;
  lateralStatus: string;
  galeriaCount: number;
  galeriaAccessibles: number;
  error?: string;
};

const SYNC_STEPS = [
  '1/4 Cargando configuracion...',
  '2/4 Obteniendo inventario...',
  '3/4 Sincronizando vehiculos con WordPress...',
  '4/4 Probando imagenes y generando reporte...',
];

async function safeFetchJson(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Respuesta inesperada (${res.status}): ${text.substring(0, 200)}`);
  }
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Error ${res.status}`);
  }
  return json;
}

export default function SincronizadorUsadosAutolarte({
  moduleData,
}: {
  moduleData?: { id: number; titulo: string };
}) {
  const [tab, setTab] = useState<TabId>('inicio');
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState('');
  const [syncError, setSyncError] = useState('');
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logsError, setLogsError] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [configError, setConfigError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepTimer = () => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (tab === 'inicio') fetchStats();
    if (tab === 'logs') fetchLogs();
    if (tab === 'config') fetchConfig();
  }, [tab]);

  async function fetchStats() {
    setStatsError('');
    try {
      const json = await safeFetchJson(`${BASE}/stats`);
      if (json.stats) setStats(json.stats);
    } catch (e: any) {
      setStatsError(e?.message || 'Error de red');
    }
  }

  async function fetchLogs() {
    setLogsError('');
    try {
      const json = await safeFetchJson(`${BASE}/logs`);
      setLogs(json.logs || []);
    } catch (e: any) {
      setLogsError(e?.message || 'Error de red');
      setLogs([]);
    }
  }

  async function fetchConfig() {
    setConfigError('');
    try {
      const json = await safeFetchJson(`${BASE}/config`);
      if (json.config) {
        setConfig(json.config);
        setEditConfig({ ...json.config });
      }
    } catch (e: any) {
      setConfigError(e?.message || 'Error de red');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError('');
    setMensaje('');
    setSyncResults([]);
    setTestResults([]);

    setSyncStep(SYNC_STEPS[0]);
    let stepIdx = 0;
    stepTimerRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SYNC_STEPS.length - 1);
      setSyncStep(SYNC_STEPS[stepIdx]);
    }, 8000);

    try {
      const json = await safeFetchJson(`${BASE}/sync`, { method: 'POST' });
      clearStepTimer();

      setSyncStep('');
      setSyncResults(json.results || []);
      setTestResults(json.testResults?.detalle || []);
      setMensaje(
        `Sincronizacion completada: ${json.okCount} ok, ${json.errCount} errores (${json.elapsedSec}s)`
      );
    } catch (e: any) {
      clearStepTimer();
      setSyncStep('');
      setSyncError(e?.message || 'Error de red en sincronizacion');
    } finally {
      setSyncing(false);
      fetchStats();
    }
  }

  async function handleSaveConfig() {
    setMensaje('');
    setConfigError('');
    try {
      await safeFetchJson(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
      setMensaje('Configuracion guardada');
      setConfig({ ...editConfig });
    } catch (e: any) {
      setConfigError(e?.message || 'Error guardando configuracion');
    }
  }

  async function handleClearLogs() {
    if (!confirm('Limpiar todos los logs?')) return;
    setLogsError('');
    try {
      await safeFetchJson(`${BASE}/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch (e: any) {
      setLogsError(e?.message || 'Error limpiando logs');
    } finally {
      fetchLogs();
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const btnClass = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {moduleData?.titulo || 'Sincronizador Usados Autolarte'}
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['inicio', 'config', 'logs'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'inicio' ? 'Inicio' : t === 'config' ? 'Configuracion' : 'Logs'}
          </button>
        ))}
      </div>

      {/* Mensaje global */}
      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3">
          {mensaje}
        </div>
      )}

      {/* Tab: Inicio */}
      {tab === 'inicio' && (
        <div className="space-y-4">
          {statsError ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {statsError}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 border rounded p-3 text-center">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-500">Total sincronizaciones</div>
              </div>
              <div className="bg-gray-50 border rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.okCount}</div>
                <div className="text-xs text-gray-500">Exitosas</div>
              </div>
              <div className="bg-gray-50 border rounded p-3 text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: stats.errorCount > 0 ? '#dc2626' : '#16a34a' }}
                >
                  {stats.errorCount}
                </div>
                <div className="text-xs text-gray-500">Errores</div>
              </div>
              <div className="bg-gray-50 border rounded p-3 text-center">
                <div className="text-base font-bold text-gray-800">
                  {stats.ultimaSync ? new Date(stats.ultimaSync).toLocaleString('es-CO') : '--'}
                </div>
                <div className="text-xs text-gray-500">Ultima sincronizacion</div>
              </div>
            </div>
          ) : null}

          {/* Progreso paso a paso */}
          {syncStep && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-3">
              <span className="animate-pulse">{syncStep}</span>
            </div>
          )}

          {/* Error de sincronizacion */}
          {syncError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {syncError}
            </div>
          )}

          {/* Boton Sincronizar */}
          <div className="flex gap-3 items-center">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`${btnClass} ${
                syncing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          {/* Resultados de ultima sincronizacion */}
          {syncResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Ultimos resultados</h3>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Operacion</th>
                      <th className="text-left p-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncResults.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2 font-medium">{r.placa}</td>
                        <td className="p-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              r.operacion === 'create'
                                ? 'bg-green-100 text-green-800'
                                : r.operacion === 'update'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.operacion === 'delete'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.operacion.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2">{r.resultado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultados del test de imagenes */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Test de imagenes (10 placas al azar)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                  <div className="text-lg font-bold text-green-700">
                    {testResults.filter((t) => !t.error && t.frontalStatus.includes('200')).length}
                  </div>
                  <div className="text-[10px] text-green-600">Imagenes OK</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                  <div className="text-lg font-bold text-red-700">
                    {testResults.filter(
                      (t) => t.error || (!t.frontalStatus.includes('200') && !t.lateralStatus.includes('200'))
                    ).length}
                  </div>
                  <div className="text-[10px] text-red-600">Fallos totales</div>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Frontal</th>
                      <th className="text-left p-2">Lateral</th>
                      <th className="text-left p-2">Galeria</th>
                      <th className="text-left p-2">Diagnostico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((t, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2 font-medium">{t.placa}</td>
                        <td className="p-2">
                          <span
                            className={`font-medium ${t.error ? 'text-gray-400' : t.frontalStatus.includes('200') ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {t.error ? '--' : t.frontalStatus}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={`font-medium ${t.error ? 'text-gray-400' : t.lateralStatus.includes('200') ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {t.error ? '--' : t.lateralStatus}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600">
                          {t.error ? '--' : `${t.galeriaAccessibles}/${t.galeriaCount}`}
                        </td>
                        <td className="p-2">
                          {t.error ? (
                            <span className="text-red-600 font-medium">{t.error}</span>
                          ) : t.frontalStatus.includes('200') && t.lateralStatus.includes('200') ? (
                            <span className="text-green-600 font-medium">OK</span>
                          ) : t.frontalStatus.includes('200') || t.lateralStatus.includes('200') ? (
                            <span className="text-yellow-600 font-medium">PARCIAL</span>
                          ) : (
                            <span className="text-red-600 font-medium">FALLO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Configuracion */}
      {tab === 'config' && (
        <div className="space-y-4 max-w-lg">
          {configError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {configError}
            </div>
          )}
          {[
            { key: 'wp_url', label: 'WordPress URL', placeholder: 'https://autolarte.com.co' },
            { key: 'wp_auth', label: 'WordPress Auth (Basic)', placeholder: 'Basic ...', type: 'password' },
            { key: 'inventario_url', label: 'URL Inventario', placeholder: 'https://...inventario.json' },
            { key: 'replicate_key', label: 'Replicate API Key', placeholder: 'r8_...', type: 'password' },
            { key: 'reports_agent_name', label: 'Nombre reportes', placeholder: 'usados_autolarte' },
          ].map((field) => (
            <div key={field.key}>
              <label className={labelClass}>{field.label}</label>
              <input
                className={inputClass}
                value={editConfig[field.key] || ''}
                onChange={(e) => setEditConfig({ ...editConfig, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                type={(field as any).type || 'text'}
              />
            </div>
          ))}
          <button
            onClick={handleSaveConfig}
            className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Guardar configuracion
          </button>
        </div>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{logs.length} registros</span>
            <button
              onClick={handleClearLogs}
              className="text-red-600 text-xs hover:text-red-800 transition-colors"
            >
              Limpiar logs
            </button>
          </div>
          {logsError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {logsError}
            </div>
          )}
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin registros aun</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Placa</th>
                    <th className="text-left p-2">Operacion</th>
                    <th className="text-left p-2">Resultado</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-CO', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2 font-medium">{log.placa || '--'}</td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            log.operacion === 'create'
                              ? 'bg-green-100 text-green-800'
                              : log.operacion === 'update'
                                ? 'bg-blue-100 text-blue-800'
                                : log.operacion === 'delete'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : log.operacion === 'error'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {(log.operacion || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 max-w-[200px] truncate">{log.resultado}</td>
                      <td className="p-2">
                        <span
                          className={`font-medium ${log.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {log.status === 'ok' ? 'OK' : 'ERROR'}
                        </span>
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