import { NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/sincronizador-usados-autolarte-19/config';

export async function GET() {
  const cfg = await getAllConfig();
  return NextResponse.json({ ok: true, config: cfg });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && key !== 'id' && key !== 'created_at') {
        await setConfig(key, value);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 400 });
  }
}