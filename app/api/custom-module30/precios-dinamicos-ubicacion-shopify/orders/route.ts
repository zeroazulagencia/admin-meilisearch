import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';

export const dynamic = 'force-dynamic';

const SHOPIFY_API_VERSION = '2024-10';
const MAX_BODY_BYTES = 256 * 1024; // 256 KB

/** Comparación de strings en tiempo constante. */
function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

/** Extrae el id numérico desde un id o GID de Shopify. */
function numericId(value: any): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  const last = raw.split('/').pop() || raw;
  const n = Number(last);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response.text().then((text) => ({ raw: text.slice(0, 800) })).catch(() => ({ raw: '' }));
  }
  return response.json().catch(() => ({ raw: 'invalid_json' }));
}

/** Normaliza una línea. Acepta variant_id (id o GID) o ítem personalizado (title + price). */
function normalizeLineItem(item: any) {
  if (!item || typeof item !== 'object') return null;

  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const variantId = numericId(item.variant_id);

  if (variantId) {
    const out: any = { variant_id: variantId, quantity };
    if (item.price != null) out.price = String(item.price);
    return out;
  }

  const title = item.title ? String(item.title).trim() : '';
  const price = item.price != null ? Number(item.price) : NaN;
  if (title && Number.isFinite(price)) {
    return { title, price: price.toFixed(2), quantity };
  }

  return null;
}

function shopifyHeaders(adminToken: string): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken };
}

function normalizeResultOrder(o: any, domain: string) {
  return {
    id: o?.id ?? null,
    name: o?.name ?? null,
    order_number: o?.order_number ?? null,
    financial_status: o?.financial_status ?? null,
    fulfillment_status: o?.fulfillment_status ?? null,
    total_price: o?.total_price ?? null,
    subtotal_price: o?.subtotal_price ?? null,
    currency: o?.currency ?? null,
    test: o?.test ?? false,
    created_at: o?.created_at ?? null,
    email: o?.email ?? null,
    admin_url: o?.id ? `https://${domain}/admin/orders/${o.id}` : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const config = await getRuntimeConfig();

    const secret = String(config.shopifyBridgeSecret || '').trim();
    const domain = String(config.shopifyShopDomain || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const adminToken = String(config.shopifyAdminAccessToken || '').trim();

    if (!secret) {
      return NextResponse.json({ ok: false, error: 'shopify_bridge_secret no configurado' }, { status: 500 });
    }
    if (!domain || !adminToken) {
      return NextResponse.json({ ok: false, error: 'Shopify no configurado (domain/token)' }, { status: 500 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody || '') > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'Payload demasiado grande' }, { status: 413 });
    }

    // --- Autenticación ---
    // 1) Firma HMAC-SHA256 del cuerpo crudo en x-za-signature (igual que el bridge del módulo 17)
    const signature = request.headers.get('x-za-signature') || '';
    const expected = createHmac('sha256', secret).update(rawBody || '{}').digest('hex');
    let authorized = safeEqual(signature, expected);

    // 2) Alternativa: Authorization: Bearer <shopify_bridge_secret>
    if (!authorized) {
      const auth = request.headers.get('authorization') || '';
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
      authorized = Boolean(bearer) && safeEqual(bearer, secret);
    }

    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    // --- Parseo del cuerpo ---
    let parsed: any = {};
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
    }

    const input = parsed.order && typeof parsed.order === 'object' ? parsed.order : parsed;
    const dryRun = parsed.dry_run === true || input.dry_run === true;
    const method = String(input.method || parsed.method || 'auto').toLowerCase(); // auto | order | draft
    const completeDraft = input.complete !== false;
    const paymentPending = input.payment_pending === true;

    if (!Array.isArray(input.line_items) || input.line_items.length === 0) {
      return NextResponse.json({ ok: false, error: 'line_items es requerido (array no vacío)' }, { status: 400 });
    }

    const lineItems = input.line_items.map(normalizeLineItem).filter(Boolean);
    if (lineItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Cada línea necesita variant_id o (title + price)' },
        { status: 400 }
      );
    }

    const sharedFields = (target: any) => {
      if (input.email) target.email = String(input.email).trim();
      if (input.phone) target.phone = String(input.phone).trim();
      if (input.financial_status) target.financial_status = String(input.financial_status).trim();
      if (input.note) target.note = String(input.note);
      if (input.tags) target.tags = String(input.tags);
      if (input.locale) target.locale = String(input.locale);
      if (input.customer && typeof input.customer === 'object') target.customer = input.customer;
      if (input.shipping_address && typeof input.shipping_address === 'object') target.shipping_address = input.shipping_address;
      return target;
    };

    // ---------------- Vía 1: Order directo (requiere scope write_orders) ----------------
    const buildOrderPayload = () => {
      const order: any = { line_items: lineItems };
      sharedFields(order);
      if (input.currency) order.currency = String(input.currency).trim().toUpperCase();
      if (input.billing_address && typeof input.billing_address === 'object') order.billing_address = input.billing_address;
      if (input.send_receipt != null) order.send_receipt = Boolean(input.send_receipt);
      if (input.send_fulfillment_receipt != null) order.send_fulfillment_receipt = Boolean(input.send_fulfillment_receipt);
      if (input.test != null) order.test = Boolean(input.test);
      if (input.source_name) order.source_name = String(input.source_name);
      // Los pedidos creados por API NO descuentan inventario salvo que se indique.
      order.inventory_behaviour = input.inventory_behaviour
        ? String(input.inventory_behaviour)
        : 'decrement_obeying_policy';
      return order;
    };

    // ---------------- Vía 2: Draft order + completar (requiere write_draft_orders) ----------------
    const buildDraftPayload = () => {
      const draft: any = { line_items: lineItems };
      sharedFields(draft);
      if (input.reserve_inventory != null) draft.reserve_inventory = Boolean(input.reserve_inventory);
      if (input.use_customer_default_address != null) draft.use_customer_default_address = Boolean(input.use_customer_default_address);
      return draft;
    };

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        method,
        payload: method === 'draft' ? { draft_order: buildDraftPayload() } : { order: buildOrderPayload() },
      });
    }

    const errors: any[] = [];

    if (method === 'order' || method === 'auto') {
      const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json`, {
        method: 'POST',
        headers: shopifyHeaders(adminToken),
        body: JSON.stringify({ order: buildOrderPayload() }),
        cache: 'no-store',
      });
      const json: any = await safeJson(res);

      if (res.ok) {
        return NextResponse.json({ ok: true, via: 'orders', order: normalizeResultOrder(json?.order, domain) });
      }

      const detail = json?.errors || json;
      const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
      const missingWriteOrders = res.status === 403 && /write_orders/i.test(detailStr);

      if (!missingWriteOrders || method === 'order') {
        return NextResponse.json(
          {
            ok: false,
            error: 'Shopify rechazó la creación del pedido',
            via: 'orders',
            shopify_status: res.status,
            details: detail,
            hint: missingWriteOrders
              ? 'El token no tiene el scope write_orders. Usa method:"draft" o consigue aprobación del comerciante para write_orders.'
              : undefined,
          },
          { status: res.status === 422 ? 422 : res.status === 429 ? 429 : 502 }
        );
      }

      errors.push({ via: 'orders', status: res.status, details: detail });
      // sin write_orders -> cae a la vía de draft orders
    }

    // ---- Vía draft ----
    const draftRes = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json`, {
      method: 'POST',
      headers: shopifyHeaders(adminToken),
      body: JSON.stringify({ draft_order: buildDraftPayload() }),
      cache: 'no-store',
    });
    const draftJson: any = await safeJson(draftRes);

    if (!draftRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Shopify rechazó la creación del borrador de pedido',
          via: 'draft',
          shopify_status: draftRes.status,
          details: draftJson?.errors || draftJson,
          previous_errors: errors.length ? errors : undefined,
        },
        { status: draftRes.status === 422 ? 422 : draftRes.status === 403 ? 502 : 502 }
      );
    }

    const draft = draftJson?.draft_order || {};

    if (!completeDraft) {
      return NextResponse.json({
        ok: true,
        via: 'draft',
        completed: false,
        draft_order: {
          id: draft.id ?? null,
          name: draft.name ?? null,
          status: draft.status ?? null,
          total_price: draft.total_price ?? null,
          invoice_url: draft.invoice_url ?? null,
          admin_url: draft.id ? `https://${domain}/admin/draft_orders/${draft.id}` : null,
        },
      });
    }

    const completeUrl = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${draft.id}/complete.json${paymentPending ? '?payment_pending=true' : ''}`;
    const completeRes = await fetch(completeUrl, {
      method: 'PUT',
      headers: shopifyHeaders(adminToken),
      cache: 'no-store',
    });
    const completeJson: any = await safeJson(completeRes);

    if (!completeRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Borrador creado pero no se pudo completar',
          via: 'draft',
          draft_order_id: draft.id ?? null,
          shopify_status: completeRes.status,
          details: completeJson?.errors || completeJson,
        },
        { status: completeRes.status === 422 ? 422 : 502 }
      );
    }

    const completedOrder = completeJson?.draft_order?.order || completeJson?.order || {};
    return NextResponse.json({
      ok: true,
      via: 'draft_order_completed',
      draft_order_id: draft.id ?? null,
      order: normalizeResultOrder(completedOrder, domain),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno creando el pedido' }, { status: 500 });
  }
}

/** Ayuda del endpoint (sin secretos). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/custom-module30/precios-dinamicos-ubicacion-shopify/orders/',
    auth: 'Header x-za-signature = HMAC-SHA256(rawBody, shopify_bridge_secret)  ·  o Authorization: Bearer <shopify_bridge_secret>',
    body: {
      line_items: '[{ variant_id: 123456789, quantity: 1 }]  ·  o  [{ title, price, quantity }]',
      method: 'auto | order | draft   (auto: intenta order y cae a draft si falta write_orders)',
      email: 'opcional',
      financial_status: 'pending | paid | ... (opcional)',
      note: 'opcional',
      tags: 'opcional',
      shipping_address: 'opcional (objeto Shopify)',
      complete: 'default true — solo vía draft: completar el borrador para generar el pedido',
      payment_pending: 'default false — completar el borrador marcándolo como pago pendiente',
      inventory_behaviour: 'default: decrement_obeying_policy (solo vía order)',
      test: 'true para marcar el pedido como TEST (opcional)',
      dry_run: 'true para validar sin crear nada (opcional)',
    },
  });
}