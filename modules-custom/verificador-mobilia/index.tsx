'use client';

import { useState, useEffect } from 'react';

const BASE = '/api/custom-module14/verificador-mobilia';

export default function VerificadorMobiliaModule({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
    folder_name: string;
    agent_name: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'config' | 'docs'>('inicio');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  
  const [configForm, setConfigForm] = useState({
    mobilia_subject: '',
    mobilia_api_url: 'http://bienraiz.mbp.com.co/bienraiz-mobilia/ws',
  });

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`);
      const json = await res.json();
      if (json.ok) {
        setConfig(json.config || {});
        setConfigForm({
          mobilia_subject: json.config.mobilia_subject || '',
          mobilia_api_url: json.config.mobilia_api_url || 'http://bienraiz.mbp.com.co/bienraiz-mobilia/ws',
        });
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
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
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

  const generateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch(`${BASE}/token?operation=generateToken`);
      const json = await res.json();
      if (json.ok && json.token) {
        setToken(json.token);
        alert('Token generado: ' + json.token);
      } else {
        alert(json.error || 'Error al generar token');
      }
    } catch (e) {
      alert('Error al generar token');
    } finally {
      setGeneratingToken(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'config') {
      loadConfig();
    }
  }, [activeTab]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Módulo Verificador Mobilia</h2>
          <div className="flex gap-1 border-b border-gray-200 mt-2">
            {([
              { id: 'inicio' as const, label: 'Inicio' },
              { id: 'config' as const, label: 'Configuración' },
              { id: 'docs' as const, label: 'Documentación' },
            ]).map((t) => (
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
          <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
            <h3 className="text-2xl font-bold mb-2">Verificador Mobilia</h3>
            <p className="text-green-100">Genera certificados de income de Mobilia</p>
            <button
              onClick={() => setActiveTab('config')}
              className="mt-4 px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50"
            >
              Ir a Configuración
            </button>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Configuración</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Subject (ID de usuario Mobilia)
              </label>
              <input
                type="text"
                value={configForm.mobilia_subject}
                onChange={(e) => setConfigForm(f => ({ ...f, mobilia_subject: e.target.value }))}
                placeholder="dae431d5af360988c18e8570ca728f0d6..."
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                URL del API Mobilia
              </label>
              <input
                type="text"
                value={configForm.mobilia_api_url}
                onChange={(e) => setConfigForm(f => ({ ...f, mobilia_api_url: e.target.value }))}
                placeholder="http://bienraiz.mbp.com.co/bienraiz-mobilia/ws"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity50"
            >
              {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
            </button>

            <hr className="my-4" />

            <h3 className="font-semibold text-gray-900">Generar Token</h3>
            <p className="text-sm text-gray-600">
              Genera un nuevo token de acceso JWT de Mobilia
            </p>
            <button
              onClick={generateToken}
              disabled={generatingToken || !config.mobilia_subject}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
            >
              {generatingToken ? 'Generando...' : 'Generar Token'}
            </button>
            {token && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                {token}
              </div>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Documentación - Verificador Mobilia
            </h3>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
              <p><strong>Uso:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Configura el Subject en la pestaña Configuración</li>
                <li>Guarda la configuración</li>
                <li>Genera un token JWT con el botón</li>
                <li>Usa el token para llamadas a la API de Mobilia</li>
              </ol>
              <p><strong>API:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code>GET /api/custom-module14/verificador-mobilia/config</code> - Obtener config</li>
                <li><code>PUT /api/custom-module14/verificador-mobilia/config</code> - Guardar config</li>
                <li><code>GET /api/custom-module14/verificador-mobilia/token?operation=generateToken</code> - Generar token</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}