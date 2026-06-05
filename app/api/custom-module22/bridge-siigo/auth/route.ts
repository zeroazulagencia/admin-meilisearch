import { NextRequest, NextResponse } from 'next/server';
import { verifyBridgeAccess, siigoFetch } from '@/utils/modulos/bridge-siigo/siigo-bridge';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Allow two modes:
    // 1. External: requires Authorization: Bearer {access_key}
    // 2. Admin (internal): no auth needed, tests Siigo directly
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const auth = await verifyBridgeAccess(req);
      if (auth !== true) return auth;
    }

    const products = await siigoFetch('/v1/products', { params: new URLSearchParams({ page_size: '1' }) });
    return NextResponse.json({ ok: true, message: 'Conexion exitosa con Siigo' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: 'Error de conexion con Siigo: ' + (e.message || 'desconocido') }, { status: 502 });
  }
}