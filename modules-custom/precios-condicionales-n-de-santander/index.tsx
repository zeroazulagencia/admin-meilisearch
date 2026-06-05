'use client';

import { useEffect, useMemo, useState } from 'react';

const BASE = '/api/custom-module17/precios-condicionales-n-de-santander';

type TabId = 'inicio' | 'config' | 'logs' | 'docs';
type DiscountType = 'percentage' | 'fixed_per_item';
type ProductScopeMode = 'all_products' | 'selected_only' | 'selected_with_base_fallback';
type ProductOverrideMode = 'percentage' | 'final_price';

type ProductOverride = {
  id: string;
  product_id: string;
  product_title: string;
  mode: ProductOverrideMode;
  value: string;
  active: boolean;
};

type ConfigState = {
  enabled: boolean;
  target_country_code: string;
  target_state: string;
  discount_type: DiscountType;
  discount_value: string;
  product_scope_mode: ProductScopeMode;
  require_shipping_match: boolean;
  state_aliases: string;
  state_discounts: string;
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
  product_scope_mode: 'all_products',
  require_shipping_match: true,
  state_aliases: '["Norte de Santander","N. de Santander","Norte Santander"]',
  state_discounts: '[]',
  ipwhois_base_url: 'https://ipwho.is',
  shopify_shop_domain: '',
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
};

const COLOMBIA_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar',
  'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
  'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Bogotá', 'Guainía',
  'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta',
  'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
  'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
  'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
];

const DEPARTMENT_DEFAULT_ALIASES: Record<string, string[]> = {
  'Norte de Santander': ['Norte de Santander', 'N. de Santander', 'Norte Santander'],
  'Valle del Cauca': ['Valle del Cauca', 'Valle'],
  'San Andrés y Providencia': ['San Andrés y Providencia', 'San Andrés', 'San Andres'],
};

function buildStateAliases(department: string): string {
  const aliases = DEPARTMENT_DEFAULT_ALIASES[department] || [department];
  return JSON.stringify(aliases);
}

const DEFAULT_SENSITIVE_PREVIEW: SensitivePreview = {
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
};

const EMPTY_OVERRIDE = (): ProductOverride => ({
  id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  product_id: '',
  product_title: '',
  mode: 'percentage',
  value: '0',
  active: true,
});

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
  const [productOverrides, setProductOverrides] = useState<ProductOverride[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [testingShopify, setTestingShopify] = useState(false);
  const [shopifyTestResult, setShopifyTestResult] = useState<any>(null);
  const [sensitivePreview, setSensitivePreview] = useState<SensitivePreview>(DEFAULT_SENSITIVE_PREVIEW);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [testing, setTesting] = useState(false);
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    ip: '181.57.0.1',
    shipping_state: 'Norte de Santander',
    shipping_country_code: 'CO',
    cart_id: 'gid://shopify/Cart/example',
    lines: [
      {
        product_id: 'gid://shopify/Product/111',
        product_title: 'Producto A',
        quantity: 1,
      },
      {
        product_id: 'gid://shopify/Product/222',
        product_title: 'Producto B',
        quantity: 2,
      },
    ],
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

  const scopeModeLabel = useMemo(() => {
    if (config.product_scope_mode === 'selected_only') return 'Solo productos configurados';
    if (config.product_scope_mode === 'selected_with_base_fallback') return 'Configurados + base para el resto';
    return 'Todos los productos usan la base';
  }, [config.product_scope_mode]);

  const doConsoleLog = async () => {
  try {
    const cfgRes = await fetch(`${BASE}/config/`, { cache: 'no-store' });
    const cfgJson = await cfgRes.json();
    if (!cfgJson.ok) return;
    const c = cfgJson.config;
    console.log('%c=== MÓDULO 17 - Precios Condicionales N de Santander ===', 'font-weight:bold;color:#2563eb');
    console.log(`Departamento objetivo: ${c.target_state}`);
    console.log(`Descuento: ${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' COP'}`);
    console.log(`Estado: ${c.enabled === '1' || c.enabled === true ? 'Activo' : 'Inactivo'}`);

    try {
      const testRes = await fetch(`${BASE}/evaluate/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: '181.57.0.1', shipping_state: c.target_state, shipping_country_code: 'CO' }),
      });
      const testJson = await testRes.json();
      console.log('%cResultado evaluate:', 'font-weight:bold');
      console.log(`  Applied: ${testJson.applied} | Reason: ${testJson.reason}`);
      console.log(`  Discount:`, testJson.discount);
      console.log(`  Geo detectado:`, testJson.geo);
    } catch (e) { console.warn('Evaluate auto-test failed:', e); }

    try {
      const prodRes = await fetch(`${BASE}/products`);
      const prodJson = await prodRes.json();
      if (prodJson.ok && prodJson.products?.length > 0) {
        console.log('%cProductos en Shopify:', 'font-weight:bold');
        prodJson.products.forEach((p: any) => { console.log(`  ${p.title}: $${p.price}`); });
      } else {
        console.log('No se pudieron obtener productos de Shopify');
      }
    } catch (e) { console.warn('Product fetch failed:', e); }

    console.log('%c========================================', 'color:#2563eb');
  } catch (e) { /* silent */ }
};

const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config/`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.config) {
        doConsoleLog();
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
          product_scope_mode:
            json.config.product_scope_mode === 'selected_only'
              ? 'selected_only'
              : json.config.product_scope_mode === 'selected_with_base_fallback'
                ? 'selected_with_base_fallback'
                : 'all_products',
          require_shipping_match: json.config.require_shipping_match !== '0' && json.config.require_shipping_match !== false,
          state_aliases: String(json.config.state_aliases || DEFAULT_CONFIG.state_aliases),
          state_discounts: json.config.state_discounts
            ? (typeof json.config.state_discounts === 'string'
                ? json.config.state_discounts
                : JSON.stringify(json.config.state_discounts))
            : '[]',
          ipwhois_base_url: String(json.config.ipwhois_base_url || 'https://ipwho.is'),
          shopify_shop_domain: String(json.config.shopify_shop_domain || ''),
          shopify_admin_access_token: '',
          shopify_api_key: '',
          shopify_api_secret: '',
          shopify_webhook_secret: '',
          shopify_bridge_secret: '',
          shopify_storefront_access_token: '',
        }));

        setProductOverrides(
          Array.isArray(json.product_overrides)
            ? json.product_overrides.map((item: any) => ({
                id: String(item.id || EMPTY_OVERRIDE().id),
                product_id: String(item.product_id || ''),
                product_title: String(item.product_title || ''),
                mode: item.mode === 'final_price' ? 'final_price' : 'percentage',
                value: String(item.value ?? '0'),
                active: item.active !== false,
              }))
            : []
        );
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
      const normalizedOverrides = productOverrides
        .map((item) => ({
          id: item.id,
          product_id: item.product_id.trim(),
          product_title: item.product_title.trim(),
          mode: item.mode,
          value: Number(item.value || 0),
          active: item.active,
        }))
        .filter((item) => item.product_id && Number.isFinite(item.value) && item.value >= 0);

      const payload: any = {
        enabled: config.enabled,
        target_country_code: config.target_country_code,
        target_state: config.target_state,
        discount_type: config.discount_type,
        discount_value: Number(config.discount_value || 0),
        product_scope_mode: config.product_scope_mode,
        product_overrides: normalizedOverrides,
        require_shipping_match: config.require_shipping_match,
        state_aliases: Array.isArray(parsedAliases) ? parsedAliases : [],
        state_discounts: (() => {
          try {
            const parsed = JSON.parse(config.state_discounts || '[]');
            const arr = Array.isArray(parsed) ? parsed : [];
            return arr.filter((_, i: number) => activeDiscountIndices.includes(i));
          } catch {
            return [];
          }
        })(),
        ipwhois_base_url: config.ipwhois_base_url,
        shopify_shop_domain: config.shopify_shop_domain,
      };
      if (config.shopify_admin_access_token.trim()) payload.shopify_admin_access_token = config.shopify_admin_access_token.trim();
      if (config.shopify_api_key.trim()) payload.shopify_api_key = config.shopify_api_key.trim();
      if (config.shopify_api_secret.trim()) payload.shopify_api_secret = config.shopify_api_secret.trim();
      if (config.shopify_webhook_secret.trim()) payload.shopify_webhook_secret = config.shopify_webhook_secret.trim();
      if (config.shopify_bridge_secret.trim()) payload.shopify_bridge_secret = config.shopify_bridge_secret.trim();
      if (config.shopify_storefront_access_token.trim()) payload.shopify_storefront_access_token = config.shopify_storefront_access_token.trim();

      const res = await fetch(`${BASE}/config/`, {
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

  const updateOverride = (id: string, patch: Partial<ProductOverride>) => {
    setProductOverrides((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeOverride = (id: string) => {
    setProductOverrides((prev) => prev.filter((item) => item.id !== id));
  };

  const addOverride = () => {
    setProductOverrides((prev) => [...prev, EMPTY_OVERRIDE()]);
  };

  const parsedStateDiscounts = useMemo(() => {
    try {
      const parsed = JSON.parse(config.state_discounts || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [config.state_discounts]);

  const updateStateDiscount = (idx: number, patch: { state?: string; discount?: number }) => {
    try {
      const list = [...parsedStateDiscounts];
      list[idx] = { ...list[idx], ...patch };
      setConfig({ ...config, state_discounts: JSON.stringify(list) });
    } catch { /* silent */ }
  };

  const removeStateDiscount = (idx: number) => {
    try {
      const list = parsedStateDiscounts.filter((_, i) => i !== idx);
      setConfig({ ...config, state_discounts: JSON.stringify(list) });
    } catch { /* silent */ }
  };

  const addStateDiscountRow = () => {
    try {
      const list = [...parsedStateDiscounts, { state: COLOMBIA_DEPARTMENTS[0], discount: 0 }];
      setConfig({ ...config, state_discounts: JSON.stringify(list) });
    } catch { /* silent */ }
  };

  const [excludeDept, setExcludeDept] = useState<string | null>(null);

  const seleccionarTodos = () => {
    const list = COLOMBIA_DEPARTMENTS.map((d) => ({ state: d, discount: Number(config.discount_value) || 0 }));
    setConfig({ ...config, state_discounts: JSON.stringify(list) });
  };

  const seleccionarTodosExcepto = (exclude: string | null) => {
    const list = COLOMBIA_DEPARTMENTS
      .filter((d) => d !== exclude)
      .map((d) => ({ state: d, discount: Number(config.discount_value) || 0 }));
    setConfig({ ...config, state_discounts: JSON.stringify(list) });
  };

  const [activeDiscountIndices, setActiveDiscountIndices] = useState<number[]>([]);

  useEffect(() => {
    setActiveDiscountIndices(parsedStateDiscounts.map((_, i) => i));
  }, [config.state_discounts]);

  const toggleDiscountActive = (idx: number) => {
    setActiveDiscountIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleAllDiscounts = (value: boolean) => {
    setActiveDiscountIndices(value ? parsedStateDiscounts.map((_, i) => i) : []);
  };

  const clearLogs = async () => {
    setClearingLogs(true);
    try {
      const res = await fetch(`${BASE}/logs`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setLogs([]);
      }
    } finally {
      setClearingLogs(false);
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
              <div className="bg-gray-50 border rounded p-3">Regla envío: <b>{shippingRuleLabel}</b></div>
              <div className="bg-gray-50 border rounded p-3">Alcance productos: <b>{scopeModeLabel}</b></div>
              <div className="bg-gray-50 border rounded p-3">Overrides configurados: <b>{productOverrides.filter((item) => item.active).length}</b></div>
              <div className="bg-gray-50 border rounded p-3">Descuentos por depto: <b>{parsedStateDiscounts.length > 0 ? parsedStateDiscounts.map((d: any) => `${d.state}: ${d.discount}%`).join(', ') : 'Ninguno'}</b></div>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-800">Prueba rápida del evaluate</h3>
            <textarea
              className="w-full min-h-[220px] px-3 py-2 border border-gray-300 rounded text-xs font-mono"
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

              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Descuentos por departamento</h3>
                    <p className="text-xs text-gray-500">Cada departamento puede tener su propio % de descuento. Usa los checkboxes para activar/desactivar.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={seleccionarTodos} className="px-3 py-2 text-sm bg-slate-800 text-white rounded">
                      Seleccionar todos
                    </button>
                    <details className="relative">
                      <summary className="px-3 py-2 text-sm bg-slate-700 text-white rounded cursor-pointer whitespace-nowrap">
                        Todos excepto...
                      </summary>
                      <div className="absolute right-0 top-full mt-1 z-10 bg-white border rounded shadow-lg p-2 min-w-[220px]">
                        <p className="text-xs text-gray-500 mb-2">Elige el depto a excluir:</p>
                        <select
                          className="w-full px-2 py-1.5 border rounded text-sm"
                          value={excludeDept || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setExcludeDept(val);
                            if (val) {
                              seleccionarTodosExcepto(val);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">-- Seleccionar --</option>
                          {COLOMBIA_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </details>
                    <button type="button" onClick={addStateDiscountRow} className="px-3 py-2 text-sm border border-gray-400 text-gray-700 rounded">
                      Agregar manual
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm mb-2">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      ref={(el) => { if (el) el.indeterminate = activeDiscountIndices.length > 0 && activeDiscountIndices.length < parsedStateDiscounts.length; }}
                      checked={activeDiscountIndices.length === parsedStateDiscounts.length && parsedStateDiscounts.length > 0}
                      onChange={(e) => toggleAllDiscounts(e.target.checked)}
                    />
                    <span className="text-gray-600">{activeDiscountIndices.length}/{parsedStateDiscounts.length} activos</span>
                  </label>
                </div>

                <div className="space-y-3">
                  {parsedStateDiscounts.map((item, idx) => {
                    const isActive = activeDiscountIndices.includes(idx);
                    return (
                      <div key={idx} className={`border rounded-lg p-3 grid grid-cols-1 md:grid-cols-5 gap-3 ${isActive ? '' : 'opacity-40'}`}>
                        <div className="flex items-center md:items-start">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleDiscountActive(idx)}
                              className="mt-0.5"
                            />
                          </label>
                        </div>
                        <Field label="Departamento">
                          <select
                            className="w-full px-3 py-2 border rounded"
                            value={item.state}
                            onChange={(e) => updateStateDiscount(idx, { state: e.target.value })}
                          >
                            {COLOMBIA_DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="% descuento">
                          <input
                            className="w-full px-3 py-2 border rounded"
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateStateDiscount(idx, { discount: Number(e.target.value) || 0 })}
                          />
                        </Field>
                        <Field label="Alias">
                          <input
                            className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-500"
                            value={buildStateAliases(item.state)}
                            disabled
                          />
                        </Field>
                        <div className="flex items-end">
                          <button type="button" onClick={() => removeStateDiscount(idx)} className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {parsedStateDiscounts.length === 0 && (
                    <div className="text-sm text-gray-500 border rounded-lg p-4">
                      No hay descuentos por departamento configurados.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Tipo descuento base"
                  description="percentage: aplica un porcentaje sobre el precio. fixed_per_item: descuenta un valor fijo por ítem."
                >
                  <select className="w-full px-3 py-2 border rounded" value={config.discount_type} onChange={(e) => setConfig({ ...config, discount_type: e.target.value as DiscountType })}>
                    <option value="percentage">percentage</option>
                    <option value="fixed_per_item">fixed_per_item</option>
                  </select>
                </Field>
                <Field
                  label="Valor descuento base (fallback)"
                  description="Usa números positivos. Se usa como fallback si un departamento no está en la lista de descuentos."
                >
                  <input className="w-full px-3 py-2 border rounded" value={config.discount_value} onChange={(e) => setConfig({ ...config, discount_value: e.target.value })} />
                </Field>
                <Field
                  label="Alcance por productos"
                  description="Define si todos usan la base o si solo algunos productos tienen descuento propio."
                >
                  <select className="w-full px-3 py-2 border rounded" value={config.product_scope_mode} onChange={(e) => setConfig({ ...config, product_scope_mode: e.target.value as ProductScopeMode })}>
                    <option value="all_products">all_products</option>
                    <option value="selected_only">selected_only</option>
                    <option value="selected_with_base_fallback">selected_with_base_fallback</option>
                  </select>
                </Field>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Descuentos por producto</h3>
                    <p className="text-xs text-gray-500">Configura productos específicos con porcentaje propio o precio final manual.</p>
                  </div>
                  <button type="button" onClick={addOverride} className="px-3 py-2 text-sm bg-slate-800 text-white rounded">
                    Agregar producto
                  </button>
                </div>

                <div className="space-y-3">
                  {productOverrides.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-5 gap-3">
                      <Field label="Product ID" description="Usa el gid://shopify/Product/... exacto.">
                        <input className="w-full px-3 py-2 border rounded" value={item.product_id} onChange={(e) => updateOverride(item.id, { product_id: e.target.value })} />
                      </Field>
                      <Field label="Nombre producto" description="Solo referencia visual en el panel.">
                        <input className="w-full px-3 py-2 border rounded" value={item.product_title} onChange={(e) => updateOverride(item.id, { product_title: e.target.value })} />
                      </Field>
                      <Field label="Modo" description="percentage o final_price para este producto.">
                        <select className="w-full px-3 py-2 border rounded" value={item.mode} onChange={(e) => updateOverride(item.id, { mode: e.target.value as ProductOverrideMode })}>
                          <option value="percentage">percentage</option>
                          <option value="final_price">final_price</option>
                        </select>
                      </Field>
                      <Field label="Valor" description={item.mode === 'final_price' ? 'Precio final exacto del producto.' : 'Porcentaje que se aplicará a este producto.'}>
                        <input className="w-full px-3 py-2 border rounded" value={item.value} onChange={(e) => updateOverride(item.id, { value: e.target.value })} />
                      </Field>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={item.active} onChange={(e) => updateOverride(item.id, { active: e.target.checked })} />
                          Activo
                        </label>
                        <button type="button" onClick={() => removeOverride(item.id)} className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}

                  {productOverrides.length === 0 && (
                    <div className="text-sm text-gray-500 border rounded-lg p-4">
                      No hay productos configurados todavía.
                    </div>
                  )}
                </div>
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

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-900 mb-2">Nuevo comportamiento de descuentos</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Se mantiene un descuento base general.</li>
              <li>Puedes definir overrides por producto.</li>
              <li>Cada producto puede usar <strong>percentage</strong> o <strong>final_price</strong>.</li>
              <li>El endpoint evaluate ahora puede responder múltiples descuentos por línea en <code>discounts</code>.</li>
            </ul>
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
                <li><strong>Config:</strong> {`${BASE}/config/`}</li>
                <li><strong>Evaluate:</strong> {`${BASE}/evaluate/`}</li>
                <li><strong>Test Shopify:</strong> {`${BASE}/test-shopify`}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadLogs} disabled={loadingLogs} className="px-3 py-2 text-sm border rounded">
              {loadingLogs ? 'Cargando...' : 'Refrescar'}
            </button>
            <button type="button" onClick={clearLogs} disabled={clearingLogs} className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded">
              {clearingLogs ? 'Limpiando...' : 'Limpiar logs'}
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
