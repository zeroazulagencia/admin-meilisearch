import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import maxmind, { CityResponse, Reader } from 'maxmind';
import { getRules, matchRule } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-rules';

// ============================================================
//  Módulo 30 — Precios dinámicos por ubicación (Shopify / El Retén del Casco)
//  Endpoint público (convención de módulos):
//    GET https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/
//
//  Devuelve la ubicación REAL del visitante (GeoLite2 local + IP real) y la
//  regla de descuento vigente para su municipio/departamento, leída de un
//  metaobjeto de Shopify (tipo "municipiosxdescuento") vía Admin API GraphQL.
//
//  Reglas: ver utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-rules.ts
//    - solo entradas ACTIVE, caché 60 s invalidable vía POST .../geo/revalidate/
//    - si Shopify/token fallan -> regla=null y descuento=0 (no rompe el tema)
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

  // Regla vigente para esa ubicación. Si no coincide nada -> regla null, descuento 0.
  let regla: Record<string, unknown> | null = null;
  let descuento = 0;
  try {
    const { rules } = await getRules();
    const match = matchRule(rules, ciudad, region);
    regla = match.regla;
    descuento = match.descuento;
  } catch (err) {
    console.error('[geo] error cruzando reglas:', err);
  }

  return NextResponse.json(
    { fuente: 'zeroazul', ciudad, region, pais, latitud, longitud, regla, descuento },
    { status: 200, headers }
  );
}