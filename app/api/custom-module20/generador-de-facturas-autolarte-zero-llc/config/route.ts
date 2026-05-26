import { NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/generador-de-facturas-autolarte-zero-llc-20/config';

export async function GET() {
  try {
    const cfg = await getAllConfig();
    return NextResponse.json({ ok: true, data: cfg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data || body;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && key !== 'id' && key !== 'created_at') {
        await setConfig(key, value);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 400 });
  }
}