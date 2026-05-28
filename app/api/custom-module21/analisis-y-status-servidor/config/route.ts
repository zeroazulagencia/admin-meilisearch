import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/analisis-y-status-servidor-21/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getAllConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al obtener configuracion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const upserts: Array<Promise<void>> = [];
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        upserts.push(setConfig(key, String(value)));
      }
    }

    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuracion' }, { status: 500 });
  }
}
