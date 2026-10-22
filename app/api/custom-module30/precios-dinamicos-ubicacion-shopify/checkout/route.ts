import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';
import { registrarPedido, type ResultadoPedido } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/pedidos-log';
import { ipConfiable, ubicarIp, type Ubicacion } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';
import {
  cruzarRegla,
  parseReglas,
  precioUnitario,
  validarEntrada,
  type ItemEntrada,
  type ReglaPrecio,
} from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/precio-dinamico';

// ============================================================
//  Módulo 30 — Endpoint PÚBLICO de checkout con precio dinámico
//
//  El botón de pago corre en el NAVEGADOR del cliente, así que este endpoint
//  NO usa secretos: el servidor resuelve TODO (ubicación, regla, precio).
//  El cliente solo puede mandar variant_id + quantity. Cualquier precio,
//  descuento o dato extra que envíe se IGNORA.
//
//  POST /checkout/  (barra final obligatoria: trailingSlash -> 308 sin ella)
// ============================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SHOPIFY_API_VERSION = '2025-04'; // priceOverride en DraftOrderLineItemInput
const REGLAS_URL = 'https://retendelcasco.com/?section_id=precio-dinamico-reglas';
const REGLAS_TTL_MS = 15_000; // caché máxima 15 s
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const TAG_DRAFT = 'precio-dinamico';
const CURRENCY = 'COP';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function responder(body: unknown, status: number, origin: string | null, extra?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(origin), ...(extra || {}) } });
}

// ---------- rate limit por IP (ventana deslizante, en memoria) ----------
const accesos = new Map<string, number[]>();

function excedeLimite(ip: string | null): boolean {
  const clave = ip || 'desconocida';
  const ahora = Date.now();
  const previos = (accesos.get(clave) || []).filter((t) => ahora - t < RATE_LIMIT_WINDOW_MS);
  if (previos.length >= RATE_LIMIT_MAX) {
    accesos.set(clave, previos);
    return true;
  }
  previos.push(ahora);
  accesos.set(clave, previos);

  if (accesos.size > 5000) {
    for (const [k, v] of Array.from(accesos.entries())) {
      const ultimo = v.length ? v[v.length - 1] : 0;
      if (!ultimo || ahora - ultimo > RATE_LIMIT_WINDOW_MS) accesos.delete(k);
    }
  }
  return false;
}

// ---------- reglas del tema (Section Rendering API, público) ----------
let cacheReglas: { at: number; reglas: ReglaPrecio[] } | null = null;

async function obtenerReglas(): Promise<ReglaPrecio[]> {
  if (cacheReglas && Date.now() - cacheReglas.at < REGLAS_TTL_MS) {
    return cacheReglas.reglas;
  }

  try {
    const url = `${REGLAS_URL}&t=${Date.now()}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al leer reglas`);

    const html = await res.text();
    const reglas = parseReglas(html);
    cacheReglas = { at: Date.now(), reglas };
    if (reglas.length === 0) {
      console.warn('[checkout] el tema devolvió 0 reglas (¿script #precio-dinamico-reglas ausente?)');
    }
    return reglas;
  } catch (err) {
    console.error('[checkout] no se pudieron leer las reglas del tema:', err);
    // Fail-open: si ya hubo una lectura buena, se usa; si no, se responde sin regla
    // (el cliente paga el precio normal, igual que hace el tema ante un fallo).
    return cacheReglas ? cacheReglas.reglas : [];
  }
}

// ---------- Admin GraphQL ----------
async function adminGraphQL(
  domain: string,
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const QUERY_VARIANTES = `
  query($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on ProductVariant {
        id
        price
        inventoryQuantity
        availableForSale
        inventoryPolicy
        product { id title status }
      }
    }
  }
`;

const MUT_DRAFT = `
  mutation($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl totalPrice status }
      userErrors { field message }
    }
  }
`;

interface Variante {
  gid: string;
  precioBase: number;
  disponible: boolean;
  titulo: string | null;
}

async function leerVariantes(
  domain: string,
  token: string,
  items: ItemEntrada[]
): Promise<Map<number, Variante> | null> {
  const gids = items.map((i) => `gid://shopify/ProductVariant/${i.variant_id}`);
  const { status, data } = await adminGraphQL(domain, token, QUERY_VARIANTES, { ids: gids });
  if (status !== 200) throw new Error(`GraphQL HTTP ${status}`);

  const nodos = data?.data?.nodes;
  if (!Array.isArray(nodos)) throw new Error('respuesta GraphQL inesperada');

  const mapa = new Map<number, Variante>();
  nodos.forEach((n: any, idx: number) => {
    if (!n || n.__typename !== 'ProductVariant' || !n.id) return;
    const vid = Number(String(n.id).split('/').pop());
    const precioBase = Number(n.price);
    mapa.set(vid, {
      gid: n.id,
      precioBase: Number.isFinite(precioBase) ? precioBase : 0,
      disponible: n.availableForSale === true && n.product?.status === 'ACTIVE',
      titulo: n.product?.title ?? null,
    });
  });
  return mapa;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const inicio = Date.now();

  // Contexto para el log de pedidos (se va llenando según avanza la solicitud)
  const ctx: {
    ip: string | null;
    items?: ItemEntrada[];
    ubicacion?: Ubicacion;
    regla?: ReglaPrecio | null;
    lineas?: unknown;
  } = { ip: null };

  // Responde y deja constancia en el log (retención 5 días). Los 429 no se registran
  // para que un flood no llene la tabla.
  const fin = (body: any, status: number, extra?: Record<string, string>) => {
    if (status !== 429) {
      const resultado: ResultadoPedido =
        status >= 500 ? 'error'
          : status >= 400 ? 'rechazado'
            : body?.dry_run ? 'dry_run'
              : body?.checkout_url ? 'draft_creado'
                : 'sin_descuento';
      void registrarPedido({
        http_status: status,
        resultado,
        error: body?.ok === false ? body.error : null,
        ip: ctx.ip,
        origin,
        user_agent: request.headers.get('user-agent'),
        ciudad: ctx.ubicacion?.ciudad ?? null,
        region: ctx.ubicacion?.region ?? null,
        regla: ctx.regla?.nombre ?? null,
        descuento: ctx.regla ? ctx.regla.descuento : (ctx.ubicacion ? 0 : null),
        items: ctx.items ?? null,
        lineas: ctx.lineas ?? null,
        draft_order_id: body?.draft_order_id ?? null,
        duracion_ms: Date.now() - inicio,
      });
    }
    return responder(body, status, origin, extra);
  };

  try {
    // --- 0) IP real (solo cabeceras que pone nuestro nginx) ---
    const ip = ipConfiable(request.headers);
    ctx.ip = ip;

    if (excedeLimite(ip)) {
      return fin(
        { ok: false, error: 'Demasiadas solicitudes, intenta de nuevo en un minuto' },
        429,
        { 'Retry-After': '60' }
      );
    }

    // --- 1) Entrada: SOLO items[{variant_id, quantity}] ---
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody || '') > MAX_BODY_BYTES) {
      return fin({ ok: false, error: 'Payload demasiado grande' }, 413);
    }

    let body: any = null;
    try {
      body = JSON.parse(rawBody || '{}');
    } catch {
      return fin({ ok: false, error: 'JSON inválido' }, 400);
    }

    const validacion = validarEntrada(body);
    if (!validacion.ok) {
      return fin({ ok: false, error: validacion.error }, 400);
    }
    const items = validacion.items;
    ctx.items = items;
    const dryRun = body?.dry_run === true;

    // --- 2) Config de Shopify ---
    const config = await getRuntimeConfig();
    const domain = String(config.shopifyShopDomain || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const adminToken = String(config.shopifyAdminAccessToken || '').trim();
    if (!domain || !adminToken) {
      console.error('[checkout] Shopify sin configurar (domain/token)');
      return fin({ ok: false, error: 'Tienda no configurada' }, 502);
    }

    // --- 3) Ubicación del visitante ---
    const ubicacion: Ubicacion = await ubicarIp(ip);
    ctx.ubicacion = ubicacion;

    // --- 4) Reglas del tema + cruce (municipio primero, luego departamento) ---
    const reglas = await obtenerReglas();
    const regla = cruzarRegla(reglas, ubicacion.ciudad, ubicacion.region);
    ctx.regla = regla;

    // --- 5) Sin regla o descuento 0 -> precio normal, el tema sigue su curso ---
    if (!regla || regla.descuento === 0) {
      if (!dryRun) {
        return fin(
          {
            ok: true,
            checkout_url: null,
            descuento: 0,
            regla: null,
            ubicacion: { ciudad: ubicacion.ciudad, region: ubicacion.region },
          },
          200
        );
      }
    }

    // --- 6) Precios reales desde Shopify (nunca del cliente) ---
    let variantes: Map<number, Variante>;
    try {
      variantes = (await leerVariantes(domain, adminToken, items)) || new Map();
    } catch (err) {
      console.error('[checkout] fallo consultando variantes:', err);
      return fin({ ok: false, error: 'No se pudo consultar la tienda' }, 502);
    }

    const lineas: Array<{
      variant_id: number;
      quantity: number;
      titulo: string | null;
      precio_base: number;
      precio_final: number;
      gid: string;
    }> = [];

    for (const it of items) {
      const v = variantes.get(it.variant_id);
      if (!v || !v.disponible) {
        return fin(
          { ok: false, error: 'Variante no encontrada o no disponible', variant_id: it.variant_id },
          404
        );
      }
      const descuentoAplicado = regla ? regla.descuento : 0;
      lineas.push({
        variant_id: it.variant_id,
        quantity: it.quantity,
        titulo: v.titulo,
        precio_base: v.precioBase,
        precio_final: precioUnitario(v.precioBase, descuentoAplicado),
        gid: v.gid,
      });
    }

    const descuento = regla ? regla.descuento : 0;
    ctx.lineas = lineas.map((l) => ({
      variant_id: l.variant_id,
      quantity: l.quantity,
      titulo: l.titulo,
      precio_base: l.precio_base,
      precio_final: l.precio_final,
    }));
    const reglaResp = regla ? { municipio: regla.nombre, descuento: regla.descuento } : null;

    // --- 7) dry_run: cálculo sin crear nada ---
    if (dryRun) {
      return fin(
        {
          ok: true,
          dry_run: true,
          checkout_url: null,
          descuento,
          regla: reglaResp,
          ubicacion: { ciudad: ubicacion.ciudad, region: ubicacion.region },
          lineas: lineas.map((l) => ({
            variant_id: l.variant_id,
            quantity: l.quantity,
            titulo: l.titulo,
            precio_base: l.precio_base,
            precio_final: l.precio_final,
          })),
        },
        200
      );
    }

    // --- 8) Borrador SIN completar, con priceOverride (mantiene vínculo producto+inventario) ---
    const nota = [
      'Precio dinámico',
      `${ubicacion.ciudad || '-'}/${ubicacion.region || '-'}`,
      regla ? `regla ${regla.nombre} ${regla.descuento}%` : 'sin regla',
      `IP ${ip || '-'}`,
    ].join(' · ');

    const input = {
      lineItems: lineas.map((l) => ({
        variantId: l.gid,
        quantity: l.quantity,
        priceOverride: { amount: l.precio_final.toFixed(2), currencyCode: CURRENCY },
      })),
      tags: [TAG_DRAFT],
      note: nota,
    };

    const { status, data } = await adminGraphQL(domain, adminToken, MUT_DRAFT, { input });
    if (status !== 200) {
      console.error('[checkout] draftOrderCreate HTTP', status, JSON.stringify(data).slice(0, 500));
      return fin({ ok: false, error: 'No se pudo crear el checkout' }, 502);
    }

    const errores = data?.data?.draftOrderCreate?.userErrors;
    if (Array.isArray(errores) && errores.length > 0) {
      console.error('[checkout] draftOrderCreate userErrors:', JSON.stringify(errores).slice(0, 500));
      return fin({ ok: false, error: 'No se pudo crear el checkout' }, 502);
    }

    const draft = data?.data?.draftOrderCreate?.draftOrder;
    if (!draft?.invoiceUrl) {
      console.error('[checkout] draftOrderCreate sin invoiceUrl:', JSON.stringify(data).slice(0, 500));
      return fin({ ok: false, error: 'No se pudo crear el checkout' }, 502);
    }

    return fin(
      {
        ok: true,
        checkout_url: draft.invoiceUrl,
        draft_order_id: draft.id ? Number(String(draft.id).split('/').pop()) : null,
        descuento,
        regla: reglaResp,
        ubicacion: { ciudad: ubicacion.ciudad, region: ubicacion.region },
      },
      200
    );
  } catch (err) {
    // Sin exponer detalles internos
    console.error('[checkout] error inesperado:', err);
    return fin({ ok: false, error: 'Error interno' }, 500);
  }
}