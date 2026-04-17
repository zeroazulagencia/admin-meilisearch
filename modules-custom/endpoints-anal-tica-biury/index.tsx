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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Clientes</h2>
            <button
              onClick={getClientes}
              disabled={clientesLoading}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {clientesLoading ? 'Cargando...' : 'Obtener Clientes'}
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Obtiene los usuarios de WordPress que no sean administradores y sus metadatos.
          </p>

          {clientesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {clientesError}
            </div>
          )}

          {clientesData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                Total clientes: {clientesData.data?.length || 0}
              </p>
              <pre className="text-xs bg-white p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(clientesData, null, 2)}
              </pre>
            </div>
          )}

          {!clientesLoading && !clientesData && !clientesError && (
            <div className="text-center py-12 text-gray-500">
              Haz clic en "Obtener Clientes" para ver los datos
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Configuración</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configura las credenciales de la base de datos y el API token.
          </p>

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

          <div className="border-t border-gray-200 pt-6">
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
              <p className="text-xs text-gray-500 mt-1">
                Este token se debe enviar en el header Authorization: Bearer {`<token>`}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
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
          
          <div className="prose prose-sm max-w-none space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Clientes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Obtiene los usuarios de WordPress que no sean administradores (role != 'administrator') y sus metadatos.
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Endpoint</h4>
                <code className="text-sm">GET /api/custom-module13/biury/clientes</code>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Parámetros</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 100)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Headers requeridos (para llamadas externas)</h4>
                <code className="text-sm">Authorization: Bearer {'<api_token>'}</code>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Respuesta</h4>
                <pre className="text-xs bg-white p-4 rounded overflow-auto max-h-64">
{`{
  "ok": true,
  "data": [
    {
      "ID": "123",
      "user_login": "cliente1",
      "user_email": "cliente1@email.com",
      "display_name": "Juan Perez",
      "user_registered": "2024-01-15 10:30:00",
      "meta": {
        "billing_first_name": "Juan",
        "billing_last_name": "Perez",
        "billing_phone": "+573001234567"
      }
    }
  ],
  "total": 50
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Llamadas desde externo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Para hacer llamadas desde sistemas externos, necesitas configurar el API Token en la pestaña Configuración y enviarlo en el header Authorization.
              </p>

              <div className="bg-gray-900 rounded-lg p-4 text-gray-100">
                <pre className="text-xs overflow-auto">
{`curl -X GET "https://workers.zeroazul.com/api/custom-module13/biury/clientes?limit=10" \\
  -H "Authorization: Bearer TU_API_TOKEN"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}