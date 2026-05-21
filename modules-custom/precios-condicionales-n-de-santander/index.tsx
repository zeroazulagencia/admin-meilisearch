'use client';

import { useEffect, useMemo, useState } from 'react';

const BASE = '/api/custom-module17/precios-condicionales-n-de-santander';

type TabId = 'inicio' | 'config' | 'logs' | 'docs';

type ConfigState = {
  enabled: boolean;
  target_country_code: string;
  target_state: string;
  discount_type: 'percentage' | 'fixed_per_item';
  discount_value: string;
  require_shipping_match: boolean;
  state_aliases: string;
  ipwhois_base_url: string;
  shopify_shop_domain: string;
  shopify_admin_access_token: string;
  shopify_api_key: string;
  shopify_api_secret: string;
  shopify_webhook_secret: string;
  shopify_bridge_secret: string;
  shopify_storefront_access_token: string;
};

type SensitivePreview = {
  shopify_admin_access_token: string;
  shopify_api_key: string;
  shopify_api_secret: string;
  shopify_webhook_secret: string;
  shopify_bridge_secret: string;
  shopify_storefront_access_token: string;
};

type DecisionLog = {
  id: number;
  event_type: string;
  ip_address: string | null;
  resolved_state: string | null;
  resolved_country_code: string | null;
  shipping_state: string | null;
  shipping_country_code: string | null;
  applied: boolean;
  reason: string | null;
  created_at: string;
};

const DEFAULT_CONFIG: ConfigState = {
  enabled: false,
  target_country_code: 'CO',
  target_state: 'Norte de Santander',
  discount_type: 'percentage',
  discount_value: '0',
  require_shipping_match: true,
  state_aliases: '["Norte de Santander","N. de Santander","Norte Santander"]',
  ipwhois_base_url: 'https://ipwho.is',
  shopify_shop_domain: '',
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
};

const DEFAULT_SENSITIVE_PREVIEW: SensitivePreview = {
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
};

export default function PreciosCondicionalesNDeSantanderModule({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [testingShopify, setTestingShopify] = useState(false);
  const [shopifyTestResult, setShopifyTestResult] = useState<any>(null);
  const [sensitivePreview, setSensitivePreview] = useState<SensitivePreview>(DEFAULT_SENSITIVE_PREVIEW);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    ip: '181.57.0.1',
    shipping_state: 'Norte de Santander',
    shipping_country_code: 'CO',
    cart_id: 'gid://shopify/Cart/example',
  }, null, 2));
  const [testResult, setTestResult] = useState<any>(null);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'config', label: 'Configuración' },
    { id: 'logs', label: 'Logs' },
    { id: 'docs', label: 'Documentación' },
  ];

  const shippingRuleLabel = useMemo(
    () => (config.require_shipping_match ? 'Obligatorio' : 'Opcional'),
    [config.require_shipping_match]
  );

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.config) {
        setSensitivePreview({
          shopify_admin_access_token: String(json.config.shopify_admin_access_token || ''),
          shopify_api_key: String(json.config.shopify_api_key || ''),
          shopify_api_secret: String(json.config.shopify_api_secret || ''),
          shopify_webhook_secret: String(json.config.shopify_webhook_secret || ''),
          shopify_bridge_secret: String(json.config.shopify_bridge_secret || ''),
          shopify_storefront_access_token: String(json.config.shopify_storefront_access_token || ''),
        });

        setConfig((prev) => ({
          ...prev,
          enabled: json.config.enabled === '1' || json.config.enabled === true,
          target_country_code: String(json.config.target_country_code || 'CO'),
          target_state: String(json.config.target_state || 'Norte de Santander'),
          discount_type: json.config.discount_type === 'fixed_per_item' ? 'fixed_per_item' : 'percentage',
          discount_value: String(json.config.discount_value ?? '0'),
          require_shipping_match: json.config.require_shipping_match !== '0' && json.config.require_shipping_match !== false,
          state_aliases: String(json.config.state_aliases || DEFAULT_CONFIG.state_aliases),
          ipwhois_base_url: String(json.config.ipwhois_base_url || 'https://ipwho.is'),
          shopify_shop_domain: String(json.config.shopify_shop_domain || ''),
          shopify_admin_access_token: '',
          shopify_api_key: '',
          shopify_api_secret: '',
          shopify_webhook_secret: '',
          shopify_bridge_secret: '',
          shopify_storefront_access_token: '',
        }));
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${BASE}/logs?limit=100`, { cache: 'no-store' });
      const json = await res.json();
      setLogs(json.ok && Array.isArray(json.logs) ? json.logs : []);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const saveConfig = async () => {
    setSavingConfig(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const parsedAliases = JSON.parse(config.state_aliases || '[]');
      const payload: any = {
        enabled: config.enabled,
        target_country_code: config.target_country_code,
        target_state: config.target_state,
        discount_type: config.discount_type,
        discount_value: Number(config.discount_value || 0),
        require_shipping_match: config.require_shipping_match,
        state_aliases: Array.isArray(parsedAliases) ? parsedAliases : [],
        ipwhois_base_url: config.ipwhois_base_url,
        shopify_shop_domain: config.shopify_shop_domain,
      };
      if (config.shopify_admin_access_token.trim()) payload.shopify_admin_access_token = config.shopify_admin_access_token.trim();
      if (config.shopify_api_key.trim()) payload.shopify_api_key = config.shopify_api_key.trim();
      if (config.shopify_api_secret.trim()) payload.shopify_api_secret = config.shopify_api_secret.trim();
      if (config.shopify_webhook_secret.trim()) payload.shopify_webhook_secret = config.shopify_webhook_secret.trim();
      if (config.shopify_bridge_secret.trim()) payload.shopify_bridge_secret = config.shopify_bridge_secret.trim();
      if (config.shopify_storefront_access_token.trim()) payload.shopify_storefront_access_token = config.shopify_storefront_access_token.trim();

      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'No se pudo guardar');
      await loadConfig();
      setSaveMessage('Configuración guardada');
    } catch (e: any) {
      setSaveError(e?.message || 'Error guardando configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = JSON.parse(testPayload);
      const res = await fetch(`${BASE}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setTestResult({ status: res.status, ...json });
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || 'Error en prueba' });
    } finally {
      setTesting(false);
    }
  };

  const testShopifyConnection = async () => {
    setTestingShopify(true);
    setShopifyTestResult(null);
    try {
      const res = await fetch(`${BASE}/test-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      setShopifyTestResult({ status: res.status, ...json });
    } catch (e: any) {
      setShopifyTestResult({ ok: false, error: e?.message || 'Error verificando conexión Shopify' });
    } finally {
      setTestingShopify(false);
    }
  };

  const Field = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{moduleData?.title || 'precios-condicionales-n-de-santander'}</h2>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'inicio' && (
        <div className="space-y-4">
          {loadingConfig ? (
            <div className="text-sm text-gray-500">Cargando configuración...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 border rounded p-3">Estado: <b>{config.enabled ? 'Activo' : 'Inactivo'}</b></div>
              <div className="bg-gray-50 border rounded p-3">País objetivo: <b>{config.target_country_code}</b></div>
              <div className="bg-gray-50 border rounded p-3">Estado objetivo: <b>{config.target_state}</b></div>
              <div className="bg-gray-50 border rounded p-3">Regla envío: <b>{shippingRuleLabel}</b></div>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-800">Prueba rápida del evaluate</h3>
            <textarea
              className="w-full min-h-[180px] px-3 py-2 border border-gray-300 rounded text-xs font-mono"
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
            />
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {testing ? 'Probando...' : 'Ejecutar prueba'}
            </button>
            {testResult && (
              <pre className="text-xs bg-gray-900 text-green-300 p-3 rounded overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          {loadingConfig ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Módulo habilitado"
                  description="Activa o desactiva la evaluación del descuento en checkout. Si está apagado, siempre responde sin descuento."
                >
                  <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
                </Field>
                <Field
                  label="Requerir match shipping"
                  description="Si está activo, además de la IP también exige que la dirección de envío coincida con país/estado objetivo."
                >
                  <input type="checkbox" checked={config.require_shipping_match} onChange={(e) => setConfig({ ...config, require_shipping_match: e.target.checked })} />
                </Field>
                <Field label="País objetivo"><input className="w-full px-3 py-2 border rounded" value={config.target_country_code} onChange={(e) => setConfig({ ...config, target_country_code: e.target.value })} /></Field>
                <Field label="Estado objetivo"><input className="w-full px-3 py-2 border rounded" value={config.target_state} onChange={(e) => setConfig({ ...config, target_state: e.target.value })} /></Field>
                <Field
                  label="Tipo descuento"
                  description="percentage: aplica un porcentaje sobre el precio. fixed_per_item: descuenta un valor fijo por ítem."
                >
                  <select className="w-full px-3 py-2 border rounded" value={config.discount_type} onChange={(e) => setConfig({ ...config, discount_type: e.target.value as ConfigState['discount_type'] })}>
                    <option value="percentage">percentage</option>
                    <option value="fixed_per_item">fixed_per_item</option>
                  </select>
                </Field>
                <Field
                  label="Valor descuento"
                  description="Usa números positivos. Ejemplo: percentage + 10 = -10% sobre el precio. fixed_per_item + 5000 = -$5.000 por ítem."
                >
                  <input className="w-full px-3 py-2 border rounded" value={config.discount_value} onChange={(e) => setConfig({ ...config, discount_value: e.target.value })} />
                </Field>
              </div>

              <Field label="Aliases (JSON array)"><textarea className="w-full min-h-[90px] px-3 py-2 border rounded font-mono text-xs" value={config.state_aliases} onChange={(e) => setConfig({ ...config, state_aliases: e.target.value })} /></Field>
              <Field label="ipwho.is base URL"><input className="w-full px-3 py-2 border rounded" value={config.ipwhois_base_url} onChange={(e) => setConfig({ ...config, ipwhois_base_url: e.target.value })} /></Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Shopify domain"><input className="w-full px-3 py-2 border rounded" value={config.shopify_shop_domain} onChange={(e) => setConfig({ ...config, shopify_shop_domain: e.target.value })} /></Field>
                <Field label="Admin API access token"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_admin_access_token} placeholder={sensitivePreview.shopify_admin_access_token} onChange={(e) => setConfig({ ...config, shopify_admin_access_token: e.target.value })} /></Field>
                <Field label="shopify API key"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_api_key} placeholder={sensitivePreview.shopify_api_key} onChange={(e) => setConfig({ ...config, shopify_api_key: e.target.value })} /></Field>
                <Field label="API secret key"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_api_secret} placeholder={sensitivePreview.shopify_api_secret} onChange={(e) => setConfig({ ...config, shopify_api_secret: e.target.value })} /></Field>
                <Field label="Webhook secret (opcional)"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_webhook_secret} placeholder={sensitivePreview.shopify_webhook_secret} onChange={(e) => setConfig({ ...config, shopify_webhook_secret: e.target.value })} /></Field>
                <Field label="Bridge secret (opcional)"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_bridge_secret} placeholder={sensitivePreview.shopify_bridge_secret} onChange={(e) => setConfig({ ...config, shopify_bridge_secret: e.target.value })} /></Field>
                <Field label="Storefront API access token"><input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_storefront_access_token} placeholder={sensitivePreview.shopify_storefront_access_token} onChange={(e) => setConfig({ ...config, shopify_storefront_access_token: e.target.value })} /></Field>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={saveConfig} disabled={savingConfig} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">
                  {savingConfig ? 'Guardando...' : 'Guardar configuración'}
                </button>
                <button type="button" onClick={testShopifyConnection} disabled={testingShopify} className="px-4 py-2 bg-slate-700 text-white rounded disabled:opacity-50">
                  {testingShopify ? 'Verificando...' : 'Verificar conexión Shopify'}
                </button>
              </div>
              {saveMessage && <p className="text-sm text-emerald-700">{saveMessage}</p>}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              {shopifyTestResult && (
                <pre className="text-xs bg-gray-900 text-green-300 p-3 rounded overflow-auto">{JSON.stringify(shopifyTestResult, null, 2)}</pre>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Integración Shopify ↔ WORKERS (Módulo 17)</h3>
            <p>Este módulo es el motor de reglas. La app Shopify consulta el endpoint bridge y aplica o no el descuento según la respuesta.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">App Shopify</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Dev Dashboard:</strong> https://dev.shopify.com/dashboard/129927927/apps/368329850881/versions/976461332481</li>
                <li><strong>App name:</strong> el-reten-app-prices</li>
                <li><strong>Versión publicada:</strong> el-reten-app-prices-3</li>
                <li><strong>Endpoint app:</strong> https://clients-elreten-shopify-prices.zeroazul.com/api/za-discount-decision</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">WORKERS módulo 17</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Bridge:</strong> {`${BASE}/shopify-bridge`}</li>
                <li><strong>Config:</strong> {`${BASE}/config`}</li>
                <li><strong>Evaluate:</strong> {`${BASE}/evaluate`}</li>
                <li><strong>Test Shopify:</strong> {`${BASE}/test-shopify`}</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Estado en Shopify (snapshot entregado)</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Redirect URLs:</strong> ["https://example.com/api/auth"]</li>
              <li><strong>Scopes:</strong> write_products</li>
              <li><strong>App URL:</strong> https://example.com</li>
              <li><strong>Embedded:</strong> true</li>
              <li><strong>Webhooks api_version:</strong> 2026-07</li>
              <li><strong>Webhook subscriptions:</strong> 2</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Function</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Handle:</strong> za-discount-function</li>
                <li><strong>UID:</strong> 13507ac8-b278-71f1-6f90-c8657a72e209367270f5</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Checkout UI extension</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Handle:</strong> za-checkout-ui</li>
                <li><strong>UID:</strong> 62a0d220-fa21-be9a-62c3-47f1b0c6ace0c97c537e</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">Flujo simple de conexión</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Checkout llama app Shopify (endpoint /api/za-discount-decision).</li>
              <li>App firma body con shopify_bridge_secret y llama {`${BASE}/shopify-bridge`}.</li>
              <li>WORKERS evalúa reglas (IP + estado + país + config).</li>
              <li>Responde applied/discount/reason.</li>
              <li>App Shopify aplica o no descuento en checkout.</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadLogs} disabled={loadingLogs} className="px-3 py-2 text-sm border rounded">
              {loadingLogs ? 'Cargando...' : 'Refrescar'}
            </button>
            <span className="text-xs text-gray-500">{logs.length} registros</span>
          </div>

          <div className="overflow-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-2 py-2">Fecha</th>
                  <th className="text-left px-2 py-2">IP</th>
                  <th className="text-left px-2 py-2">Geo</th>
                  <th className="text-left px-2 py-2">Shipping</th>
                  <th className="text-left px-2 py-2">Applied</th>
                  <th className="text-left px-2 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-2 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-2 py-2">{log.ip_address || '-'}</td>
                    <td className="px-2 py-2">{[log.resolved_country_code, log.resolved_state].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="px-2 py-2">{[log.shipping_country_code, log.shipping_state].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="px-2 py-2">{log.applied ? 'Sí' : 'No'}</td>
                    <td className="px-2 py-2">{log.reason || '-'}</td>
                  </tr>
                ))}
                {!loadingLogs && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-gray-500">Sin logs todavía</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
