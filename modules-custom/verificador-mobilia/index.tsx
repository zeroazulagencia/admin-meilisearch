'use client';

import { useState, useEffect } from 'react';

const BASE = '/api/custom-module13/mobilia';
const BASE_CONFIG = '/api/custom-module13/mobilia-config';
const BASE_TOKEN = '/api/custom-module13/mobilia-token';
const BASE_CERT = '/api/custom-module13/mobilia-certificate';

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
  const [certResult, setCertResult] = useState<any>(null);
  const [checkingCert, setCheckingCert] = useState(false);
  const [certForm, setCertForm] = useState({
    documentCode: '',
    year: '2024',
  });
  
  const [configForm, setConfigForm] = useState({
    mobilia_subject: '',
  });

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE_CONFIG}`);
      const json = await res.json();
      if (json.ok) {
        setConfig(json.config || {});
        setConfigForm({
          mobilia_subject: json.config.mobilia_subject || '',
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
      const res = await fetch(`${BASE_CONFIG}`, {
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
      const res = await fetch(`${BASE_TOKEN}?operation=generateToken`);
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

  const testCertificate = async () => {
    if (!certForm.documentCode) {
      alert('Ingresa el código del documento');
      return;
    }
    setCheckingCert(true);
    setCertResult(null);
    try {
      const res = await fetch(`${BASE_CERT}?operation=getIncomeCertificate&year=${certForm.year}&documentCode=${certForm.documentCode}`);
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('pdf') || res.ok) {
        const blob = await res.blob();
        if (blob.size > 100) {
          setCertResult({ ok: true, message: 'PDF DESCARGADO', fileSize: blob.size });
        } else {
          const json = await res.json();
          setCertResult(json);
        }
      } else {
        const json = await res.json();
        setCertResult(json);
      }
    } catch (e: any) {
      setCertResult({ ok: false, error: e.message });
    } finally {
      setCheckingCert(false);
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
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Verificador Mobilia</h3>
              <p className="text-green-100">Valida documentos de Mobilia</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Documento</label>
                <input
                  type="text"
                  value={certForm.documentCode}
                  onChange={(e) => setCertForm(f => ({ ...f, documentCode: e.target.value }))}
                  placeholder="437246622"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
                <input
                  type="text"
                  value={certForm.year}
                  onChange={(e) => setCertForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={generateToken}
                disabled={generatingToken || !config.mobilia_subject}
                className="px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {generatingToken ? 'Generando...' : 'Generar Token'}
              </button>
              
              <button
                onClick={testCertificate}
                disabled={checkingCert || !config.mobilia_subject || !certForm.documentCode}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {checkingCert ? 'Verificando...' : 'Verificar Certificate'}
              </button>
            </div>

            {token && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Token:</p>
                <p className="text-xs font-mono break-all">{token}</p>
              </div>
            )}

            {certResult && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Resultado:</p>
                <pre className="text-xs font-mono overflow-auto max-h-40">
                  {JSON.stringify(certResult, null, 2)}
                </pre>
              </div>
            )}
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

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
            </button>
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
                <li>En Inicio, genera un token y prueba el certificate</li>
              </ol>
              <p><strong>API:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code>GET /api/custom-module13/mobilia-config</code> - Obtener config</li>
                <li><code>PUT /api/custom-module13/mobilia-config</code> - Guardar config</li>
                <li><code>GET /api/custom-module13/mobilia-token?operation=generateToken</code> - Generar token</li>
                <li><code>GET /api/custom-module13/mobilia-certificate?operation=getIncomeCertificate&amp;year=2025&amp;documentCode=437246622</code> - Obtener certificate</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}