'use client';

import { useEffect, useState } from 'react';

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

export default function SincronizadorUsadosAutolarte({
  moduleData,
}: {
  moduleData?: { id: number; titulo: string };
}) {
  const [tab, setTab] = useState<TabId>('inicio');
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState('');
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);

  useEffect(() => {
    if (tab === 'inicio') fetchStats();
    if (tab === 'logs') fetchLogs();
    if (tab === 'config') fetchConfig();
  }, [tab]);

  async function fetchStats() {
    try {
      const res = await fetch(`${BASE}/stats`);
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {}
  }

  async function fetchLogs() {
    try {
      const res = await fetch(`${BASE}/logs`);
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch {}
  }

  async function fetchConfig() {
    try {
      const res = await fetch(`${BASE}/config`);
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setEditConfig({ ...data.config });
      }
    } catch {}
  }

  async function handleSync() {
    setSyncing(true);
    setMensaje('');
    setSyncResults([]);
    try {
      const res = await fetch(`${BASE}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMensaje(`Sincronización completada: ${data.okCount} ok, ${data.errCount} errores (${data.elapsedSec}s)`);
        setSyncResults(data.results || []);
      } else {
        setMensaje(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMensaje(`Error de red: ${e?.message}`);
    }
    setSyncing(false);
    fetchStats();
  }

  async function handleSaveConfig() {
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
      const data = await res.json();
      if (data.ok) {
        setMensaje('Configuración guardada');
        setConfig({ ...editConfig });
      } else {
        setMensaje(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMensaje(`Error: ${e?.message}`);
    }
  }

  async function handleClearLogs() {
    if (!confirm('¿Limpiar todos los logs?')) return;
    await fetch(`${BASE}/logs`, { method: 'DELETE' });
    fetchLogs();
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
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
            {t === 'inicio' ? 'Inicio' : t === 'config' ? 'Configuración' : 'Logs'}
          </button>
        ))}
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3">
          {mensaje}
        </div>
      )}

      {/* Tab: Inicio */}
      {tab === 'inicio' && (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
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
                <div className="text-2xl font-bold" style={{ color: stats.errorCount > 0 ? '#dc2626' : '#16a34a' }}>
                  {stats.errorCount}
                </div>
                <div className="text-xs text-gray-500">Errores</div>
              </div>
              <div className="bg-gray-50 border rounded p-3 text-center">
                <div className="text-lg font-bold text-gray-800">
                  {stats.ultimaSync ? new Date(stats.ultimaSync).toLocaleString('es-CO') : '--'}
                </div>
                <div className="text-xs text-gray-500">Última sincronización</div>
              </div>
            </div>
          )}

          {/* Botón Sincronizar */}
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
              {syncing ? 'Sincronizando...' : '🔄 Sincronizar'}
            </button>
          </div>

          {/* Resultados de última sincronización */}
          {syncResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Últimos resultados</h3>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Operación</th>
                      <th className="text-left p-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncResults.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2 font-medium">{r.placa}</td>
                        <td className="p-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            r.operacion === 'create' ? 'bg-green-100 text-green-800' :
                            r.operacion === 'update' ? 'bg-blue-100 text-blue-800' :
                            r.operacion === 'delete' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
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
        </div>
      )}

      {/* Tab: Configuración */}
      {tab === 'config' && (
        <div className="space-y-4 max-w-lg">
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
            Guardar configuración
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
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin registros aún</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Placa</th>
                    <th className="text-left p-2">Operación</th>
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
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          log.operacion === 'create' ? 'bg-green-100 text-green-800' :
                          log.operacion === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.operacion === 'delete' ? 'bg-yellow-100 text-yellow-800' :
                          log.operacion === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {(log.operacion || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 max-w-[200px] truncate">{log.resultado}</td>
                      <td className="p-2">
                        <span className={`font-medium ${log.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
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