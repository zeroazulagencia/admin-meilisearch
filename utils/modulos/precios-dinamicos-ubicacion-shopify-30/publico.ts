import { NextResponse } from 'next/server';
import { hmacHex, igualSeguro } from '@/utils/server-secret';

// ============================================================
//  Módulo 30 — piezas compartidas por los endpoints PÚBLICOS
//  (checkout/ y checkout/estado/): CORS, rate limit, Admin GraphQL
//  y el token que liga un borrador con quien lo creó.
// ============================================================

export const SHOPIFY_API_VERSION = '2025-04'; // priceOverride en DraftOrderLineItemInput
export const TAG_DRAFT = 'precio-dinamico';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

export function corsHeaders(origin: string | null, metodos: string): Record<string, string> {
  const h: Record<string, string> = {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': `${metodos}, OPTIONS`,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export function responderCors(
  body: unknown,
  status: number,
  origin: string | null,
  metodos: string,
  extra?: Record<string, string>
) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(origin, metodos), ...(extra || {}) } });
}

/** Rate limit por IP (ventana deslizante, en memoria). Devuelve una función `excede(ip)`. */
export function crearLimitador(max: number, ventanaMs: number) {
  const accesos = new Map<string, number[]>();

  return function excedeLimite(ip: string | null): boolean {
    const clave = ip || 'desconocida';
    const ahora = Date.now();
    const previos = (accesos.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (previos.length >= max) {
      accesos.set(clave, previos);
      return true;
    }
    previos.push(ahora);
    accesos.set(clave, previos);

    if (accesos.size > 5000) {
      for (const [k, v] of Array.from(accesos.entries())) {
        const ultimo = v.length ? v[v.length - 1] : 0;
        if (!ultimo || ahora - ultimo > ventanaMs) accesos.delete(k);
      }
    }
    return false;
  };
}

export async function adminGraphQL(
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

/**
 * Token del borrador: solo quien recibió la respuesta de checkout/ puede consultar
 * su estado (los IDs de borrador son secuenciales y se podrían adivinar).
 */
export function tokenEstado(draftOrderId: number): string {
  return hmacHex('mod30-estado-borrador', String(draftOrderId)).slice(0, 32);
}

export function tokenEstadoValido(draftOrderId: number, token: string): boolean {
  return igualSeguro(tokenEstado(draftOrderId), String(token || ''));
}
