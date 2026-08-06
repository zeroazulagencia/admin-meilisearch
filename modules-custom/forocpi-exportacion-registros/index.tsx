'use client';

import { useState, useEffect } from 'react';

const MODULE_ID = 23;
const FOLDER = 'forocpi-exportacion-registros';
const BASE = `/api/custom-module${MODULE_ID}/${FOLDER}`;

type Tab = 'dashboard' | 'config' | 'documentacion';

interface Module23Props {
  moduleData?: { title?: string };
}

interface WpPost {
  id: number;
  date: string;
  title: { raw: string; rendered: string };
  meta: Record<string, string>;
}

interface WpResponse {
  ok: boolean;
  data: WpPost | WpPost[];
  error?: string;
}

const CONFIG_FIELDS: { key: string; label: string; desc: string; secret: boolean }[] = [
  { key: 'wp_url', label: 'URL WordPress', desc: 'URL base del sitio WordPress', secret: false },
  { key: 'wp_user', label: 'Usuario WordPress', desc: 'Usuario con permisos de API REST', secret: false },
  { key: 'wp_app_password', label: 'Application Password', desc: 'Contrasena de aplicacion generada desde /wp-admin/profile.php', secret: true },
  { key: 'server_ip', label: 'IP Servidor', desc: 'Direccion IP del servidor donde esta alojado WordPress', secret: false },
  { key: 'db_name', label: 'DB Name', desc: 'Nombre de la base de datos MySQL de WordPress', secret: false },
  { key: 'db_user', label: 'DB User', desc: 'Usuario de la base de datos MySQL', secret: false },
  { key: 'db_password', label: 'DB Password', desc: 'Contrasena de la base de datos MySQL', secret: true },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ForocpiExportacionRegistros({ moduleData }: Module23Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    CONFIG_FIELDS.forEach((f) => { init[f.key] = ''; });
    return init;
  });

  // Dashboard state
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'config', label: 'Configuracion' },
    { id: 'documentacion', label: 'Documentacion' },
  ];

  const loadConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const json = await res.json();
      if (json.ok) setConfig(json.config || {});
    } catch { /* skip */ }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    setPostsError('');
    try {
      const res = await fetch(`${BASE}/posts?year=2026&per_page=50`);
      const json: WpResponse = await res.json();
      if (json.ok) {
        const list = Array.isArray(json.data) ? json.data : [];
        setPosts(list);
      } else {
        setPostsError(json.error || 'Error al cargar posts');
      }
    } catch {
      setPostsError('Error de conexion');
    } finally {
      setLoadingPosts(false);
    }
  };

  const exportExcel = async (formId: number, formTitle: string) => {
    setDownloading(formId);
    setDownloadError('');
    try {
      const res = await fetch(`${BASE}/export?id=${formId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setDownloadError(json.error || `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefix = formTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
      a.download = `${prefix}-${formId}-registros.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadConfig();
      loadPosts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'config') {
      loadConfig();
      setTestResult(null);
    }
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string | null> = {};
      CONFIG_FIELDS.forEach((f) => {
        if (form[f.key].trim()) body[f.key] = form[f.key].trim();
      });

      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
        setShowEditForm(false);
        const cleared: Record<string, string> = {};
        CONFIG_FIELDS.forEach((f) => { cleared[f.key] = ''; });
        setForm(cleared);
      } else {
        alert(json.error || 'Error al guardar');
      }
    } catch {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE}/test`, { method: 'POST' });
      const json = await res.json();
      setTestResult({ ok: json.ok, message: json.message || json.error || 'Error' });
    } catch {
      setTestResult({ ok: false, message: 'No se pudo conectar con el bridge' });
    } finally {
      setTesting(false);
    }
  };

  const openEditForm = () => {
    const filled: Record<string, string> = {};
    CONFIG_FIELDS.forEach((f) => {
      filled[f.key] = config[f.key] || '';
    });
    setForm(filled);
    setShowEditForm(true);
    setTestResult(null);
  };

  return (
    <div className="p-6 space-y-4">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-500">Estado</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {config.wp_url ? 'Conectado' : 'Sin configurar'}
                </p>
              </div>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-500">WordPress</p>
                <p className="text-sm font-semibold text-gray-900 mt-1 font-mono">
                  {config.wp_url ? config.wp_url.replace(/^https?:\/\//, '').replace(/\/+$/, '') : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-500">Formularios (jet-form-builder)</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{posts.length}</p>
              </div>
            </div>
          </div>

          {/* Post list with download buttons */}
          {loadingPosts && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
              Cargando formularios...
            </div>
          )}

          {postsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {postsError}
            </div>
          )}

          {downloadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {downloadError}
            </div>
          )}

          {!loadingPosts && !postsError && posts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
              No se encontraron formularios jet-form-builder. Configura la conexion WordPress en la pestana Configuracion.
            </div>
          )}

          {posts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Formularios 2026</h3>
              <div className="divide-y divide-gray-100">
                {posts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.title.raw || `ID ${p.id}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ID {p.id} &middot; {formatDate(p.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => exportExcel(p.id, p.title.raw || 'form')}
                      disabled={downloading === p.id}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {downloading === p.id ? (
                        <>Descargando...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Excel
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuracion */}
      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuracion</h2>
            <p className="text-sm text-gray-500">Credenciales de conexion a WordPress ForoCPI</p>
          </div>

          {!showEditForm ? (
            <>
              <div className="space-y-4">
                {CONFIG_FIELDS.map((f) => (
                  <div key={f.key}>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.label}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {f.secret && config[f.key] && config[f.key]!.length > 8
                            ? config[f.key]!.slice(0, 4) + '****' + config[f.key]!.slice(-4)
                            : config[f.key] || 'No configurado'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={openEditForm}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Editar configuracion
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {testing ? 'Probando...' : 'Test connection'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResult.ok
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {testResult.message}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 max-w-md">
              {CONFIG_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.secret ? 'password' : 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={f.desc}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    const cleared: Record<string, string> = {};
                    CONFIG_FIELDS.forEach((f) => { cleared[f.key] = ''; });
                    setForm(cleared);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documentacion */}
      {activeTab === 'documentacion' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Documentacion</h2>
          <div className="prose prose-sm max-w-none text-gray-600 space-y-4">
            <p>
              Modulo de exportacion de registros desde WordPress (ForoCPI).
              Permite conectar con la base de datos y API REST de WordPress
              para extraer y procesar informacion.
            </p>

            <h3 className="text-base font-semibold text-gray-900">Conexion WordPress</h3>
            <p>Se autentica via REST API usando Application Password (Basic Auth):</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`Authorization: Basic base64(wp_user:wp_app_password)`}</pre>

            <h3 className="text-base font-semibold text-gray-900">Endpoints</h3>
            <div className="space-y-3">
              <Endpoint method="PUT" path={`${BASE}/config`} desc="Guardar configuracion de conexion" body />
              <Endpoint method="GET" path={`${BASE}/config`} desc="Obtener configuracion actual" />
              <Endpoint method="POST" path={`${BASE}/test`} desc="Probar conexion con WordPress via REST API" />
              <Endpoint method="GET" path={`${BASE}/posts`} desc="Listar formularios jet-form-builder" note="query: ?year=2026&per_page=50" />
              <Endpoint method="GET" path={`${BASE}/export?id={id}`} desc="Descargar registros del formulario como Excel (.xlsx)" note="Ej: ?id=18101" />
            </div>

            <h3 className="text-base font-semibold text-gray-900">Campos de configuracion</h3>
            <div className="text-xs space-y-1">
              <p><strong>wp_url</strong> — URL del sitio WordPress</p>
              <p><strong>wp_user</strong> — Usuario con acceso REST API</p>
              <p><strong>wp_app_password</strong> — Application password generada desde /wp-admin/profile.php</p>
              <p><strong>server_ip</strong> — IP del servidor donde corre WordPress</p>
              <p><strong>db_name</strong> — Nombre de la base de datos MySQL</p>
              <p><strong>db_user</strong> — Usuario de base de datos MySQL</p>
              <p><strong>db_password</strong> — Contrasena de base de datos MySQL</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Endpoint({ method, path, desc, body, note }: { method: string; path: string; desc: string; body?: boolean; note?: string }) {
  const colors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    DELETE: 'text-red-600',
    PATCH: 'text-purple-600',
  };
  return (
    <div className="flex items-start gap-2">
      <span className={`text-xs font-bold w-14 shrink-0 ${colors[method] || 'text-gray-600'}`}>{method}</span>
      <div>
        <code className="text-xs">{path}</code>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        {body && <p className="text-xs text-gray-400">Body: JSON con campos de configuracion</p>}
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </div>
  );
}