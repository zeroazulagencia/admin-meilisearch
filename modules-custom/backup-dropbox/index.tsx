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

const BASE = '/api/custom-module7/backup-dropbox';

export default function BackupDropboxModule() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ dropbox_access_token: '', dropbox_folder_path: '', cron_secret: '' });

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
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dropbox_access_token: configForm.dropbox_access_token || null,
          dropbox_folder_path: configForm.dropbox_folder_path || config['dropbox_folder_path'],
          cron_secret: configForm.cron_secret || null,
        }),
      });
      const json = await res.json();
      if (json.ok) { await loadConfig(); setShowConfig(false); }
      else alert(json.error || 'Error al guardar');
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setSavingConfig(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Log de sincronizaciones diarias</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showConfig ? 'Ocultar configuración' : 'Configuración'}
          </button>
          <button type="button" onClick={load} className="px-3 py-2 text-sm bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium">
            Actualizar
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-600">Token de Dropbox y secreto para cron (opcional). Guardar para que el backup a medianoche funcione.</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dropbox Access Token</label>
            <input
              type="password"
              placeholder={config.dropbox_access_token ? '••••••••' : 'Pegar token'}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={configForm.dropbox_access_token}
              onChange={(e) => setConfigForm((f) => ({ ...f, dropbox_access_token: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Carpeta Dropbox (ruta)</label>
            <input
              type="text"
              placeholder="/Aplicaciones/Zero Azul WORKERS"
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
  );
}
