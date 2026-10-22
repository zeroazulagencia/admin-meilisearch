'use client';

import { Fragment, useState, useEffect } from 'react';

type TabId = 'inicio' | 'config' | 'pedidos' | 'documentacion';

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

interface PedidoLog {
  id: number;
  created_at: string;
  http_status: number;
  resultado: 'draft_creado' | 'sin_descuento' | 'dry_run' | 'rechazado' | 'error';
  error: string | null;
  ip: string | null;
  origin: string | null;
  user_agent: string | null;
  ciudad: string | null;
  region: string | null;
  regla: string | null;
  descuento: string | number | null;
  items: Array<{ variant_id: number; quantity: number }> | null;
  lineas: Array<{ variant_id: number; quantity: number; titulo: string | null; precio_base: number; precio_final: number }> | null;
  draft_order_id: number | null;
  duracion_ms: number | null;
}

const RESULTADO_ESTILO: Record<PedidoLog['resultado'], { label: string; cls: string }> = {
  draft_creado: { label: 'Borrador creado', cls: 'bg-emerald-100 text-emerald-800' },
  sin_descuento: { label: 'Sin descuento', cls: 'bg-gray-100 text-gray-700' },
  dry_run: { label: 'Dry run', cls: 'bg-blue-100 text-blue-800' },
  rechazado: { label: 'Rechazado', cls: 'bg-amber-100 text-amber-800' },
  error: { label: 'Error', cls: 'bg-red-100 text-red-800' },
};

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
  { id: 'pedidos', label: 'Log de pedidos' },
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
  const [pedidos, setPedidos] = useState<PedidoLog[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [pedidosError, setPedidosError] = useState('');
  const [pedidoAbierto, setPedidoAbierto] = useState<number | null>(null);

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

  const authHeaders = (): Record<string, string> => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('admin-user-id') : null;
    return userId ? { 'x-admin-user-id': userId } : {};
  };

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE}/config/`, { cache: 'no-store', headers: { ...authHeaders() } });
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

  const loadPedidos = async () => {
    setLoadingPedidos(true);
    setPedidosError('');
    try {
      const res = await fetch(`${BASE}/pedidos-log/?limit=500`, { cache: 'no-store', headers: { ...authHeaders() } });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'No se pudo cargar el log');
      setPedidos(Array.isArray(json.pedidos) ? json.pedidos : []);
    } catch (e: any) {
      setPedidosError(e?.message || 'Error cargando el log');
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pedidos') loadPedidos();
  }, [activeTab]);

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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
                  GET https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/
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

        {activeTab === 'pedidos' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">Log de pedidos</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Solicitudes a <code>POST {`${BASE}/checkout/`}</code> de los <strong>últimos 5 días</strong> (lo anterior se borra solo).
                  No se registran las rechazadas por límite de peticiones (429).
                </p>
              </div>
              <button type="button" onClick={loadPedidos} disabled={loadingPedidos} className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded disabled:opacity-50">
                {loadingPedidos ? 'Cargando…' : 'Actualizar'}
              </button>
            </div>

            {pedidos.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {(Object.keys(RESULTADO_ESTILO) as PedidoLog['resultado'][]).map((r) => {
                  const n = pedidos.filter((p) => p.resultado === r).length;
                  return n > 0 ? (
                    <span key={r} className={`px-2 py-1 rounded ${RESULTADO_ESTILO[r].cls}`}>{RESULTADO_ESTILO[r].label}: <b>{n}</b></span>
                  ) : null;
                })}
              </div>
            )}

            {pedidosError && <div className="text-sm text-red-600">{pedidosError}</div>}

            {!loadingPedidos && !pedidosError && pedidos.length === 0 && (
              <div className="text-sm text-gray-500">Sin solicitudes en los últimos 5 días.</div>
            )}

            {pedidos.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Resultado</th>
                      <th className="px-3 py-2">HTTP</th>
                      <th className="px-3 py-2">Ubicación</th>
                      <th className="px-3 py-2">Regla</th>
                      <th className="px-3 py-2">Unidades</th>
                      <th className="px-3 py-2">Borrador</th>
                      <th className="px-3 py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pedidos.map((p) => {
                      const estilo = RESULTADO_ESTILO[p.resultado] || RESULTADO_ESTILO.error;
                      const unidades = (p.items || []).reduce((acc, it) => acc + Number(it.quantity || 0), 0);
                      const abierto = pedidoAbierto === p.id;
                      return (
                        <Fragment key={p.id}>
                          <tr onClick={() => setPedidoAbierto(abierto ? null : p.id)} className="cursor-pointer hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(p.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded ${estilo.cls}`}>{estilo.label}</span>{p.error && <div className="text-red-600 mt-0.5">{p.error}</div>}</td>
                            <td className="px-3 py-2">{p.http_status}</td>
                            <td className="px-3 py-2">{[p.ciudad, p.region].filter(Boolean).join(' / ') || '—'}</td>
                            <td className="px-3 py-2">{p.regla ? `${p.regla} (${Number(p.descuento)}%)` : '—'}</td>
                            <td className="px-3 py-2">{unidades || '—'}</td>
                            <td className="px-3 py-2">{p.draft_order_id ?? '—'}</td>
                            <td className="px-3 py-2 font-mono">{p.ip || '—'}</td>
                          </tr>
                          {abierto && (
                            <tr className="bg-gray-50">
                              <td colSpan={8} className="px-3 py-3 space-y-2">
                                {p.lineas && p.lineas.length > 0 ? (
                                  <table className="text-xs">
                                    <thead className="text-gray-500 text-left">
                                      <tr><th className="pr-4">Producto</th><th className="pr-4">Variante</th><th className="pr-4">Cant.</th><th className="pr-4">Precio base</th><th>Precio final</th></tr>
                                    </thead>
                                    <tbody>
                                      {p.lineas.map((l, i) => (
                                        <tr key={i}>
                                          <td className="pr-4">{l.titulo || '—'}</td>
                                          <td className="pr-4 font-mono">{l.variant_id}</td>
                                          <td className="pr-4">{l.quantity}</td>
                                          <td className="pr-4">${Number(l.precio_base).toLocaleString('es-CO')}</td>
                                          <td>${Number(l.precio_final).toLocaleString('es-CO')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div><span className="text-gray-500">Items recibidos:</span> <code>{JSON.stringify(p.items)}</code></div>
                                )}
                                <div className="text-gray-500">Origen: {p.origin || '—'} · {p.duracion_ms ?? '—'} ms</div>
                                <div className="text-gray-500 break-all">User-Agent: {p.user_agent || '—'}</div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="p-4 space-y-4 text-sm text-gray-700">
            <h3 className="font-semibold text-gray-900">Documentación</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Geolocalización por IP (solo ubicación)</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Endpoint: <code>GET https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/</code></li>
                <li>Resuelve la ciudad con la base <strong>GeoLite2-City</strong> local (sin API externa).</li>
                <li>IP real: <code>X-Real-IP</code> (la fija nginx y es la única fiable) → último valor de <code>X-Forwarded-For</code>. <strong>No</strong> se usa <code>CF-Connecting-IP</code>: no hay Cloudflare delante y el cliente podría falsificarla para elegir su propia ciudad.</li>
                <li>Respuesta: <code>{`{ fuente, ciudad, region, pais, latitud, longitud }`}</code>.</li>
                <li>Las reglas de descuento las lee el <strong>tema de Shopify</strong> directamente del metaobjeto (Section Rendering API, sin caché). Este endpoint <strong>solo ubica</strong> al visitante: no consulta ni cruza reglas.</li>
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
                <li><strong>Geo público (solo ubicación):</strong> <code>GET {`${BASE}/geo/`}</code></li>
                <li><strong>Checkout público (precio dinámico):</strong> <code>POST {`${BASE}/checkout/`}</code></li>
                <li><strong>Log de pedidos (solo admin):</strong> <code>GET {`${BASE}/pedidos-log/`}</code> — solicitudes a <code>checkout/</code> de los últimos 5 días; tabla <code>modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log</code>.</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">La antigua ruta <code>{`${BASE}/orders/`}</code> (autenticada por HMAC) fue <strong>eliminada</strong>: ya no la usa la tienda y, con el secreto, permitía crear pedidos pagados con cualquier precio.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2">Checkout público (sin secretos)</h4>
              <p className="mb-2">
                Lo usa el <strong>botón de pago del tema</strong>, que corre en el navegador del cliente: no lleva ningún secreto.
                El servidor resuelve todo (ubicación, regla, precio); cualquier precio, descuento o dato que envíe el cliente se <strong>ignora</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>URL:</strong> <code>POST {`${BASE}/checkout/`}</code> — <strong>con barra final</strong> (sin barra el servidor responde 308 y se pierde el POST).</li>
                <li><strong>Entrada:</strong> <code>{`{ "items": [ { "variant_id": 123, "quantity": 2 } ], "dry_run": false }`}</code></li>
                <li><strong>Límites:</strong> 1–50 líneas · <code>quantity</code> entero 1–20 · <code>variant_id</code> numérico · máximo 50 unidades por petición · cuerpo ≤ 16 KB. Variantes repetidas se suman y el límite se aplica al total (no se puede partir en varias líneas).</li>
                <li><strong>Respuesta OK:</strong> <code>{`{ ok, checkout_url, draft_order_id, descuento, regla, ubicacion }`}</code></li>
                <li><strong>Sin regla o descuento 0:</strong> <code>{`{ checkout_url: null, descuento: 0, regla: null }`}</code> y el tema sigue al checkout normal.</li>
                <li><strong>dry_run:</strong> devuelve las líneas calculadas (<code>precio_base</code>, <code>precio_final</code>) sin crear nada.</li>
                <li><strong>Errores:</strong> 400 entrada inválida · 404 variante inexistente o no disponible · 429 límite de peticiones · 502 fallo de Shopify (sin exponer detalles internos).</li>
                <li><strong>CORS:</strong> solo <code>retendelcasco.com</code>, <code>www.retendelcasco.com</code> y <code>el-reten-del-casco.myshopify.com</code>. Siempre <code>Cache-Control: no-store</code>.</li>
                <li><strong>Rate limit:</strong> 10 peticiones por minuto y por IP → 429.</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Cómo se calcula el precio</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>IP del visitante → base <strong>GeoLite2-City</strong> local (sin API externa) → ciudad y departamento.</li>
                <li>Reglas del tema: <code>{`GET https://retendelcasco.com/?section_id=precio-dinamico-reglas&t=<ts>`}</code> — público, sin permisos, caché máxima 15 s. Se lee el JSON de <code>{`<script id="precio-dinamico-reglas">`}</code>.</li>
                <li>Cruce (igual que el tema): primero <strong>municipio</strong> (ciudad); si no hay, <strong>departamento</strong>. Normaliza con NFD, sin tildes, minúsculas y trim.</li>
                <li>Precio real y disponibilidad desde la Admin GraphQL (<code>read_products</code>). El precio del cliente nunca se usa.</li>
                <li><code>{`precio_final = Math.round(precio_base * (1 - descuento/100))`}</code>, en COP sin decimales. <em>Descuento positivo baja el precio; negativo lo sube (Envigado −10 = +10 %).</em></li>
                <li>Se crea un <strong>borrador sin completar</strong> con <code>draftOrderCreate</code> (<code>write_draft_orders</code>) usando <code>priceOverride</code> —así se mantiene el vínculo con producto e inventario—, tag <code>precio-dinamico</code> y nota con ciudad/departamento, regla e IP. No se completa ni se marca como pagado: el cliente paga en el <code>invoiceUrl</code>.</li>
              </ol>
              <p className="mt-2 text-sm text-gray-600">
                Versión de API <code>2025-04</code> (primera con <code>priceOverride</code> en <code>DraftOrderLineItemInput</code>).
                Si no se pueden leer las reglas del tema, el endpoint responde <strong>sin descuento</strong> (el cliente paga el precio normal), igual que hace el tema.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Limpieza automática de borradores</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Tarea diaria (03:00 Bogotá) que borra los borradores con tag <code>precio-dinamico</code> en estado <strong>OPEN</strong> con más de 7 días.</li>
                <li>Evita que se acumulen checkouts abandonados. No toca los borradores completados ni pagados.</li>
                <li>Script: <code>~/.hermes/scripts/limpiar_borradores_precio_dinamico.py</code> — cron de Hermes; solo avisa cuando borra algo.</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Shopify Bridge Secret</h4>
              <p className="text-sm text-gray-600">
                El módulo <strong>ya no lo usa</strong> (la ruta <code>orders/</code> fue eliminada). Sigue en Configuración porque es el
                secreto compartido con la app compañera <code>el-reten-shopify-app-prices</code>: si lo cambias aquí, cámbialo también en su <code>.env</code>.
                Se guarda cifrado (AES-256-GCM) y la pantalla solo muestra los primeros caracteres.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}