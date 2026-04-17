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
}

const DEFAULT_CONFIG: WPConfig = {
  wp_db_host: '34.174.19.215',
  wp_db_port: '3306',
  wp_db_name: 'dbsgpylt1rjqoi',
  wp_db_user: 'uvrx5d6hs4yle',
  wp_db_password: 'xxam486bq0wg',
  wp_table_prefix: 'anu_',
};

export default function EndpointsAnaliticaBiury() {
  const [activeTab, setActiveTab] = useState<Tab>('modulos');
  const [config, setConfig] = useState<WPConfig>(DEFAULT_CONFIG);
  const [configMsg, setConfigMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('📊 Módulo Endpoints Analítica Biury cargado');
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

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">📊 Endpoints Analítica Biury</h1>
        <p className="text-indigo-100">Generador de endpoints para obtener datos de Biury de forma estructurada</p>
      </div>

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
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Endpoints de Biury</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Pagos', method: 'GET', path: '/api/custom-module13/biury/pagos', status: 'active' },
              { name: 'Ventas', method: 'GET', path: '/api/custom-module13/biury/ventas', status: 'active' },
              { name: 'Clientes', method: 'GET', path: '/api/custom-module13/biury/clientes', status: 'active' },
              { name: 'Productos', method: 'GET', path: '/api/custom-module13/biury/productos', status: 'inactive' },
              { name: 'Pedidos', method: 'GET', path: '/api/custom-module13/biury/pedidos', status: 'inactive' },
              { name: 'Suscripciones', method: 'GET', path: '/api/custom-module13/biury/suscripciones', status: 'inactive' },
            ].map((ep, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
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
                <p className="font-medium text-gray-900 mb-1">{ep.name}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">{ep.path}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Configuración de WordPress</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configura las credenciales de la base de datos de WordPress para conectar a Biury.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_host}
                onChange={(e) => setConfig({ ...config, wp_db_host: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="34.174.19.215"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Puerto</label>
              <input
                type="text"
                value={config.wp_db_port}
                onChange={(e) => setConfig({ ...config, wp_db_port: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="3306"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_name}
                onChange={(e) => setConfig({ ...config, wp_db_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="dbsgpylt1rjqoi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_user}
                onChange={(e) => setConfig({ ...config, wp_db_user: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="uvrx5d6hs4yle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña de Base de Datos</label>
              <input
                type="password"
                value={config.wp_db_password}
                onChange={(e) => setConfig({ ...config, wp_db_password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="xxam486bq0wg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prefijo de Tablas</label>
              <input
                type="text"
                value={config.wp_table_prefix}
                onChange={(e) => setConfig({ ...config, wp_table_prefix: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                placeholder="anu_"
              />
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
          
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-semibold mb-2">Endpoints Disponibles</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700">GET</span>
                  <code className="text-sm">/api/custom-module13/biury/pagos</code>
                </div>
                <p className="text-sm text-gray-600">Obtiene todos los pagos registrados en WordPress</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700">GET</span>
                  <code className="text-sm">/api/custom-module13/biury/ventas</code>
                </div>
                <p className="text-sm text-gray-600">Obtiene las ventas realizadas</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700">GET</span>
                  <code className="text-sm">/api/custom-module13/biury/clientes</code>
                </div>
                <p className="text-sm text-gray-600">Obtiene los clientes registrados</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-2">Conexión a WordPress</h3>
            <p className="text-sm text-gray-600 mb-4">
              Este módulo se conecta a la base de datos de WordPress de Biury para obtener datos estructurados.
              Las credenciales se configuran en la pestaña "Configuración".
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">Tablas Utilizadas</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><code>anu_posts</code> - Pedidos/Productos</li>
              <li><code>anu_postmeta</code> - Metadatos de pedidos</li>
              <li><code>anu_users</code> - Usuarios/Clientes</li>
              <li><code>anu_usermeta</code> - Metadatos de usuarios</li>
              <li><code>anu_wc_orders</code> - Órdenes de WooCommerce</li>
              <li><code>anu_wc_order_stats</code> - Estadísticas de órdenes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}