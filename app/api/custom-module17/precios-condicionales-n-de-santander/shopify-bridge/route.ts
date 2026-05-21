import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-condicionales-17/config';

export const dynamic = 'force-dynamic';

type BridgeBody = {
  ip?: string;
  shipping_state?: string;
  shipping_country_code?: string;
  cart_id?: string;
  customer_id?: string;
};

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function POST(request: NextRequest) {
  const config = await getRuntimeConfig();

  if (!config.shopifyBridgeSecret) {
    return NextResponse.json({ ok: false, error: 'shopify_bridge_secret no configurado' }, { status: 500 });
  }

  const rawBody = await request.text();
  let body: BridgeBody = {};

  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const signature = request.headers.get('x-za-signature') || '';
  const expected = signPayload(config.shopifyBridgeSecret, rawBody || '{}');

  if (!safeEqual(signature, expected)) {
    return NextResponse.json({ ok: false, error: 'Firma inválida' }, { status: 401 });
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '');
  const origin = forwardedHost ? `${protocol}://${forwardedHost}` : request.nextUrl.origin;

  const evaluateRes = await fetch(`${origin}/api/custom-module17/precios-condicionales-n-de-santander/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const evaluateJson = await evaluateRes.json();

  return NextResponse.json({
    ok: evaluateRes.ok,
    ...evaluateJson,
  }, { status: evaluateRes.status });
}
