import { NextRequest, NextResponse } from 'next/server';
import { ipConfiable, ubicarIp } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';

// ============================================================
//  Módulo 30 — /geo/  (SOLO ubicación)
//
//  El TEMA (Shopify) consume este endpoint para mostrar la ciudad del visitante.
//  Las REGLAS de descuento NO viven aquí: el tema las lee del metaobjeto
//  `municipiosxdescuento` vía Section Rendering API. No reintroducir reglas,
//  descuentos ni llamadas a la Admin API en este endpoint.
//
//  La IP se resuelve con `ipConfiable()` (solo X-Real-IP / último XFF de nginx).
// ============================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const ip = ipConfiable(request.headers);
  const u = await ubicarIp(ip);

  return NextResponse.json(
    {
      fuente: 'zeroazul',
      ciudad: u.ciudad,
      region: u.region,
      pais: u.pais,
      latitud: u.latitud,
      longitud: u.longitud,
    },
    { status: 200, headers: corsHeaders(origin) }
  );
}