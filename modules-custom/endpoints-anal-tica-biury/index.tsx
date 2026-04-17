'use client';

import { useState, useEffect } from 'react';

interface BiuryEndpoint {
  name: string;
  description: string;
  method: 'GET' | 'POST';
  endpoint: string;
  status: 'active' | 'inactive';
}

export default function EndpointsAnaliticaBiury() {
  const [endpoints, setEndpoints] = useState<BiuryEndpoint[]>([
    { name: 'Get Pagos', description: 'Obtiene todos los pagos de Biury', method: 'GET', endpoint: '/api/custom-module13/biury/pagos', status: 'active' },
    { name: 'Get Ventas', description: 'Obtiene datos de ventas', method: 'GET', endpoint: '/api/custom-module13/biury/ventas', status: 'active' },
    { name: 'Get Clientes', description: 'Obtiene clientes de Biury', method: 'GET', endpoint: '/api/custom-module13/biury/clientes', status: 'inactive' },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<BiuryEndpoint | null>(null);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    console.log('📊 Módulo Endpoints Analítica Biury cargado');
  }, []);

  const testEndpoint = async (endpoint: BiuryEndpoint) => {
    setLoading(true);
    setSelectedEndpoint(endpoint);
    setResponse(null);
    try {
      const res = await fetch(endpoint.endpoint);
      const json = await res.json();
      setResponse(json);
    } catch (error: any) {
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Endpoints Analítica Biury</h1>
        <p className="text-indigo-100">Generador de endpoints para obtener datos de Biury de forma estructurada</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Endpoints Disponibles</h2>
          <div className="space-y-3">
            {endpoints.map((ep, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                      ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-medium text-gray-900">{ep.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    ep.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ep.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{ep.description}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ep.endpoint}</code>
                {ep.status === 'active' && (
                  <button
                    onClick={() => testEndpoint(ep)}
                    disabled={loading}
                    className="mt-2 ml-2 px-3 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    Probar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Respuesta</h2>
          {selectedEndpoint ? (
            <div>
              <div className="mb-2 text-sm text-gray-600">
                Endpoint: <code className="bg-gray-100 px-1 rounded">{selectedEndpoint.endpoint}</code>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cargando...
                </div>
              ) : response ? (
                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                  {JSON.stringify(response, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">Sin datos. Haz clic en "Probar" para ejecutar.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Selecciona un endpoint para probar</p>
          )}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-indigo-900 mb-1">Cómo funcionan los endpoints</h3>
            <p className="text-sm text-indigo-800">
              Los endpoints se definen en <code className="bg-indigo-100 px-1 rounded">modules-custom/endpoints-anal-tica-biury/api/</code> y pueden ser consumidos por sistemas externos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}