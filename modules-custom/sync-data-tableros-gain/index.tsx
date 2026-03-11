'use client';

import { useEffect, useMemo, useState } from 'react';
import TablerosGainViewer from './Viewer';

type ConfigResponse = {
  ok: boolean;
  config?: {
    csv_url?: string | null;
    hidden_projects?: string[];
    n8n_api_key?: string | null;
    n8n_base_url?: string | null;
    n8n_workflow_url?: string | null;
    n8n_merge_node_name?: string | null;
  };
  error?: string;
};

type DataResponse = {
  success: boolean;
  data?: Array<{ nombre: string }>;
};

type TabKey = 'visor' | 'config' | 'docs';

const BASE = '/api/custom-module10/sync-data-tableros-gain';
const PUBLIC_URL = 'https://workers.zeroazul.com/custom-module10/sync-data-tableros-gain';

export default function SyncDataTablerosGainModule({ moduleData }: { moduleData?: { title?: string } }) {
  const [activeTab, setActiveTab] = useState<TabKey>('visor');
  const [csvUrl, setCsvUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [n8nApiKeyMasked, setN8nApiKeyMasked] = useState('');
  const [n8nBaseUrl, setN8nBaseUrl] = useState('');
  const [n8nWorkflowUrl, setN8nWorkflowUrl] = useState('');
  const [n8nMergeNodeName, setN8nMergeNodeName] = useState('Merge');
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const title = moduleData?.title || 'Sync Data Tableros GAIN';

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`, { cache: 'no-store' });
      const json: ConfigResponse = await res.json();
      if (json.ok && json.config) {
        setCsvUrl(json.config.csv_url || '');
        setHiddenProjects(json.config.hidden_projects || []);
        const masked = json.config.n8n_api_key || '';
        setN8nApiKey(masked);
        setN8nApiKeyMasked(masked);
        setN8nBaseUrl(json.config.n8n_base_url || '');
        setN8nWorkflowUrl(json.config.n8n_workflow_url || '');
        setN8nMergeNodeName(json.config.n8n_merge_node_name || 'Merge');
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${BASE}?include_hidden=true`, { cache: 'no-store' });
      const json: DataResponse = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const names = json.data.map((p) => p.nombre).filter(Boolean);
        setProjects(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'es')));
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadProjects();
  }, []);

  const toggleProject = (name: string) => {
    setHiddenProjects((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_url: csvUrl || null,
          hidden_projects: hiddenProjects,
          n8n_base_url: n8nBaseUrl || null,
          n8n_workflow_url: n8nWorkflowUrl || null,
          n8n_merge_node_name: n8nMergeNodeName || null,
          ...(n8nApiKey === '' ? { n8n_api_key: '' } : {}),
          ...(n8nApiKey && n8nApiKey !== n8nApiKeyMasked ? { n8n_api_key: n8nApiKey } : {}),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error || 'No se pudo guardar la configuracion');
      } else {
        setMessage('Configuracion guardada');
        await loadProjects();
      }
    } catch (e: any) {
      setMessage(e?.message || 'Error guardando configuracion');
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = useMemo(() => projects.length - hiddenProjects.length, [projects, hiddenProjects]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">Tablero publico con datos desde CSV</p>
        </div>
        <a
          href={PUBLIC_URL}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-[#00AEEF] text-white rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Abrir visor publico
        </a>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { id: 'visor', label: 'Visor' },
            { id: 'config', label: 'Configuracion' },
            { id: 'docs', label: 'Documentacion' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-[#00AEEF] text-[#00AEEF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'visor' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <TablerosGainViewer dataEndpoint={BASE} subtitle="Sistema de Monitoreo de Proyectos de GAIN" />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuracion</h2>
            <p className="text-sm text-gray-500">Define la fuente CSV y los proyectos visibles en el visor publico.</p>
          </div>

          <div className="space-y-3 max-w-2xl">
            <label className="block text-sm font-medium text-gray-700">N8N Base URL</label>
            <input
              type="url"
              value={n8nBaseUrl}
              onChange={(e) => setN8nBaseUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://automation.zeroazul.com/"
            />
          </div>

          <div className="space-y-3 max-w-2xl">
            <label className="block text-sm font-medium text-gray-700">N8N API Key</label>
            <input
              type="password"
              value={n8nApiKey}
              onChange={(e) => setN8nApiKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="n8n api key"
            />
          </div>

          <div className="space-y-3 max-w-2xl">
            <label className="block text-sm font-medium text-gray-700">Workflow URL</label>
            <input
              type="url"
              value={n8nWorkflowUrl}
              onChange={(e) => setN8nWorkflowUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://automation.zeroazul.com/workflow/..."
            />
          </div>

          <div className="space-y-3 max-w-2xl">
            <label className="block text-sm font-medium text-gray-700">Nombre del nodo Merge</label>
            <input
              type="text"
              value={n8nMergeNodeName}
              onChange={(e) => setN8nMergeNodeName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Merge"
            />
            {loadingConfig && <p className="text-xs text-gray-400">Cargando configuracion...</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Visibilidad de proyectos</h3>
                <p className="text-xs text-gray-500">{visibleCount} visibles de {projects.length} totales</p>
              </div>
              <button
                onClick={loadProjects}
                disabled={loadingProjects}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {loadingProjects ? 'Actualizando...' : 'Recargar lista'}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {projects.map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!hiddenProjects.includes(name)}
                    onChange={() => toggleProject(name)}
                    className="rounded border-gray-300"
                  />
                  <span>{name}</span>
                </label>
              ))}
              {projects.length === 0 && !loadingProjects && (
                <p className="text-sm text-gray-500">No se encontraron proyectos en el CSV.</p>
              )}
            </div>
          </div>

          {message && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-[#00AEEF] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 text-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Documentacion del modulo</h2>
            <p className="text-gray-600">Sincroniza datos desde la ultima ejecucion exitosa de n8n (nodo Merge) y genera un tablero con filtros, CPM, licitaciones e impacto.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visor publico</p>
            <code className="block bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3">{PUBLIC_URL}</code>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">API de datos</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`GET  ${BASE}                       Datos agregados (ultima ejecucion exitosa)
GET  ${BASE}?include_hidden=true    Datos con todos los proyectos`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">API de configuracion</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`GET  ${BASE}/config
PUT  ${BASE}/config

Body:
{
  "n8n_base_url": "https://automation.zeroazul.com/",
  "n8n_api_key": "***",
  "n8n_workflow_url": "https://automation.zeroazul.com/workflow/DpPILwY0qRik1UX6/289e06",
  "n8n_merge_node_name": "Merge",
  "hidden_projects": ["Proyecto A", "Proyecto B"]
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
