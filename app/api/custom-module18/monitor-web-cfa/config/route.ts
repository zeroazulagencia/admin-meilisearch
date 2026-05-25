import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/monitor-web-cfa-18/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getAllConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const upserts: Array<Promise<void>> = [];
    if (body.url != null) upserts.push(setConfig('url', String(body.url || '').trim()));
    if (body.interval_minutes != null) upserts.push(setConfig('interval_minutes', String(Math.max(1, Number(body.interval_minutes) || 5))));
    if (body.enabled != null) upserts.push(setConfig('enabled', body.enabled ? '1' : '0'));

    await Promise.all(upserts);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuración' }, { status: 500 });
  }
}