import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import maxmind, { CityResponse, Reader } from 'maxmind';

// ============================================================
//  Módulo 30 — Precios dinámicos por ubicación (Shopify / El Retén del Casco)
//  Endpoint público (convención de módulos):
//    GET https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/
//
//  Devuelve ÚNICAMENTE la ubicación real del visitante (GeoLite2 local + IP real).
//  Las reglas de descuento las lee el tema de Shopify directamente del metaobjeto
//  (Section Rendering API, sin caché) — este endpoint NO las consulta ni las cruza.
//
//  Sin caché HTTP (Cache-Control: no-store) y CORS solo para los 3 orígenes.
// ============================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

const MMDB_PATH = path.join(process.cwd(), 'data', 'geoip', 'GeoLite2-City.mmdb');

let readerPromise: Promise<Reader<CityResponse>> | null = null;
function getReader(): Promise<Reader<CityResponse>> {
  if (!readerPromise) {
    readerPromise = maxmind.open<CityResponse>(MMDB_PATH).catch((err) => {
      readerPromise = null;
      throw err;
    });
  }
  return readerPromise;
}

function realClientIp(req: NextRequest): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  const anyReq = req as unknown as { ip?: string | null };
  return anyReq.ip ?? null;
}

function buildHeaders(origin: string | null): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  headers.set('Vary', 'Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildHeaders(req.headers.get('origin')) });
}

export async function GET(req: NextRequest) {
  const headers = buildHeaders(req.headers.get('origin'));

  let ciudad: string | null = null;
  let region: string | null = null;
  let pais: string | null = null;
  let latitud: number | null = null;
  let longitud: number | null = null;

  try {
    const ip = realClientIp(req);
    if (ip) {
      const reader = await getReader();
      const r = reader.get(ip);
      if (r) {
        ciudad = r.city?.names?.es ?? r.city?.names?.en ?? null;
        region = r.subdivisions?.[0]?.names?.es ?? r.subdivisions?.[0]?.names?.en ?? null;
        pais = r.country?.iso_code ?? null;
        latitud = r.location?.latitude ?? null;
        longitud = r.location?.longitude ?? null;
      }
    }
  } catch (err) {
    console.error('[geo] error resolviendo ubicación:', err);
  }

  return NextResponse.json(
    { fuente: 'zeroazul', ciudad, region, pais, latitud, longitud },
    { status: 200, headers }
  );
}