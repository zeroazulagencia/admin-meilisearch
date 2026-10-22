import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { listarPedidos } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/pedidos-log';

export const dynamic = 'force-dynamic';

// Log de solicitudes a POST /checkout/ (últimos 5 días). Solo admins: incluye IPs de clientes.
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const limite = Number(request.nextUrl.searchParams.get('limit') || 200);
    const pedidos = await listarPedidos(limite);
    return NextResponse.json({ ok: true, retencion_dias: 5, pedidos });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al obtener el log de pedidos' },
      { status: 500 }
    );
  }
}
