import { NextRequest, NextResponse } from 'next/server';
import { verifyBridgeAccess, siigoFetch } from '@/utils/modulos/bridge-siigo/siigo-bridge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyBridgeAccess(req);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const data = await siigoFetch(`/v1/products/${id}`);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyBridgeAccess(req);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const data = await siigoFetch(`/v1/products/${id}`, { method: 'PUT', body });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyBridgeAccess(req);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    await siigoFetch(`/v1/products/${id}`, { method: 'DELETE' });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}