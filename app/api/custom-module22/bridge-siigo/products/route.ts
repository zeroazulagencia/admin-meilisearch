import { NextRequest, NextResponse } from 'next/server';
import { verifyBridgeAccess, siigoFetch } from '@/utils/modulos/bridge-siigo/siigo-bridge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await verifyBridgeAccess(req);
  if (auth !== true) return auth;

  try {
    const params = new URLSearchParams();
    const { searchParams } = new URL(req.url);
    Array.from(searchParams.entries()).forEach(([k, v]) => {
      params.set(k, v);
    });

    const data = await siigoFetch('/v1/products', { params });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyBridgeAccess(req);
  if (auth !== true) return auth;

  try {
    const body = await req.json();
    const data = await siigoFetch('/v1/products', { method: 'POST', body });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}