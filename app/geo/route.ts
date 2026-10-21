import { NextRequest, NextResponse } from 'next/server';

// ============================================================
//  ⚠️ TEMPORAL — solo alias de compatibilidad.
//
//  El endpoint real vive en la ruta del módulo (convención):
//    /api/custom-module30/precios-dinamicos-ubicacion-shopify/geo
//
//  Este archivo existe únicamente para no romper navegadores/temas
//  que aún tengan cacheada la URL antigua `https://workers.zeroazul.com/geo`.
//  NO agregar lógica aquí: toda la implementación está en el módulo 30.
//  Se puede eliminar cuando la nueva URL lleve un tiempo en producción.
// ============================================================

const TARGET = '/api/custom-module30/precios-dinamicos-ubicacion-shopify/geo/';

const ALLOWED_ORIGINS = [
  'https://retendelcasco.com',
  'https://www.retendelcasco.com',
  'https://el-reten-del-casco.myshopify.com',
];

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store');
  headers.set('Vary', 'Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    // Se necesitan los headers CORS también en el 308: el navegador hace
    // el chequeo CORS de la petición original antes de seguir el redirect.
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function GET(req: NextRequest) {
  return new NextResponse(null, {
    status: 308,
    headers: { ...Object.fromEntries(corsHeaders(req.headers.get('origin')).entries()), Location: TARGET },
  });
}