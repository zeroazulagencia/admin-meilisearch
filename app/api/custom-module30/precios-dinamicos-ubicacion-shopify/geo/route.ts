import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import maxmind, { CityResponse, Reader } from 'maxmind';

// ============================================================
//  Módulo 30 — Precios dinámicos por ubicación (Shopify)
//  Endpoint público (convención de módulos):
//    GET https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo
//
//  - La petición la origina el NAVEGADOR del visitante (fetch
//    desde el snippet precio-dinamico.liquid en la tienda), por
//    lo que la conexión entrante trae la IP real del visitante.
//  - IP real = CF-Connecting-IP (si hay Cloudflare) →
//    primer valor de X-Forwarded-For (nginx/proxy) → X-Real-IP →
//    IP de la conexión directa.
//  - Ciudad/región/país resueltos con la base LOCAL GeoLite2-City
//    de MaxMind (sin llamadas a APIs externas en cada visita).
// ============================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

const MMDB_PATH = path.join(process.cwd(), 'data', 'geoip', 'GeoLite2-City.mmdb');

// Singleton: la base se abre una sola vez por proceso.
let readerPromise: Promise<Reader<CityResponse>> | null = null;
function getReader(): Promise<Reader<CityResponse>> {
  if (!readerPromise) {
    readerPromise = maxmind.open<CityResponse>(MMDB_PATH).catch((err) => {
      // Si falla, permitir reintento en la siguiente petición.
      readerPromise = null;
      throw err;
    });
  }
  return readerPromise;
}

function realClientIp(req: NextRequest): string | null {
  // 1) Cloudflare
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  // 2) Primer valor de X-Forwarded-For (el cliente original)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  // 3) X-Real-IP (nginx)
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  // 4) IP de la conexión (fallback)
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
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: buildHeaders(origin) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = buildHeaders(origin);

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
        region =
          r.subdivisions?.[0]?.names?.es ??
          r.subdivisions?.[0]?.names?.en ??
          null;
        pais = r.country?.iso_code ?? null;
        latitud = r.location?.latitude ?? null;
        longitud = r.location?.longitude ?? null;
      }
    }
  } catch (err) {
    console.error('[geo] error resolviendo ubicación:', err);
    // Se responde igual con el formato exacto (valores null) para que el
    // script de la tienda nunca tenga que cambiar de forma.
  }

  return NextResponse.json(
    { fuente: 'zeroazul', ciudad, region, pais, latitud, longitud },
    { status: 200, headers }
  );
}