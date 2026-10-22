import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';
import { ipConfiable } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';
import {
  adminGraphQL,
  corsHeaders,
  crearLimitador,
  responderCors,
  TAG_DRAFT,
  tokenEstadoValido,
} from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/publico';

// ============================================================
//  Módulo 30 — Estado de un borrador creado por POST /checkout/
//
//  El tema lo consulta al volver el cliente a la tienda: si el borrador ya se
//  pagó (COMPLETED) vacía el carrito. Exige el `estado_token` que devolvió
//  checkout/, así nadie puede consultar borradores ajenos adivinando IDs.
//
//  GET /checkout/estado/?draft_order_id=123&token=abc  (barra final obligatoria)
//  Solo pide `status` (no `order`): la app no tiene el scope read_orders.
// ============================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const excedeLimite = crearLimitador(60, 60_000);

const QUERY_ESTADO = `
  query($id: ID!) {
    draftOrder(id: $id) {
      status
      tags
    }
  }
`;

function responder(body: unknown, status: number, origin: string | null, extra?: Record<string, string>) {
  return responderCors(body, status, origin, 'GET', extra);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, 'GET') });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    if (excedeLimite(ipConfiable(request.headers))) {
      return responder({ ok: false, error: 'Demasiadas solicitudes, intenta de nuevo en un minuto' }, 429, origin, { 'Retry-After': '60' });
    }

    const params = request.nextUrl.searchParams;
    const draftOrderId = Number(params.get('draft_order_id'));
    const token = String(params.get('token') || '');
    if (!Number.isSafeInteger(draftOrderId) || draftOrderId <= 0 || !token) {
      return responder({ ok: false, error: 'Faltan draft_order_id o token' }, 400, origin);
    }
    if (!tokenEstadoValido(draftOrderId, token)) {
      return responder({ ok: false, error: 'Token inválido' }, 403, origin);
    }

    const config = await getRuntimeConfig();
    const domain = String(config.shopifyShopDomain || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const adminToken = String(config.shopifyAdminAccessToken || '').trim();
    if (!domain || !adminToken) {
      console.error('[checkout/estado] Shopify sin configurar (domain/token)');
      return responder({ ok: false, error: 'Tienda no configurada' }, 502, origin);
    }

    const { status, data } = await adminGraphQL(domain, adminToken, QUERY_ESTADO, {
      id: `gid://shopify/DraftOrder/${draftOrderId}`,
    });
    if (status !== 200 || data?.errors) {
      console.error('[checkout/estado] GraphQL', status, JSON.stringify(data?.errors || data).slice(0, 300));
      return responder({ ok: false, error: 'No se pudo consultar la tienda' }, 502, origin);
    }

    const draft = data?.data?.draftOrder;
    if (!draft || !Array.isArray(draft.tags) || !draft.tags.includes(TAG_DRAFT)) {
      return responder({ ok: false, error: 'Borrador no encontrado' }, 404, origin);
    }

    const pagado = draft.status === 'COMPLETED';
    return responder(
      {
        ok: true,
        draft_order_id: draftOrderId,
        estado: draft.status, // OPEN | INVOICE_SENT | COMPLETED
        pagado,
      },
      200,
      origin
    );
  } catch (err) {
    console.error('[checkout/estado] error inesperado:', err);
    return responder({ ok: false, error: 'Error interno' }, 500, origin);
  }
}
