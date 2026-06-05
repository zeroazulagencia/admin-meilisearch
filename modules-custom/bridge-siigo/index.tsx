'use client';

import { useState, useEffect } from 'react';

const MODULE_ID = 22;
const FOLDER = 'bridge-siigo';
const BASE = `/api/custom-module${MODULE_ID}/${FOLDER}`;

type Tab = 'dashboard' | 'config' | 'documentacion';

interface Module22Props {
  moduleData?: { title?: string };
}

export default function BridgeSiigo({ moduleData }: Module22Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    access_key: '',
    siigo_username: '',
    siigo_access_key: '',
  });

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
      if (form.access_key.trim()) body.access_key = form.access_key.trim();
      if (form.siigo_username.trim()) body.siigo_username = form.siigo_username.trim();
      if (form.siigo_access_key.trim()) body.siigo_access_key = form.siigo_access_key.trim();

      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
        setShowEditForm(false);
        setForm({ access_key: '', siigo_username: '', siigo_access_key: '' });
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
      const res = await fetch(`${BASE}/auth`, { method: 'POST' });
      const json = await res.json();
      setTestResult({ ok: json.ok, message: json.message || json.error || 'Error' });
    } catch {
      setTestResult({ ok: false, message: 'No se pudo conectar con el bridge' });
    } finally {
      setTesting(false);
    }
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500">Estado</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">Inactivo</p>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500">Ultima conexion</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">--</p>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500">Solicitudes</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">0</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuracion */}
      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuracion</h2>
            <p className="text-sm text-gray-500">Credenciales Siigo y access key del bridge</p>
          </div>

          {!showEditForm ? (
            <>
              <div className="space-y-4">
                <ConfigField
                  label="Access key (bridge)"
                  value={config.access_key || 'No configurado'}
                  desc="Token que los clientes deben enviar como Bearer token"
                />
                <ConfigField
                  label="Usuario Siigo"
                  value={config.siigo_username || 'No configurado'}
                  desc="Email o usuario de la API de Siigo"
                />
                <ConfigField
                  label="Access key Siigo"
                  value={config.siigo_access_key || 'No configurado'}
                  desc="Access key generada desde Siigo Nube (Alianzas > Mi Credencial API)"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowEditForm(true)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access key (bridge)</label>
                <input
                  type="password"
                  value={form.access_key}
                  onChange={(e) => setForm({ ...form, access_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Nuevo token del bridge"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario Siigo</label>
                <input
                  type="text"
                  value={form.siigo_username}
                  onChange={(e) => setForm({ ...form, siigo_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Usuario de la API Siigo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access key Siigo</label>
                <input
                  type="password"
                  value={form.siigo_access_key}
                  onChange={(e) => setForm({ ...form, siigo_access_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Access key de Siigo"
                />
              </div>
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
                    setForm({ access_key: '', siigo_username: '', siigo_access_key: '' });
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

            <p>Bridge que proxy requests a la API de Siigo. Los clientes se autentican con el access_key via Bearer token. El bridge renueva automaticamente el token JWT de Siigo cada 24h.</p>

            <h3 className="text-base font-semibold text-gray-900">Autenticacion</h3>
            <p>Todos los endpoints requieren:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`Authorization: Bearer {access_key}`}</pre>

            <h3 className="text-base font-semibold text-gray-900">Endpoints</h3>

            <div className="space-y-3">
              <Endpoint method="POST" path={`${BASE}/auth`} desc="Verifica conectividad con Siigo (test rapido)" />
              <Endpoint method="GET" path={`${BASE}/products`} desc="Listar productos" note="Soporta filtros: ?code=, ?created_start=, ?updated_start=, ?id=" />
              <Endpoint method="POST" path={`${BASE}/products`} desc="Crear producto" body />
              <Endpoint method="GET" path={`${BASE}/products/{id}`} desc="Consultar producto por ID" />
              <Endpoint method="PUT" path={`${BASE}/products/{id}`} desc="Actualizar producto" body />
              <Endpoint method="DELETE" path={`${BASE}/products/{id}`} desc="Borrar producto" />
            </div>

            <h3 className="text-base font-semibold text-gray-900">Ejemplos curl</h3>

            <p className="text-sm font-medium text-gray-700">Test conexion:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`curl -X POST https://workers.zeroazul.com${BASE}/auth \\
  -H "Authorization: Bearer TU_ACCESS_KEY"`}</pre>

            <p className="text-sm font-medium text-gray-700 mt-2">Listar productos:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`curl https://workers.zeroazul.com${BASE}/products \\
  -H "Authorization: Bearer TU_ACCESS_KEY"`}</pre>

            <p className="text-sm font-medium text-gray-700 mt-2">Crear producto:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`curl -X POST https://workers.zeroazul.com${BASE}/products \\
  -H "Authorization: Bearer TU_ACCESS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"PR001","name":"Producto de prueba","account_group":1}'`}</pre>

            <p className="text-sm font-medium text-gray-700 mt-2">Actualizar producto:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`curl -X PUT https://workers.zeroazul.com${BASE}/products/{id} \\
  -H "Authorization: Bearer TU_ACCESS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Nuevo nombre"}'`}</pre>

            <p className="text-sm font-medium text-gray-700 mt-2">Borrar producto:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`curl -X DELETE https://workers.zeroazul.com${BASE}/products/{id} \\
  -H "Authorization: Bearer TU_ACCESS_KEY"`}</pre>

            <h3 className="text-base font-semibold text-gray-900">Campos del producto (POST / PUT)</h3>
            <div className="text-xs space-y-1">
              <p><strong>code</strong><span className="text-red-500">*</span> — Codigo unico, alfanumerico, sin espacios, max 30</p>
              <p><strong>name</strong><span className="text-red-500">*</span> — Nombre del producto, max 100 caracteres</p>
              <p><strong>account_group</strong><span className="text-red-500">*</span> — ID de la clasificacion de inventario (number)</p>
              <p><strong>type</strong> — Product, Service o Combo (default: Product)</p>
              <p><strong>stock_control</strong> — Boolean (default: false)</p>
              <p><strong>active</strong> — Boolean (default: true)</p>
              <p><strong>tax_classification</strong> — Taxed, Exempt o Excluded (default: Taxed)</p>
              <p><strong>description</strong> — Texto, max 2500 caracteres</p>
              <p><strong>reference</strong> — Referencia de fabrica, max 80 caracteres</p>
              <p><strong>barcode</strong> — Codigo de barras, max 50 caracteres</p>
              <p><strong>unit</strong> — Codigo de unidad de medida (default: 94 = Unidad)</p>
            </div>

            <h3 className="text-base font-semibold text-gray-900">Forma de uso desde WORKERS</h3>
            <p>Los workers internos (como el modulo 8 de pagos) pueden llamar al bridge directamente via fetch:</p>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">{`// Ejemplo desde un worker/otro modulo
const res = await fetch("https://workers.zeroazul.com${BASE}/products", {
  headers: { "Authorization": "Bearer " + BRIDGE_KEY }
});
const json = await res.json();`}</pre>

          </div>
        </div>
      )}
    </div>
  );
}

function ConfigField({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 font-mono">{value}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">{desc}</p>
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
        {body && <p className="text-xs text-gray-400">Body: JSON con campos del producto</p>}
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </div>
  );
}
