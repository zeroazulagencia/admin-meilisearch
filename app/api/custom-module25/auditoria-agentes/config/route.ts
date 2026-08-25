import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/auditoria-agentes-25/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getAllConfig();
    // Enmascarar el api_key completo salvo los últimos 4 para mostrar en UI
    if (config.api_key) {
      const k = config.api_key;
      config.api_key = k.length > 8 ? `${'*'.repeat(k.length - 4)}${k.slice(-4)}` : '****';
    }
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
      if (value !== undefined && key !== 'api_key_actual') {
        // Si viene api_key y es igual al ya enmascarado real, ignorar (no machacar)
        if (key === 'api_key' && String(value).includes('•')) continue;
        upserts.push(setConfig(key, String(value)));
      }
    }
    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuracion' }, { status: 500 });
  }
}