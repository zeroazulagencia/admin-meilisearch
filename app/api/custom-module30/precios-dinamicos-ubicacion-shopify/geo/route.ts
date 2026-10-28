import { NextRequest, NextResponse } from 'next/server';
import { ipConfiable } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';
import { corsHeaders, crearLimitador, responderCors } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/publico';
import { resolverUbicacion } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/ubicacion';

// ============================================================
//  Módulo 30 — /geo/  ubicación del visitante + regla aplicable
//
//  GET /geo/?lat=<num>&lng=<num>&acc=<metros>   (coordenadas opcionales)
//  Decide con resolverUbicacion() (gps → ip-movil → ip), la MISMA función que
//  usa /checkout/. El tema usa `regla` tal cual: el backend es la única fuente
//  de verdad del descuento.
// ============================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const excedeLimite = crearLimitador(60, 60_000);

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin'), 'GET') });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const ip = ipConfiable(request.headers);

  if (excedeLimite(ip)) {
    return responderCors({ ok: false, error: 'Demasiadas solicitudes, intenta de nuevo en un minuto' }, 429, origin, 'GET', {
      'Retry-After': '60',
    });
  }

  const q = request.nextUrl.searchParams;
  const u = await resolverUbicacion({
    coordenadas: q.has('lat') || q.has('lng') ? { lat: q.get('lat'), lng: q.get('lng'), acc: q.get('acc') } : undefined,
    ip,
  });

  return responderCors(
    {
      fuente: u.fuente,
      ciudad: u.ciudad,
      region: u.region,
      pais: u.pais,
      latitud: u.latitud,
      longitud: u.longitud,
      regla: u.regla ? { municipio: u.regla.nombre, descuento: u.regla.descuento } : null,
      requiere_ubicacion: u.requiere_ubicacion,
    },
    200,
    origin,
    'GET'
  );
}
