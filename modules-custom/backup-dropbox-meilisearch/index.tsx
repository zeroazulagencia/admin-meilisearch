'use client';

import { useState, useEffect } from 'react';

interface LogRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  file_name: string | null;
  dropbox_path: string | null;
  bytes_size: number | null;
  error_message: string | null;
  created_at: string;
}

const BASE = '/api/custom-module9/backup-dropbox-meilisearch';

export default function BackupDropboxMeilisearchModule() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [activeTab, setActiveTab] = useState<'logs' | 'config'>('logs');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    dropbox_access_token: '',
    dropbox_refresh_token: '',
    dropbox_app_key: '',
    dropbox_app_secret: '',
    dropbox_folder_path: '',
    cron_secret: '',
    ssh_host: '',
    ssh_user: '',
    ssh_password: '',
    ssh_port: '',
    meilisearch_api_key: '',
  });
  const [runSecret, setRunSecret] = useState('');
  const [runningBackup, setRunningBackup] = useState(false);
  const [cleaningHistory, setCleaningHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE);
      const json = await res.json();
      if (json.ok) setLogs(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const json = await res.json();
      if (json.ok) setConfig(json.config || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const payload: Record<string, string> = {};
      if (configForm.dropbox_access_token.trim()) payload.dropbox_access_token = configForm.dropbox_access_token.trim();
      if (configForm.dropbox_refresh_token.trim()) payload.dropbox_refresh_token = configForm.dropbox_refresh_token.trim();
      if (configForm.dropbox_app_key.trim()) payload.dropbox_app_key = configForm.dropbox_app_key.trim();
      if (configForm.dropbox_app_secret.trim()) payload.dropbox_app_secret = configForm.dropbox_app_secret.trim();
      if (configForm.dropbox_folder_path.trim()) payload.dropbox_folder_path = configForm.dropbox_folder_path.trim();
      if (configForm.cron_secret.trim()) payload.cron_secret = configForm.cron_secret.trim();
      if (configForm.ssh_host.trim()) payload.ssh_host = configForm.ssh_host.trim();
      if (configForm.ssh_user.trim()) payload.ssh_user = configForm.ssh_user.trim();
      if (configForm.ssh_password.trim()) payload.ssh_password = configForm.ssh_password.trim();
      if (configForm.ssh_port.trim()) payload.ssh_port = configForm.ssh_port.trim();
      if (configForm.meilisearch_api_key.trim()) payload.meilisearch_api_key = configForm.meilisearch_api_key.trim();
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
        setConfigForm({
          dropbox_access_token: '',
          dropbox_refresh_token: '',
          dropbox_app_key: '',
          dropbox_app_secret: '',
          dropbox_folder_path: '',
          cron_secret: '',
          ssh_host: '',
          ssh_user: '',
          ssh_password: '',
          ssh_port: '',
          meilisearch_api_key: '',
        });
        setActiveTab('logs');
      }
      else alert(json.error || 'Error al guardar');
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const runBackupNow = async () => {
    setRunningBackup(true);
    try {
      const query = runSecret ? `?cron_secret=${encodeURIComponent(runSecret)}` : '';
      const res = await fetch(`${BASE}/run${query}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al ejecutar backup');
      } else {
        await load();
      }
    } catch (e) {
      alert('Error al ejecutar backup');
    } finally {
      setRunningBackup(false);
    }
  };

  const cleanupHistory = async () => {
    if (!confirm('Se eliminaran todos los registros y backups anteriores en Dropbox. Deseas continuar?')) {
      return;
    }
    setCleaningHistory(true);
    try {
      const query = runSecret ? `?cron_secret=${encodeURIComponent(runSecret)}` : '';
      const res = await fetch(`${BASE}/cleanup${query}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al limpiar historial');
      } else if (json.dropboxError) {
        alert(`Historial limpiado. Dropbox: ${json.dropboxError}`);
      }
      await load();
    } catch (e) {
      alert('Error al limpiar historial');
    } finally {
      setCleaningHistory(false);
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return '-';
    return new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatBytes = (n: number | null) => {
    if (n == null) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDropboxLink = (pathValue: string | null) => {
    if (!pathValue) return null;
    const cleanPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
    return `https://www.dropbox.com/home${encodeURI(cleanPath)}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Log de sincronizaciones diarias</h2>
          <div className="flex gap-1 border-b border-gray-200 mt-2">
            {([
              { id: 'logs' as const, label: 'Logs' },
              { id: 'config' as const, label: 'Configuracion' },
            ]).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'config' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-600">Configura la conexion SSH, la API key de Meilisearch y Dropbox.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dropbox Access Token</label>
                <input
                  type="password"
                  placeholder={config.dropbox_access_token ? '••••••••' : 'Pegar token'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.dropbox_access_token}
                  onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_access_token: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dropbox Refresh Token</label>
                <input
                  type="password"
                  placeholder={config.dropbox_refresh_token ? '••••••••' : 'Pegar refresh token'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.dropbox_refresh_token}
                  onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_refresh_token: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dropbox App Key</label>
                <input
                  type="text"
                  placeholder={config.dropbox_app_key || 'App Key'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.dropbox_app_key}
                  onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_app_key: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dropbox App Secret</label>
                <input
                  type="password"
                  placeholder={config.dropbox_app_secret ? '••••••••' : 'App Secret'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.dropbox_app_secret}
                  onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_app_secret: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SSH Host</label>
                <input
                  type="text"
                  placeholder="89.167.95.201"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.ssh_host || config.ssh_host || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, ssh_host: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SSH Usuario</label>
                <input
                  type="text"
                  placeholder="root"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.ssh_user || config.ssh_user || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, ssh_user: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SSH Puerto</label>
                <input
                  type="text"
                  placeholder="22"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.ssh_port || config.ssh_port || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, ssh_port: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SSH Password</label>
                <input
                  type="password"
                  placeholder={config.ssh_password ? '••••••••' : 'Password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={configForm.ssh_password}
                  onChange={(e) => setConfigForm((f) => ({ ...f, ssh_password: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meilisearch API Key</label>
              <input
                type="password"
                placeholder={config.meilisearch_api_key ? '••••••••' : 'API Key'}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={configForm.meilisearch_api_key}
                onChange={(e) => setConfigForm((f) => ({ ...f, meilisearch_api_key: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Carpeta Dropbox (ruta)</label>
              <input
                type="text"
                placeholder="/Aplicaciones/Zero Azul WORKERS/MEILISEARCH"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={configForm.dropbox_folder_path || config.dropbox_folder_path || ''}
                onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_folder_path: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cron secret (para POST /run)</label>
              <input
                type="password"
                placeholder="Opcional"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={configForm.cron_secret}
                onChange={(e) => setConfigForm((f) => ({ ...f, cron_secret: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={saveConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {savingConfig ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runBackupNow}
                  disabled={runningBackup}
                  className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {runningBackup ? 'Ejecutando...' : 'Reintentar backup'}
                </button>
                <button
                  type="button"
                  onClick={cleanupHistory}
                  disabled={cleaningHistory}
                  className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {cleaningHistory ? 'Limpiando...' : 'Limpiar historial'}
                </button>
                <button type="button" onClick={load} className="px-3 py-2 text-sm bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium">
                  Actualizar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }} />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No hay registros de sincronización aún.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Archivo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ruta</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tamaño</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono text-gray-900">{r.id}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{formatDate(r.started_at)}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">{formatDate(r.finished_at)}</td>
                          <td className="px-3 py-2 text-xs">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              r.status === 'ok' ? 'bg-green-100 text-green-800' :
                              r.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{r.file_name || '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {r.dropbox_path ? (
                              <a
                                href={getDropboxLink(r.dropbox_path) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#5DE1E5] hover:opacity-80 font-medium"
                                title={r.dropbox_path}
                              >
                                {r.dropbox_path}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{formatBytes(r.bytes_size)}</td>
                          <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate" title={r.error_message || ''}>{r.error_message || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
