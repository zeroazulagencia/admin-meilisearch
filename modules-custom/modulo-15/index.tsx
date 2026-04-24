'use client';

import { useState, useEffect } from 'react';

const BASE_CONFIG = '/api/custom-module15/elreten-mipaquete-config';
const BASE_LOGS = '/api/custom-module15/elreten-mipaquete-logs';

export default function Modulo15Module({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
    folder_name: string;
    agent_name: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'config' | 'logs'>('inicio');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configForm, setConfigForm] = useState({
    api_key: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [testPayload, setTestPayload] = useState(JSON.stringify({
    rate: {
      origin: { postal_code: '110111', country: 'CO' },
      destination: { postal_code: '050001', country: 'CO', city: 'Medellin' },
      items: [
        { name: 'Producto X', quantity: 1, grams: 500, price: 100000 }
      ],
      currency: 'COP'
    }
  }, null, 2));

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE_CONFIG}`);
      const json = await res.json();
      if (json.ok && json.config) {
        setConfigForm({ api_key: json.config.api_key || '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${BASE_CONFIG}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      const json = await res.json();
      if (json.ok) {
        alert('Configuración guardada');
      } else {
        alert(json.error || 'Error al guardar');
      }
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const testRates = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = JSON.parse(testPayload);
      const res = await fetch('/api/custom-module15/elreten-mipaquete/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setTestResult({ status: res.status, ...json });
    } catch (e: any) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${BASE_LOGS}`);
      const json = await res.json();
      if (json.ok && json.logs) {
        setLogs(json.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'inicio' as const, label: 'Inicio' },
    { id: 'config' as const, label: 'Configuración' },
    { id: 'logs' as const, label: 'Logs' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Módulo 15 - ElReten MiPaquete Rates</h2>
          <div className="flex gap-1 border-b border-gray-200 mt-2">
            {tabs.map((t) => (
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

        {activeTab === 'inicio' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold mb-1">ElReten - MiPaquete Rates</h3>
              <p className="text-purple-100 text-sm">Cotizador de envíos para Shopify</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payload de prueba (JSON)</label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder='{"rate": {...}}'
              />
            </div>

            <button
              onClick={testRates}
              disabled={testing}
              className="px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 w-full"
            >
              {testing ? 'Probando...' : 'Probar Cotización'}
            </button>

            {testResult && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Resultado:</p>
                <pre className="text-xs font-mono overflow-auto max-h-60">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>Nota:</strong> El endpoint está disponible en:<br />
                <code className="bg-yellow-100 px-1 rounded">/api/custom-module15/elreten-mipaquete/rates</code>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Configuración</h3>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                API Key de MiPaquete
              </label>
              <input
                type="text"
                value={configForm.api_key}
                onChange={(e) => setConfigForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
            >
              {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Logs de Solicitudes</h3>

            {loadingLogs ? (
              <p>Cargando...</p>
            ) : logs.length === 0 ? (
              <p className="text-gray-500">No hay logs</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {logs.map((log: any, i: number) => (
                  <div key={i} className="p-2 bg-gray-50 rounded text-xs font-mono">
                    <p className="font-bold">{log.type}</p>
                    <p>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Sin fecha'}</p>
                    <pre>{JSON.stringify(log, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}