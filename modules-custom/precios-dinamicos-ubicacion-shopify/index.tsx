'use client';

import { useState, useEffect } from 'react';

type TabId = 'inicio' | 'config' | 'documentacion';

interface ModuleData {
  id: number;
  title: string;
  folder_name: string;
  description?: string | null;
  agent_name?: string;
  agent_id?: number;
}

const BASE = '/api/custom-module30/precios-dinamicos-ubicacion-shopify';

interface ConfigState {
  shopify_shop_domain: string;
  shopify_admin_access_token: string;
  shopify_api_key: string;
  shopify_api_secret: string;
  shopify_webhook_secret: string;
  shopify_bridge_secret: string;
  shopify_storefront_access_token: string;
  shopify_app_name: string;
}

interface SensitivePreview {
  shopify_admin_access_token: string;
  shopify_api_key: string;
  shopify_api_secret: string;
  shopify_webhook_secret: string;
  shopify_bridge_secret: string;
  shopify_storefront_access_token: string;
}

const DEFAULT_CONFIG: ConfigState = {
  shopify_shop_domain: '',
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
  shopify_app_name: '',
};

const DEFAULT_SENSITIVE_PREVIEW: SensitivePreview = {
  shopify_admin_access_token: '',
  shopify_api_key: '',
  shopify_api_secret: '',
  shopify_webhook_secret: '',
  shopify_bridge_secret: '',
  shopify_storefront_access_token: '',
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'config', label: 'Configuración' },
  { id: 'documentacion', label: 'Documentación' },
];

export default function ModPreciosDinamicosUbicacionShopify({ moduleData }: { moduleData: ModuleData }) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [sensitivePreview, setSensitivePreview] = useState<SensitivePreview>(DEFAULT_SENSITIVE_PREVIEW);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

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

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config/`, { cache: 'no-store' });
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
        setConfig({
          shopify_shop_domain: String(json.config.shopify_shop_domain || ''),
          shopify_app_name: String(json.config.shopify_app_name || ''),
          shopify_admin_access_token: '',
          shopify_api_key: '',
          shopify_api_secret: '',
          shopify_webhook_secret: '',
          shopify_bridge_secret: '',
          shopify_storefront_access_token: '',
        });
      }
    } catch {
      /* silencioso */
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  /** Guarda los campos de Shopify */
  const saveShopifyTab = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const payload: any = {
        shopify_shop_domain: config.shopify_shop_domain,
        shopify_app_name: config.shopify_app_name,
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
      setSaveMessage('Credenciales Shopify guardadas ✅');
    } catch (e: any) {
      setSaveError(e?.message || 'Error guardando configuración Shopify');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200">
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

      {/* CONTENIDO */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {activeTab === 'inicio' && (
          <div className="space-y-4 p-2">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold mb-1">{moduleData.title}</h3>
              <p className="text-purple-100 text-sm">
                {moduleData.description || 'Precios dinámicos según la ubicación del visitante, integrado con Shopify (El Retén del Casco).'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 mb-2">Endpoint de geolocalización</h4>
                <p className="text-sm text-gray-600 mb-2">Resuelve ciudad/región/país del visitante por IP (GeoLite2 local).</p>
                <code className="block text-xs bg-gray-900 text-green-300 p-2 rounded overflow-auto">
                  GET https://workers.zeroazul.com/geo/
                </code>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 mb-2">Credenciales Shopify</h4>
                <p className="text-sm text-gray-600 mb-2">
                  {loadingConfig ? 'Cargando…' : config.shopify_shop_domain ? `Tienda: ${config.shopify_shop_domain}` : 'Sin tienda configurada.'}
                </p>
                <p className="text-xs text-gray-500">Administra las claves en la pestaña <strong>Configuración</strong>.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-4 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Configuración</h3>
              <p className="text-xs text-gray-500 mt-1">
                Credenciales de la tienda Shopify. Los secretos se guardan cifrados y solo se muestran enmascarados.
              </p>
            </div>

            {loadingConfig ? (
              <div className="text-sm text-gray-500">Cargando configuración…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Shopify domain" description="Ej: el-reten-del-casco.myshopify.com">
                    <input className="w-full px-3 py-2 border rounded" value={config.shopify_shop_domain} onChange={(e) => setConfig({ ...config, shopify_shop_domain: e.target.value })} />
                  </Field>
                  <Field label="Admin API access token" description="Se guarda cifrado. Deja vacío para conservar el actual.">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_admin_access_token} placeholder={sensitivePreview.shopify_admin_access_token} onChange={(e) => setConfig({ ...config, shopify_admin_access_token: e.target.value })} />
                  </Field>
                  <Field label="shopify API key">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_api_key} placeholder={sensitivePreview.shopify_api_key} onChange={(e) => setConfig({ ...config, shopify_api_key: e.target.value })} />
                  </Field>
                  <Field label="API secret key">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_api_secret} placeholder={sensitivePreview.shopify_api_secret} onChange={(e) => setConfig({ ...config, shopify_api_secret: e.target.value })} />
                  </Field>
                  <Field label="Webhook secret (opcional)">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_webhook_secret} placeholder={sensitivePreview.shopify_webhook_secret} onChange={(e) => setConfig({ ...config, shopify_webhook_secret: e.target.value })} />
                  </Field>
                  <Field label="Bridge secret (opcional)">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_bridge_secret} placeholder={sensitivePreview.shopify_bridge_secret} onChange={(e) => setConfig({ ...config, shopify_bridge_secret: e.target.value })} />
                  </Field>
                  <Field label="Storefront API access token">
                    <input type="password" className="w-full px-3 py-2 border rounded" value={config.shopify_storefront_access_token} placeholder={sensitivePreview.shopify_storefront_access_token} onChange={(e) => setConfig({ ...config, shopify_storefront_access_token: e.target.value })} />
                  </Field>
                  <Field label="App name" description="Nombre de la app de price rules.">
                    <input className="w-full px-3 py-2 border rounded" value={config.shopify_app_name} onChange={(e) => setConfig({ ...config, shopify_app_name: e.target.value })} />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={saveShopifyTab} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar Shopify'}
                  </button>
                  {saveMessage && !saving && <span className="text-sm text-emerald-700">{saveMessage}</span>}
                  {saveError && !saving && <span className="text-sm text-red-600">{saveError}</span>}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="p-4 space-y-4 text-sm text-gray-700">
            <h3 className="font-semibold text-gray-900">Documentación</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Geolocalización por IP</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Endpoint: <code>GET https://workers.zeroazul.com/geo/</code></li>
                <li>Resuelve la ciudad con la base <strong>GeoLite2-City</strong> local (sin API externa).</li>
                <li>IP real: <code>CF-Connecting-IP</code> → <code>X-Forwarded-For[0]</code> → IP de conexión.</li>
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-900 mb-2">Credenciales Shopify</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Las claves de la tienda se administran en la pestaña <strong>Configuración</strong>.</li>
                <li>Los secretos se almacenan cifrados (AES-256-GCM).</li>
                <li>Mismo conjunto de claves que el módulo de reglas de precio (El Retén del Casco).</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Endpoints del módulo</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Config:</strong> <code>{`${BASE}/config/`}</code></li>
                <li><strong>Crear pedido:</strong> <code>POST {`${BASE}/orders/`}</code> — autenticado</li>
                <li><strong>Geo público:</strong> https://workers.zeroazul.com/geo/</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Crear pedidos en Shopify</h4>
              <p className="mb-2">Requiere autenticación por firma <strong>HMAC-SHA256</strong> del cuerpo en el header <code>x-za-signature</code> (clave <code>shopify_bridge_secret</code>), o <code>Authorization: Bearer &lt;secret&gt;</code>.</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>line_items</code> (obligatorio): <code>[{'{'} variant_id, quantity {'}'}]</code> o <code>[{'{'} title, price, quantity {'}'}]</code>.</li>
                <li>Opcionales: <code>email</code>, <code>financial_status</code>, <code>note</code>, <code>tags</code>, <code>shipping_address</code>, <code>test</code>.</li>
                <li><code>dry_run: true</code> valida sin crear el pedido.</li>
                <li>Los pedidos de API descuentan inventario (<code>decrement_obeying_policy</code>).</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}