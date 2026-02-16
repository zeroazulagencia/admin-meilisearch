'use client';

import { useState, useEffect } from 'react';

export default function EjemploDashboard() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchExternalData = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📊 Módulo Ejemplo Dashboard cargado');
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Ejemplo Dashboard</h1>
        <p className="text-blue-100">Este es un módulo de ejemplo completamente independiente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Contador Local</div>
          <div className="text-3xl font-bold text-gray-900">{count}</div>
          <button
            onClick={() => setCount(count + 1)}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Incrementar
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Estado</div>
          <div className="text-xl font-semibold text-green-600">✅ Activo</div>
          <div className="mt-2 text-sm text-gray-500">Módulo funcionando correctamente</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">API Externa</div>
          <button
            onClick={fetchExternalData}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Probar API'}
          </button>
        </div>
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">📡 Datos de API Externa</h2>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-sm text-gray-700 overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">✨ Características</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Módulo completamente independiente</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>No afecta el sistema global</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Puede consumir APIs externas</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Carga dinámica con hot-reload</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Estilos y lógica propios</span>
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Desarrollo de Módulos</h3>
            <p className="text-sm text-blue-800">
              Cada módulo vive en <code className="bg-blue-100 px-1 rounded">modules-custom/[folder-name]/</code> y puede tener
              su propia lógica, estilos y dependencias sin afectar otros módulos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
