'use client';

import { useState, useEffect } from 'react';

type Tab = 'modulos' | 'config' | 'docs';

interface WPConfig {
  wp_db_host: string;
  wp_db_port: string;
  wp_db_name: string;
  wp_db_user: string;
  wp_db_password: string;
  wp_table_prefix: string;
  api_token: string;
}

const DEFAULT_CONFIG: WPConfig = {
  wp_db_host: '34.174.19.215',
  wp_db_port: '3306',
  wp_db_name: 'dbsgpylt1rjqoi',
  wp_db_user: 'uvrx5d6hs4yle',
  wp_db_password: 'xxam486bq0wg',
  wp_table_prefix: 'anu_',
  api_token: '',
};

const ENDPOINTS = [
  { name: 'Clientes', method: 'GET', path: '/api/custom-module13/biury/clientes', status: 'active', description: 'Usuarios de WordPress que no sean administradores + metadatos' },
  { name: 'Pagos', method: 'GET', path: '/api/custom-module13/biury/pagos', status: 'inactive', description: 'Pagos registrados' },
  { name: 'Ventas', method: 'GET', path: '/api/custom-module13/biury/ventas', status: 'inactive', description: 'Ventas realizadas' },
];

export default function EndpointsAnaliticaBiury() {
  const [activeTab, setActiveTab] = useState<Tab>('modulos');
  const [config, setConfig] = useState<WPConfig>(DEFAULT_CONFIG);
  const [configMsg, setConfigMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesData, setClientesData] = useState<any>(null);
  const [clientesError, setClientesError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📊 Módulo Endpoints Analítica Biury cargado');
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/custom-module13/config');
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setConfigMsg('');
    try {
      const res = await fetch('/api/custom-module13/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigMsg('Configuración guardada correctamente');
      } else {
        setConfigMsg('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (e: any) {
      setConfigMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const getClientes = async () => {
    setClientesLoading(true);
    setClientesError(null);
    setClientesData(null);
    try {
      const res = await fetch('/api/custom-module13/biury/clientes');
      const data = await res.json();
      if (data.ok) {
        setClientesData(data);
      } else {
        setClientesError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setClientesError(e.message);
    } finally {
      setClientesLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {(['modulos', 'config', 'docs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'modulos' && 'Módulos'}
              {tab === 'config' && 'Configuración'}
              {tab === 'docs' && 'Documentación'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'modulos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ENDPOINTS.map((ep, idx) => (
              <div key={idx} className={`bg-white rounded-xl shadow-sm border p-6 ${
                ep.status === 'active' ? 'border-green-200 hover:border-green-400' : 'border-gray-200 opacity-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ep.method}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    ep.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ep.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{ep.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{ep.description}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">{ep.path}</code>
                {ep.status === 'active' && ep.name === 'Clientes' && (
                  <button
                    onClick={getClientes}
                    disabled={clientesLoading}
                    className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
                  >
                    {clientesLoading ? 'Cargando...' : 'Ejecutar'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {clientesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {clientesError}
            </div>
          )}

          {clientesData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Resultado</h3>
                <span className="text-sm text-gray-500">{clientesData.data?.length || 0} clientes</span>
              </div>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(clientesData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Configuración</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_host}
                onChange={(e) => setConfig({ ...config, wp_db_host: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Puerto</label>
              <input
                type="text"
                value={config.wp_db_port}
                onChange={(e) => setConfig({ ...config, wp_db_port: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_name}
                onChange={(e) => setConfig({ ...config, wp_db_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_user}
                onChange={(e) => setConfig({ ...config, wp_db_user: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña de Base de Datos</label>
              <input
                type="password"
                value={config.wp_db_password}
                onChange={(e) => setConfig({ ...config, wp_db_password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prefijo de Tablas</label>
              <input
                type="text"
                value={config.wp_table_prefix}
                onChange={(e) => setConfig({ ...config, wp_table_prefix: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">API Token</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Token para llamadas externas</label>
              <input
                type="text"
                value={config.api_token || ''}
                onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="Token requerido para llamadas externas"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            {configMsg && (
              <span className={`text-sm ${configMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {configMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Documentación</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Clientes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Obtiene los usuarios de WordPress que no sean administradores y sus metadatos.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Endpoint</h4>
                <code className="text-sm">GET /api/custom-module13/biury/clientes</code>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Parámetros</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 100)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Headers (para externo)</h4>
                <code className="text-sm">Authorization: Bearer {'<token>'}</code>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Ejemplo</h4>
                <div className="bg-gray-900 rounded-lg p-4 text-gray-100">
                  <pre className="text-xs overflow-auto">
{`curl -X GET "https://workers.zeroazul.com/api/custom-module13/biury/clientes?limit=10" \\
  -H "Authorization: Bearer TU_API_TOKEN"`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}