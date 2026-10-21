import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';
import {
  clearRulesCache,
  fetchRulesFromShopify,
  rulesCacheStatus,
} from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-rules';

// ============================================================
//  Módulo 30 — Invalidación de la caché de reglas del endpoint /geo/
//    POST https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/revalidate/
//
//  Sirve para que los cambios del metaobjeto se vean AL INSTANTE (sin esperar
//  los 60 s de TTL). Dos formas de autenticar:
//    1) Webhook de Shopify (metaobjects/update · create · delete):
//       X-Shopify-Hmac-Sha256 = base64(HMAC-SHA256(cuerpo, shopify_webhook_secret))
//    2) Llamada interna: x-za-signature = hex(HMAC-SHA256(cuerpo, shopify_bridge_secret))
//       o Authorization: Bearer <shopify_bridge_secret>
//
//  En pm2 cluster la caché vive en cada worker: esta petición limpia la del
//  worker que la atiende y el resto refresca como máximo en 60 s.
// ============================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export async function POST(req: NextRequest) {
  try {
    const config = await getRuntimeConfig();
    const webhookSecret = String(config.shopifyWebhookSecret || '').trim();
    const bridgeSecret = String(config.shopifyBridgeSecret || '').trim();

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody || '') > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: 'Payload demasiado grande' }, { status: 413 });
    }

    // 1) Webhook de Shopify
    const shopifyHmac = req.headers.get('x-shopify-hmac-sha256') || '';
    let authorized = false;
    if (shopifyHmac && webhookSecret) {
      const expectedB64 = createHmac('sha256', webhookSecret).update(rawBody || '').digest('base64');
      authorized = safeEqual(shopifyHmac, expectedB64);
    }

    // 2) Llamada interna firmada con el bridge secret
    if (!authorized && bridgeSecret) {
      const signature = req.headers.get('x-za-signature') || '';
      const expectedHex = createHmac('sha256', bridgeSecret).update(rawBody || '').digest('hex');
      authorized = Boolean(signature) && safeEqual(signature, expectedHex);

      if (!authorized) {
        const auth = req.headers.get('authorization') || '';
        const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
        authorized = Boolean(bearer) && safeEqual(bearer, bridgeSecret);
      }
    }

    if (!authorized) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No autorizado',
          hint: 'Firma con X-Shopify-Hmac-Sha256 (webhook) o x-za-signature / Bearer (bridge secret).',
        },
        { status: 401 }
      );
    }

    clearRulesCache();

    let topic = req.headers.get('x-shopify-topic') || null;
    if (!topic && rawBody) {
      try {
        topic = JSON.parse(rawBody)?.topic ?? null;
      } catch {
        /* cuerpo no JSON: se ignora */
      }
    }

    // Vuelve a leer las reglas para confirmar que el metaobjeto es accesible
    // (útil para diagnosticar el permiso read_metaobjects sin abrir el endpoint público).
    let check: Record<string, unknown> = {};
    const qs = new URL(req.url).searchParams;
    if (qs.get('check') !== '0') {
      try {
        const fresh = await fetchRulesFromShopify();
        check = {
          ok: fresh.ok,
          count: fresh.rules.length,
          error: fresh.error ?? null,
          access_denied: Boolean(fresh.accessDenied),
          sample: fresh.rules.slice(0, 3),
        };
      } catch (err: any) {
        check = { ok: false, error: err?.message || 'error leyendo metaobjetos' };
      }
    }

    return NextResponse.json({
      ok: true,
      invalidated: true,
      topic,
      cache: rulesCacheStatus(),
      reglas: check,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}

/** Ayuda del endpoint (sin secretos). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/revalidate/',
    auth: [
      'Webhook Shopify: header X-Shopify-Hmac-Sha256 = base64(HMAC-SHA256(body, shopify_webhook_secret))',
      'Interno: header x-za-signature = hex(HMAC-SHA256(body, shopify_bridge_secret)) o Authorization: Bearer <secret>',
    ],
    efecto: 'Limpia la caché de reglas (TTL 60 s) para que los cambios del metaobjeto se vean al instante.',
  });
}