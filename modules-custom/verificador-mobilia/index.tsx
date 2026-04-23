'use client';

import { useState, useEffect } from 'react';

const BASE_CONFIG = '/api/custom-module13/mobilia-config';
const BASE_TOKEN = '/api/custom-module13/mobilia-token';
const BASE_CERT = '/api/custom-module13/mobilia-certificate';
const BASE_LOGS = '/api/custom-module13/mobilia-logs';

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
  const [activeTab, setActiveTab] = useState<'inicio' | 'config' | 'logs' | 'docs'>('inicio');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [certResult, setCertResult] = useState<any>(null);
  const [checkingCert, setCheckingCert] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [certForm, setCertForm] = useState({
    documentCode: '',
    year: '2025',
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingToken(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certForm.documentCode) {
      alert('Ingresa el código del documento');
      return;
    }
    setCheckingCert(true);
    setCertResult(null);
    try {
      const url = `${BASE_CERT}?operation=getIncomeCertificate&year=${certForm.year}&documentCode=${certForm.documentCode}`;
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('pdf')) {
        const blob = await res.blob();
        if (blob.size > 100) {
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `certificado_${certForm.documentCode}_${certForm.year}.pdf`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          setCertResult({ ok: true, message: 'PDF descargado', fileSize: blob.size });
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
    { id: 'docs' as const, label: 'Docs' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Módulo Verificador Mobilia Certificados</h2>
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
            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold mb-1">Verificador Mobilia Certificados</h3>
              <p className="text-green-100 text-sm">Valida y descarga certificados de income</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-1">Subject (ID de usuario Mobilia)</p>
              <p className="text-sm font-mono break-all">{config.mobilia_subject || 'No configurado'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Documento</label>
                <input
                  type="text"
                  value={certForm.documentCode}
                  onChange={(e) => setCertForm(f => ({ ...f, documentCode: e.target.value }))}
                  placeholder="43724622"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
                <select
                  value={certForm.year}
                  onChange={(e) => setCertForm(f => ({ ...f, year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
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
                onClick={downloadCertificate}
                disabled={checkingCert || !config.mobilia_subject || !certForm.documentCode}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {checkingCert ? 'Descargando...' : 'Descargar PDF'}
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
                <p className="text-xs font-medium text-gray-500 mb-1">Respuesta Completa:</p>
                <pre className="text-xs font-mono overflow-auto max-h-60">
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

        {activeTab === 'logs' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Logs de Pruebas</h3>
            
            {loadingLogs ? (
              <p>Cargando...</p>
            ) : logs.length === 0 ? (
              <p className="text-gray-500">No hay logs</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {logs.map((log: any, i: number) => (
                  <div key={i} className="p-2 bg-gray-50 rounded text-xs font-mono">
                    <p className="font-bold">{log.type}</p>
                    <p>{new Date(log.timestamp).toLocaleString()}</p>
                    <pre>{JSON.stringify(log, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Documentación - Verificador Mobilia Certificados
            </h3>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
              <p><strong>Uso:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Configura el Subject en la pestaña Configuración</li>
                <li>Guarda la configuración</li>
                <li>En Inicio, genera un token y descarga el PDF</li>
                <li>Revisa los logs en la pestaña Logs</li>
              </ol>
              <p><strong>API:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code>GET /api/custom-module13/mobilia-config</code> - Obtener config</li>
                <li><code>PUT /api/custom-module13/mobilia-config</code> - Guardar config</li>
                <li><code>GET /api/custom-module13/mobilia-token?operation=generateToken</code> - Generar token</li>
                <li><code>GET /api/custom-module13/mobilia-certificate?operation=getIncomeCertificate&amp;year=2025&amp;documentCode=43724622</code> - Descargar PDF</li>
                <li><code>GET /api/custom-module13/mobilia-logs</code> - Obtener logs</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}