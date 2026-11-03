import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import {
  EDITABLE_KEYS,
  esValorEnmascarado,
  getAllConfig,
  setConfig,
} from '@/utils/modulos/sincronizador-repuestos-repuestera-31/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, config: await getAllConfig() });
  } catch (error: any) {
    console.error('[API MOD31 CONFIG]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Error al obtener configuracion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    for (const key of EDITABLE_KEYS) {
      if (body[key] == null) continue;
      const value = String(body[key]).trim();
      // No pisar un secreto con su version enmascarada
      if (await esValorEnmascarado(key, value)) continue;
      await setConfig(key, value || null);
    }
    return NextResponse.json({ ok: true, config: await getAllConfig() });
  } catch (error: any) {
    console.error('[API MOD31 CONFIG]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Error al guardar configuracion' }, { status: 500 });
  }
}
