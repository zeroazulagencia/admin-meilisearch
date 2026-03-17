'use client';

import { useState, useEffect } from 'react';

interface LogRow {
  id: number;
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  siigo_response: string | null;
  status: string;
  created_at: string;
  payload_raw?: string | null;
}

interface Stats {
  total: number;
  success: number;
  error: number;
  filtered: number;
}

const BASE = '/api/custom-module8/biury-pagos';
const WEBHOOK_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/module-webhooks/8/webhook`
  : 'https://workers.zeroazul.com/api/module-webhooks/8/webhook';
const PAGE_SIZE = 50;

export default function BiuryPagosModule({ moduleData }: { moduleData?: { title?: string } }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [activeTab, setActiveTab] = useState<'logs' | 'config' | 'documentacion'>('logs');
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ access_key: '', siigo_username: '', siigo_access_key: '' });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<LogRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [reprocessDetailLoading, setReprocessDetailLoading] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ payment_id: string; status: string; message?: string }>>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<Array<{ payment_id: string; status: string; message?: string }>>([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSample, setCodeSample] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const res = await fetch(`${BASE}?limit=${PAGE_SIZE}&offset=${offset}`);
      const json = await res.json();
      if (json.ok) {
        setLogs(json.data || []);
        setStats(json.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const json = await res.json();
      if (json.ok) setConfig(json.config || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { if (activeTab === 'logs') load(); }, [activeTab, page]);
  useEffect(() => { if (activeTab === 'config') loadConfig(); }, [activeTab]);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: configForm.access_key || null,
          siigo_username: configForm.siigo_username || null,
          siigo_access_key: configForm.siigo_access_key || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
        setShowConfig(false);
        setConfigForm({ access_key: '', siigo_username: '', siigo_access_key: '' });
      } else {
        alert(json.error || 'Error al guardar');
      }
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`);
      const json = await res.json();
      if (json.ok) setDetailData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailData(null);
  };

  const reprocessErrors = async () => {
    setReprocessLoading(true);
    try {
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, year: 2026 }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al reprocesar');
      }
      await load();
    } catch (e) {
      alert('Error al reprocesar');
    } finally {
      setReprocessLoading(false);
    }
  };

  const testAuth = async () => {
    setAuthLoading(true);
    setAuthResult(null);
    try {
      const res = await fetch(`${BASE}/test-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : await res.text();
      setAuthResult(payload);
      setShowAuthModal(true);
    } catch (e) {
      alert('Error al probar autenticacion');
    } finally {
      setAuthLoading(false);
    }
  };

  const reprocessDetail = async () => {
    if (!detailId) return;
    setReprocessDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailId }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al reprocesar');
      }
      await openDetail(detailId);
      await load();
    } catch (e) {
      alert('Error al reprocesar');
    } finally {
      setReprocessDetailLoading(false);
    }
  };

  const reprocessBulk = async () => {
    const ids = bulkIds
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (!ids.length) {
      alert('Ingresa al menos un ID de pago Treli');
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    try {
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: ids }),
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok || !payload?.ok) {
        const message = typeof payload === 'string' ? payload : payload?.error;
        alert(message || `Error al reprocesar (HTTP ${res.status})`);
        return;
      }
      setBulkResults(payload.results || []);
      await load();
    } catch (e) {
      alert('Error al reprocesar');
    } finally {
      setBulkLoading(false);
    }
  };

  const importLogs = async () => {
    if (!importFile) {
      alert('Selecciona un archivo .txt');
      return;
    }
    if (!importFile.name.toLowerCase().endsWith('.txt')) {
      alert('Solo se permite .txt');
      return;
    }
    if (importFile.size > 100 * 1024 * 1024) {
      alert('El archivo supera 100 MB');
      return;
    }

    setImportLoading(true);
    setImportResults([]);
    try {
      const content = await importFile.text();
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const chunkSize = 200;
      let allResults: Array<{ payment_id: string; status: string; message?: string }> = [];

      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize);
        const res = await fetch(`${BASE}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines: chunk }),
        });
        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok || !payload?.ok) {
          const message = typeof payload === 'string' ? payload : payload?.error;
          alert(message || `Error al importar (HTTP ${res.status})`);
          return;
        }
        allResults = allResults.concat(payload.results || []);
      }

      setImportResults(allResults);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al importar';
      alert(message);
      console.error(e);
    } finally {
      setImportLoading(false);
    }
  };

  const formatDate = (s: string) => {
    return new Date(s).toLocaleString('es-CO', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP' 
    }).format(n);
  };

  const formatGateway = (value: string | null | undefined, fallback = 'desconocida (treli)') => {
    if (!value) return fallback;
    const clean = String(value).trim();
    if (!clean || clean.toLowerCase() === 'unknown') return fallback;
    return clean;
  };

  const parseSiigoResponse = (raw?: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const buildCodeSample = () => {
    const username = config.siigo_username || 'TU_SIIGO_USERNAME';
    const accessKey = config.siigo_access_key || 'TU_SIIGO_ACCESS_KEY';
    const paymentId = `evt_${Math.random().toString(36).slice(2, 10)}`;
    const total = 266700;
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `curl -sS -X POST "https://api.siigo.com/auth" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Partner-Id: biury" \
  -H "User-Agent: Dworkers-Biury/1.0" \
  --data-raw '{"username":"${username}","access_key":"${accessKey}"}'

curl -sS -X POST "https://api.siigo.com/v1/vouchers" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Partner-Id: biury" \
  -H "User-Agent: Dworkers-Biury/1.0" \
  --data-raw '{"document":{"id":8923},"date":"${today}","type":"Detailed","customer":{"identification":"1090367807"},"items":[{"account":{"code":"11200501","movement":"Debit"},"description":"Wompi","value":"${total.toFixed(2)}"},{"account":{"code":"28050501","movement":"Credit"},"description":"Anticipos Clientes","value":"${total.toFixed(2)}","due":{"prefix":"CC","consecutive":"${paymentId}","quote":1,"date":"${due}"}}],"observations":"Treli Payment ID: ${paymentId}"}'`;
  };

  const parsePayload = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const source = parsed?.data ?? parsed;
      const item = Array.isArray(source?.items) && source.items.length ? source.items[0] : null;
      const items = Array.isArray(source?.items) ? source.items : [];
      const billing = source?.transaction?.transaction_billing || {};
      const customer = {
        first_name: billing.first_name || '',
        last_name: billing.last_name || '',
        email: source?.customer?.email || source?.billing?.email || '',
        phone: billing.phone || source?.customer?.phone || '',
        document:
          source?.billing?.document ||
          billing.identification ||
          source?.transaction?.billing?.document ||
          'unknown',
        address_1: billing.address_1 || source?.billing_address?.address_1 || '',
        address_2: billing.address_2 || source?.billing_address?.address_2 || '',
        city: billing.city || source?.billing_address?.city || '',
        state: billing.state || source?.billing_address?.state || '',
        country: billing.country || source?.billing_address?.country || '',
      };
      return {
        payment_id: source?.payment_id || source?.id || source?.transaction?.id || 'unknown',
        customer_document:
          source?.billing?.document ||
          source?.transaction?.transaction_billing?.identification ||
          source?.transaction?.billing?.document ||
          'unknown',
        product_name: item?.name || 'unknown',
        gateway:
          source?.payment_gateway_name ||
          source?.payment_method_gateway ||
          source?.transaction?.payment_method_gateway ||
          'unknown',
        total:
          source?.totals?.total ||
          source?.total ||
          source?.transaction?.amount ||
          item?.total ||
          0,
        customer,
        items,
      };
    } catch {
      return null;
    }
  };

  const tabs = [
    { id: 'logs', label: 'Logs' },
    { id: 'config', label: 'Configuración' },
    { id: 'documentacion', label: 'Documentación' },
  ] as const;

  return (
    <div className="space-y-6 p-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biury Pagos → Siigo</h1>
          <p className="text-sm text-gray-500 mt-1">Integración de pagos Treli al software contable Siigo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!Object.keys(config).length) {
                await loadConfig();
              }
              const sample = buildCodeSample();
              setCodeSample(sample);
              setShowCodeModal(true);
            }}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Reproceso masivo
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
          >
            Importar log
          </button>
          <button
            onClick={testAuth}
            disabled={authLoading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm disabled:opacity-50"
          >
            {authLoading ? 'Probando...' : 'Probar autenticacion'}
          </button>
          <button
            onClick={reprocessErrors}
            disabled={reprocessLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50"
          >
            {reprocessLoading ? 'Procesando...' : 'Procesar errores'}
          </button>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'logs' && (
        <>
          <div className="text-xs text-gray-500">
            Mostrando solo pagos BiuryBox Trimestre
          </div>
          {stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Errores</p>
                <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">Filtrados</p>
                <p className="text-2xl font-bold text-gray-400">{stats.filtered}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay registros</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{log.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.payment_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.product_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatGateway(log.gateway)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(log.total)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                            log.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openDetail(log.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {stats && stats.total > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Pagina {page} de {Math.max(1, Math.ceil(stats.total / PAGE_SIZE))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(stats.total / PAGE_SIZE)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuración</h2>
            <p className="text-sm text-gray-500">Las credenciales se almacenan encriptadas en la base de datos</p>
          </div>

          {!showConfig ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Access Key (Webhook)</p>
                  <p className="text-xs text-gray-500">{config.access_key || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Usuario Siigo</p>
                  <p className="text-xs text-gray-500">{config.siigo_username || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Access Key Siigo</p>
                  <p className="text-xs text-gray-500">{config.siigo_access_key || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Key
                </label>
                <input
                  type="password"
                  value={configForm.access_key}
                  onChange={(e) => setConfigForm({ ...configForm, access_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Nueva access key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario Siigo
                </label>
                <input
                  type="text"
                  value={configForm.siigo_username}
                  onChange={(e) => setConfigForm({ ...configForm, siigo_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Usuario de Siigo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Key Siigo
                </label>
                <input
                  type="password"
                  value={configForm.siigo_access_key}
                  onChange={(e) => setConfigForm({ ...configForm, siigo_access_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Access Key de Siigo"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setShowConfig(false); setConfigForm({ access_key: '', siigo_username: '', siigo_access_key: '' }); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentacion' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Biury Pagos → Siigo (Módulo 8)</h2>
            <p className="text-sm text-gray-500">
              Recibe webhooks de Treli (pagos WooCommerce), filtra productos "BiuryBox Trimestre" 
              y crea comprobantes contables en Siigo.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Flujo de procesamiento</p>
            <div className="space-y-3">
              {[
                { paso: '01', titulo: 'Webhook recibido', desc: 'POST al webhook /8/webhook con payload de Treli. Se extrae content del body.' },
                { paso: '02', titulo: 'Filtrar producto', desc: 'Se verifica si el primer item del pedido contiene "BiuryBox Trimestre". Si no, se marca como filtrado (no error).' },
                { paso: '03', titulo: 'Validar acceso', desc: 'Se valida email (administrativa@biury.co) y access_key contra la config.' },
                { paso: '04', titulo: 'Crear voucher Siigo', desc: 'Se arma el payload del comprobante:\n- Wompi → cuenta 11200501 (débito)\n- MercadoPago → cuenta 11100501 (débito)\n- Contra-partida: 28050501 (Anticipos Clientes) a 3 meses\n- Cliente: identificación del billing\n- Observaciones: Treli Payment ID' },
                { paso: '05', titulo: 'Guardar log', desc: 'Se registra en modulos_biury_8_logs con status success/error/filtered y la respuesta de Siigo.' },
              ].map(({ paso, titulo, desc }) => (
                <div key={paso} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{paso}</span>
                  </div>
                  <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Webhook</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`POST ${WEBHOOK_URL}
Content-Type: application/json

{
  "content": {
    "payment_id": "treli_123",
    "billing": { "document": "12345678" },
    "payment_gateway_name": "Wompi",
    "totals": { "total": 299000 },
    "items": [{ "name": "BiuryBox Trimestre" }]
  }
}`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rutas del módulo</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`GET  ${BASE}                    Listado de logs
GET  ${BASE}/[id]               Detalle de un registro
GET  ${BASE}/config             Config (enmascarada)
PUT  ${BASE}/config             Actualizar config`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tablas</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`modulos_biury_8_config       access_key
modulos_biury_8_logs          Registros de pagos`}
            </pre>
          </div>
        </div>
      )}

      {detailId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-500 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Detalle del registro</h2>
                  <p className="text-blue-100 font-mono text-sm">#{detailId}</p>
                </div>
                <button
                  onClick={reprocessDetail}
                  disabled={reprocessDetailLoading}
                  className="px-3 py-2 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30 disabled:opacity-50"
                >
                  {reprocessDetailLoading ? 'Reprocesando...' : 'Reprocesar en Siigo'}
                </button>
                <button
                  onClick={closeDetail}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {detailLoading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : detailData ? (
                <div className="space-y-4">
                  {detailData.payload_raw && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Datos Treli (payload)</p>
                      {(() => {
                        const payload = parsePayload(detailData.payload_raw);
                        if (!payload) return <p className="text-sm text-gray-500">Payload no disponible</p>;
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Payment ID</p>
                              <p className="text-sm font-mono text-gray-900">{payload.payment_id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Documento</p>
                              <p className="text-sm font-mono text-gray-900">{payload.customer_document}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Producto</p>
                              <p className="text-sm text-gray-900">{payload.product_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Gateway</p>
                              <p className="text-sm text-gray-900">{formatGateway(payload.gateway)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Total</p>
                              <p className="text-sm text-gray-900">{formatCurrency(Number(payload.total))}</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Cliente</p>
                              <p className="text-sm text-gray-900">
                                {[payload.customer?.first_name, payload.customer?.last_name]
                                  .filter(Boolean)
                                  .join(' ') || 'Sin nombre'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Documento</p>
                              <p className="text-sm font-mono text-gray-900">{payload.customer?.document || 'unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Email</p>
                              <p className="text-sm text-gray-900">{payload.customer?.email || 'Sin email'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Telefono</p>
                              <p className="text-sm text-gray-900">{payload.customer?.phone || 'Sin telefono'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 uppercase">Direccion</p>
                              <p className="text-sm text-gray-900">
                                {[payload.customer?.address_1, payload.customer?.address_2].filter(Boolean).join(' ') || 'Sin direccion'}
                                {payload.customer?.city ? `, ${payload.customer.city}` : ''}
                                {payload.customer?.state ? `, ${payload.customer.state}` : ''}
                                {payload.customer?.country ? `, ${payload.customer.country}` : ''}
                              </p>
                            </div>
                          </div>
                          {Array.isArray(payload.items) && payload.items.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-2">Productos</p>
                              <div className="divide-y divide-gray-200 border border-gray-100 rounded-lg">
                                {payload.items.map((item: any, index: number) => (
                                  <div key={`${item?.id || index}`} className="p-3 grid grid-cols-4 gap-3 text-sm">
                                    <div className="col-span-2 text-gray-900">
                                      <div>{item?.name || 'Producto'}</div>
                                      <div className="text-xs text-gray-500">
                                        SKU: {item?.product?.product_invoicing_id || item?.product?.product_merchant_id || 'Sin SKU'}
                                      </div>
                                    </div>
                                    <div className="text-gray-600">x{item?.quantity || 1}</div>
                                    <div className="text-gray-900 text-right">
                                      {formatCurrency(Number(item?.total || item?.subtotal || item?.unit_price || 0))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Payment ID</p>
                      <p className="text-sm font-mono text-gray-900">{detailData.payment_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Documento</p>
                      <p className="text-sm font-mono text-gray-900">{detailData.customer_document}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Producto</p>
                      <p className="text-sm text-gray-900">{detailData.product_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Gateway</p>
                      <p className="text-sm text-gray-900">{formatGateway(detailData.gateway, 'desconocida')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total</p>
                      <p className="text-sm text-gray-900">{formatCurrency(detailData.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Estado</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        detailData.status === 'success' ? 'bg-green-100 text-green-800' :
                        detailData.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {detailData.status}
                      </span>
                    </div>
                  </div>
                  {detailData.siigo_response && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Respuesta Siigo</p>
                      {(() => {
                        const response = parseSiigoResponse(detailData.siigo_response);
                        if (!response) {
                          return <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{detailData.siigo_response}</pre>;
                        }
                        const status = response.status;
                        const contentType = response.contentType;
                        const isHtml = typeof response.body === 'string' && response.body.trim().startsWith('<');
                        return (
                          <div className="space-y-3">
                            <div className="text-xs text-gray-500">
                              Estado HTTP: <span className="font-mono">{status ?? 'N/A'}</span>
                              {contentType ? ` · ${contentType}` : ''}
                            </div>
                            {isHtml ? (
                              <iframe
                                title="Siigo HTML"
                                srcDoc={response.body}
                                className="w-full h-64 border border-gray-200 rounded-lg"
                                sandbox=""
                              />
                            ) : response.data ? (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">
{JSON.stringify(response.data, null, 2)}
                              </pre>
                            ) : response.body ? (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{response.body}</pre>
                            ) : (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{detailData.siigo_response}</pre>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {detailData.siigo_response && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Respuesta Siigo</p>
                      <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
                        {detailData.siigo_response}
                      </pre>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Fecha</p>
                    <p className="text-sm text-gray-900">{formatDate(detailData.created_at)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">Error al cargar detalle</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">CODE</h2>
                  <p className="text-gray-300 text-sm">Copia y pega desde tu terminal local</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeSample || '');
                      } catch (e) {
                        alert('No se pudo copiar');
                      }
                    }}
                    className="px-3 py-2 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{codeSample}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-500 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Reproceso masivo</h2>
                  <p className="text-blue-100 text-sm">IDs de pago Treli separados por coma o salto de linea</p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={bulkIds}
                onChange={(e) => setBulkIds(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="col_TyT.."
              />
              <div className="flex justify-end">
                <button
                  onClick={reprocessBulk}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {bulkLoading ? 'Reprocesando...' : 'Reprocesar IDs'}
                </button>
              </div>
              {bulkResults.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {bulkResults.map((result) => (
                    <div key={result.payment_id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="font-mono text-gray-700">{result.payment_id}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'success' ? 'bg-green-100 text-green-700' :
                          result.status === 'filtered' ? 'bg-gray-100 text-gray-600' :
                          result.status === 'not_found' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.status}
                        </span>
                        {result.message && (
                          <span className="text-xs text-gray-500 max-w-[320px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Importar log</h2>
                  <p className="text-gray-300 text-sm">Archivo .txt con un JSON por linea (max 100 MB)</p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="file"
                accept=".txt"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <div className="flex justify-end">
                <button
                  onClick={importLogs}
                  disabled={importLoading}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-black disabled:opacity-50"
                >
                  {importLoading ? 'Importando...' : 'Importar'}
                </button>
              </div>
              {importResults.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {importResults.map((result) => (
                    <div key={result.payment_id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="font-mono text-gray-700">{result.payment_id}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'created' ? 'bg-green-100 text-green-700' :
                          result.status === 'updated' ? 'bg-blue-100 text-blue-700' :
                          result.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.status}
                        </span>
                        {result.message && (
                          <span className="text-xs text-gray-500 max-w-[320px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Probar autenticacion</h2>
                  <p className="text-gray-300 text-sm">Siigo auth request/response</p>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {authResult ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Request</p>
                    <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{typeof authResult === 'string' ? authResult : JSON.stringify(authResult.request || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Response</p>
                    <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{typeof authResult === 'string' ? authResult : JSON.stringify(authResult.response || authResult, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Sin respuesta</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
