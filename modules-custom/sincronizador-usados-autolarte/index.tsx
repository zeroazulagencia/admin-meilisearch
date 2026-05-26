'use client';

import { useEffect, useState, useRef } from 'react';

const BASE = '/api/custom-module19/sincronizador-usados-autolarte';

type TabId = 'inicio' | 'config' | 'logs' | 'docs';

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

type AuditItem = {
  placa: string;
  imagenPrincipal: string;
  frontalStatus: string;
  lateralStatus: string;
  galeriaCount: number;
  galeriaAccessibles: number;
  error?: string;
  linkUrl?: string;
  syncOperacion?: string;
  syncResultado?: string;
  syncStatus?: string;
};

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

const POLL_INTERVAL = 2000;

export default function SincronizadorUsadosAutolarte({
  moduleData,
}: {
  moduleData?: { id: number; titulo: string };
}) {
  const [tab, setTab] = useState<TabId>('inicio');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncStep, setSyncStep] = useState<string>('');
  const [syncProcessed, setSyncProcessed] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncErrors, setSyncErrors] = useState(0);
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
  const [auditResults, setAuditResults] = useState<AuditItem[]>([]);
  const [placaBusqueda, setPlacaBusqueda] = useState('');
  const [logsFiltrados, setLogsFiltrados] = useState<LogItem[]>([]);
  const [auditPlaca, setAuditPlaca] = useState('');
  const [auditLogs, setAuditLogs] = useState<LogItem[]>([]);
  const [auditMsg, setAuditMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (tab === 'inicio') fetchStats();
    if (tab === 'logs') fetchLogs();
    if (tab === 'config') fetchConfig();
  }, [tab]);

  useEffect(() => {
    return () => clearPoll();
  }, []);

  useEffect(() => {
    if (!placaBusqueda.trim()) {
      setLogsFiltrados(logs);
    } else {
      const q = placaBusqueda.trim().toUpperCase();
      setLogsFiltrados(logs.filter((l) => (l.placa || '').toUpperCase().includes(q)));
    }
  }, [placaBusqueda, logs]);

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
      setLogs(json.data || []);
    } catch (e: any) {
      setLogsError(e?.message || 'Error de red');
      setLogs([]);
    }
  }

  async function fetchConfig() {
    setConfigError('');
    try {
      const json = await safeFetchJson(`${BASE}/config`);
      if (json.data) {
        setConfig(json.data);
        setEditConfig({ ...json.data });
      }
    } catch (e: any) {
      setConfigError(e?.message || 'Error de red');
    }
  }

  async function fetchAuditLog() {
    setAuditMsg('');
    setAuditLogs([]);
    const placa = auditPlaca.trim().toUpperCase();
    if (!placa) {
      setAuditMsg('Ingrese una placa');
      return;
    }
    try {
      const json = await safeFetchJson(`${BASE}/logs`);
      const items: LogItem[] = json.data || [];
      const found = items.filter((l) => (l.placa || '').toUpperCase() === placa);
      if (found.length > 0) {
        setAuditLogs(found.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } else {
        setAuditMsg(`No se encontraron registros para ${placa}`);
      }
    } catch (e: any) {
      setAuditMsg(e?.message || 'Error de red');
    }
  }

  async function pollStatus() {
    try {
      const json = await safeFetchJson(`${BASE}/status`);
      setSyncStatus(json.status || '');
      setSyncStep(json.stepLabel || '');
      setSyncProcessed(json.processed || 0);
      setSyncTotal(json.total || 0);
      setSyncErrors(json.errors || 0);

      if (json.testResults) {
        const raw = json.testResults.detalle || json.testResults || [];
        setAuditResults(Array.isArray(raw) ? raw : []);
      }
      if (json.results && json.results.length > 0) {
        setSyncResults(json.results);
      }

      if (!json.running) {
        clearPoll();
        setSyncing(false);
        if (json.status === 'completed') {
          setMensaje(
            `Sincronizacion completada: ${json.okCount || 0} ok, ${json.errCount || 0} errores` +
              (json.elapsedSec ? ` (${json.elapsedSec}s)` : '')
          );
        } else if (json.status === 'error' || json.status === 'cancelled') {
          setSyncError(json.error || 'La sincronizacion termino con errores');
        }
        fetchStats();
      }
    } catch (e: any) {
      clearPoll();
      setSyncing(false);
      setSyncError(e?.message || 'Error consultando estado');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError('');
    setMensaje('');
    setSyncResults([]);
    setAuditResults([]);
    setSyncStatus('spawning');
    setSyncStep('Iniciando...');
    setSyncProcessed(0);
    setSyncTotal(0);
    setSyncErrors(0);

    try {
      await safeFetchJson(`${BASE}/start`, { method: 'POST' });
      pollRef.current = setInterval(pollStatus, POLL_INTERVAL);
    } catch (e: any) {
      setSyncing(false);
      setSyncError(e?.message || 'Error al iniciar sincronizacion');
    }
  }

  async function handleCancel() {
    try {
      await safeFetchJson(`${BASE}/cancel`, { method: 'POST' });
      clearPoll();
      setSyncing(false);
      setSyncError('Sincronizacion cancelada');
    } catch (e: any) {
      setSyncError(e?.message || 'Error al cancelar');
    }
  }

  async function handleSaveConfig() {
    setMensaje('');
    setConfigError('');
    try {
      await safeFetchJson(`${BASE}/config`, {
        method: 'POST',
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
        {(['inicio', 'config', 'logs', 'docs'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'inicio' ? 'Inicio' : t === 'config' ? 'Configuracion' : t === 'logs' ? 'Logs' : 'Documentacion'}
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
                <div className="text-xs text-gray-500">Total operaciones</div>
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

          {/* Progreso en vivo */}
          {syncing && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="animate-pulse">{syncStep || syncStatus}</span>
              </div>
              {(syncTotal > 0 || syncProcessed > 0) && (
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>Procesados: {syncProcessed}</span>
                  {syncTotal > 0 && <span>Total: {syncTotal}</span>}
                  {syncErrors > 0 && <span className="text-red-600">Errores: {syncErrors}</span>}
                </div>
              )}
            </div>
          )}

          {/* Error de sincronizacion */}
          {syncError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {syncError}
            </div>
          )}

          {/* Botones */}
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
            {syncing && (
              <button
                onClick={handleCancel}
                className={`${btnClass} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`}
              >
                Cancelar
              </button>
            )}
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

          {/* Resultados de test de imagenes */}
          {auditResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Verifica disponibilidad de imagenes y muestra la operacion de sincronizacion de cada placa testeada.
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Sync</th>
                      <th className="text-left p-2">Frontal</th>
                      <th className="text-left p-2">Lateral</th>
                      <th className="text-left p-2">Galeria</th>
                      <th className="text-left p-2">Diagnostico</th>
                      <th className="text-left p-2">Enlace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditResults.map((a, i) => {
                      const frontalOk = a.frontalStatus.startsWith('ok');
                      const lateralOk = a.lateralStatus.startsWith('ok');
                      const fullOk = !a.error && frontalOk && lateralOk;
                      const fNoImg = a.frontalStatus === 'no_image';
                      const lNoImg = a.lateralStatus === 'no_image';
                      const fErr = !a.error && !frontalOk && !fNoImg;
                      const lErr = !a.error && !lateralOk && !lNoImg;

                      // Human-readable status
                      const fLabel = a.error ? '--' : frontalOk ? 'Accesible' : fNoImg ? 'Sin imagen' : a.frontalStatus.includes('error(') ? 'No encontrada' : a.frontalStatus;
                      const lLabel = a.error ? '--' : lateralOk ? 'Accesible' : lNoImg ? 'Sin imagen' : a.lateralStatus.includes('error(') ? 'No encontrada' : a.lateralStatus;
                      const fColor = a.error ? 'text-gray-400' : frontalOk ? 'text-green-600' : fNoImg ? 'text-amber-600' : 'text-red-600';
                      const lColor = a.error ? 'text-gray-400' : lateralOk ? 'text-green-600' : lNoImg ? 'text-amber-600' : 'text-red-600';

                      // Human-readable diagnosis
                      let diagLabel = 'Sin datos';
                      let diagColor = 'text-gray-500';
                      if (a.error) { diagLabel = a.error; diagColor = 'text-red-600'; }
                      else if (fullOk) { diagLabel = 'Imagenes correctas'; diagColor = 'text-green-600'; }
                      else if (frontalOk && lNoImg) { diagLabel = 'Sin imagen lateral en origen'; diagColor = 'text-amber-600'; }
                      else if (frontalOk && lErr) { diagLabel = 'Lateral inaccesible en web'; diagColor = 'text-red-600'; }
                      else if (fNoImg && lateralOk) { diagLabel = 'Sin imagen frontal en origen'; diagColor = 'text-amber-600'; }
                      else if (fNoImg && lNoImg) { diagLabel = 'Vehiculo sin imagenes en origen'; diagColor = 'text-amber-600'; }
                      else if (fNoImg && lErr) { diagLabel = 'Sin frontal en origen. Lateral inaccesible'; diagColor = 'text-red-600'; }
                      else if (fErr && lateralOk) { diagLabel = 'Frontal inaccesible en web'; diagColor = 'text-red-600'; }
                      else if (fErr && lNoImg) { diagLabel = 'Frontal inaccesible. Sin lateral en origen'; diagColor = 'text-red-600'; }
                      else if (fErr && lErr) { diagLabel = 'Ambas imagenes inaccesibles en web'; diagColor = 'text-red-600'; }

                      // Sync summary
                      const syncLabel = a.syncResultado
                        ? `WP: ${a.syncResultado}`
                        : a.syncOperacion
                          ? `WP: ${a.syncOperacion} (${a.syncResultado || 'ok'})`
                          : '--';
                      const syncColor = a.syncStatus === 'ok' ? 'text-green-600' : 'text-red-600';

                      return (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2 font-medium whitespace-nowrap">{a.placa}</td>
                        <td className={`p-2 text-[10px] ${syncColor}`}>{syncLabel}</td>
                        <td className={`p-2 font-medium ${fColor}`}>{fLabel}</td>
                        <td className={`p-2 font-medium ${lColor}`}>{lLabel}</td>
                        <td className="p-2 text-gray-600">{a.error ? '--' : `${a.galeriaAccessibles}/${a.galeriaCount}`}</td>
                        <td className={`p-2 font-medium ${diagColor}`}>{diagLabel}</td>
                        <td className="p-2">
                          {a.linkUrl ? (
                            <a href={a.linkUrl} target="_blank" className="text-blue-600 hover:text-blue-800 underline text-[10px]">Ver en sitio</a>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Auditoria por placa */}
          <div className="bg-gray-50 border rounded p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Auditoria por placa</h3>
            <div className="flex gap-2">
              <input
                className={`${inputClass} max-w-xs uppercase`}
                value={auditPlaca}
                onChange={(e) => setAuditPlaca(e.target.value)}
                placeholder="Ingrese placa"
                onKeyDown={(e) => e.key === 'Enter' && fetchAuditLog()}
              />
              <button
                onClick={fetchAuditLog}
                className="bg-blue-600 text-white px-3 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
            </div>
            {auditMsg && (
              <p className="text-xs text-gray-500">{auditMsg}</p>
            )}
            {auditLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 font-medium">Historial de sync ({auditLogs.length} registros)</p>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Operacion</th>
                        <th className="text-left p-2">Resultado</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Detalle</th>
                        <th className="text-left p-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, i) => {
                        const opLabel = log.operacion === 'create' ? 'Crear' : log.operacion === 'update' ? 'Actualizar' : log.operacion === 'delete' ? 'Eliminar' : log.operacion || '--';
                        const resultOk = log.resultado === 'ok';
                        return (
                          <tr key={log.id || i} className="border-t border-gray-100">
                            <td className="p-2 font-medium">{opLabel}</td>
                            <td className={`p-2 font-medium ${resultOk ? 'text-green-600' : 'text-red-600'}`}>
                              {resultOk ? 'OK' : log.resultado || '--'}
                            </td>
                            <td className="p-2">{log.status || '--'}</td>
                            <td className="p-2 text-gray-600 max-w-[200px] truncate">{log.detalle || '--'}</td>
                            <td className="p-2 text-gray-500 whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString('es-CO') : '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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
          <div className="flex justify-between items-center gap-3">
            <input
              className={`${inputClass} max-w-xs uppercase`}
              value={placaBusqueda}
              onChange={(e) => setPlacaBusqueda(e.target.value)}
              placeholder="Filtrar por placa..."
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{logsFiltrados.length} registros</span>
              <button
                onClick={handleClearLogs}
                className="text-red-600 text-xs hover:text-red-800 transition-colors"
              >
                Limpiar logs
              </button>
            </div>
          </div>
          {logsError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {logsError}
            </div>
          )}
          {logsFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {placaBusqueda ? `Sin registros para "${placaBusqueda}"` : 'Sin registros aun'}
            </p>
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
                  {logsFiltrados.map((log) => (
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
                          {log.operacion ? log.operacion.toUpperCase() : '--'}
                        </span>
                      </td>
                      <td className="p-2">{log.resultado || '--'}</td>
                      <td className="p-2">
                        <span
                          className={`font-medium ${
                            log.status === 'ok' || log.status === 'success'
                              ? 'text-green-600'
                              : log.status === 'error'
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {log.status || '--'}
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

      {/* Tab: Documentacion */}
      {tab === 'docs' && (
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-gray-50 border rounded p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Descripcion</h3>
            <p>
              Sincroniza el inventario de vehiculos usados desde una fuente externa (inventario JSON)
              hacia WordPress (Autolarte). Ejecuta un worker backend asincrono que procesa los vehiculos
              y realiza un test de accesibilidad de imagenes (frontal y lateral) sobre 10 placas aleatorias.
            </p>
          </div>

          <div className="bg-gray-50 border rounded p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Endpoints</h3>
            <div className="space-y-2">
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">POST /start</code>
                <p className="text-xs text-gray-500 mt-1">
                  Inicia una sincronizacion. Lanza un worker en background. Rechaza con 409 si ya hay una en ejecucion.
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">GET /status</code>
                <p className="text-xs text-gray-500 mt-1">
                  Consulta el estado del worker. Responde con running, status, stepLabel, processed, total, errors, results y testResults (auditoria).
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">POST /cancel</code>
                <p className="text-xs text-gray-500 mt-1">
                  Cancela la sincronizacion en curso si existe.
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">GET /stats</code>
                <p className="text-xs text-gray-500 mt-1">
                  Devuelve estadisticas acumuladas: total de operaciones, okCount, errorCount, ultimaSync y resumen por tipo.
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">GET /config</code>
                <p className="text-xs text-gray-500 mt-1">
                  Obtiene la configuracion actual del modulo (WP URL, credenciales, etc).
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">POST /config</code>
                <p className="text-xs text-gray-500 mt-1">
                  Guarda la configuracion del modulo. Recibe un objeto con las claves a actualizar.
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">GET /logs</code>
                <p className="text-xs text-gray-500 mt-1">
                  Lista los ultimos 500 registros de sincronizacion (fecha, placa, operacion, resultado, status, detalle).
                </p>
              </div>
              <div className="bg-white border rounded p-3">
                <code className="text-xs font-mono text-blue-700">DELETE /logs</code>
                <p className="text-xs text-gray-500 mt-1">
                  Limpia todos los registros de log del modulo.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border rounded p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Flujo de sincronizacion</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
              <li>El frontend llama POST /start para lanzar el worker</li>
              <li>El worker se ejecuta en background escribiendo progreso en un archivo JSON</li>
              <li>El frontend hace polling a GET /status cada 2 segundos</li>
              <li>Cuando status=completed, se muestran resultados y auditoria de consistencia</li>
              <li>El boton Cancelar llama POST /cancel para detener el worker</li>
            </ol>
          </div>

          <div className="bg-gray-50 border rounded p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Programacion automatica (cron)</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">Horario</span>
                <p className="text-gray-500 mt-1">Se ejecuta automaticamente 2 veces al dia a las 06:00 y 18:00 UTC (01:00 y 13:00 hora Colombia).</p>
              </div>
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">Comportamiento</span>
                <p className="text-gray-500 mt-1">Si ya hay una sync en ejecucion (manual o automatica), la ejecucion programada se salta silenciosamente. El boton manual en la pestana Inicio sigue disponible siempre.</p>
              </div>
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">Notificaciones</span>
                <p className="text-gray-500 mt-1">Al finalizar cada ejecucion automatica se envia un resumen al chat de Telegram del administrador con total procesado, errores y estado de imagenes.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border rounded p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Servicios externos</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">Inventario JSON</span>
                <p className="text-gray-500 mt-1">Fuente principal de datos. Endpoint: <code className="text-xs">https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json</code></p>
                <p className="text-gray-400 mt-0.5">Contiene el listado JSON de todos los vehiculos usados disponibles (marca, modelo, placa, precio, imagenes, etc).</p>
              </div>
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">WordPress JetCCT API</span>
                <p className="text-gray-500 mt-1">CRUD de vehiculos en Autolarte. Endpoint: <code className="text-xs">/wp-json/jet-cct/cct_vehiculos_usados</code></p>
                <p className="text-gray-400 mt-0.5">Permite GET (listar/consultar), POST (crear), PUT (actualizar) y DELETE (eliminar) registros de vehiculos usados. Autenticacion via Basic Auth con usuario de WordPress.</p>
              </div>
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">MeiliSearch</span>
                <p className="text-gray-500 mt-1">Repositorio de reportes. Endpoint: <code className="text-xs">https://server-search.zeroazul.com</code></p>
                <p className="text-gray-400 mt-0.5">Indice <code className="text-xs">bd_reports_dworkers</code>. Al finalizar cada sync se guarda un reporte HTML con resumen de resultados.</p>
              </div>
              <div className="bg-white border rounded p-3">
                <span className="font-mono text-blue-700 font-semibold">Autenticacion WordPress</span>
                <p className="text-gray-500 mt-1">Usuario configurable via <code className="text-xs">wp_auth</code>. Basic Auth en base64.</p>
                <p className="text-gray-400 mt-0.5">Usuario actual: <code className="text-xs">romer.montoya</code> con Application Password. Permisos: GET, POST, PUT, DELETE funcionales.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}