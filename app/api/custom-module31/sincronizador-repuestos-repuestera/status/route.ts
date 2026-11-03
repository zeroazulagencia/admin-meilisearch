import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { getRuntimeConfig } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/config';
import { cerrarHuerfanas, listarRuns, lockOcupado } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/runs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    await cerrarHuerfanas();
    const [enCurso, runs, cfg] = await Promise.all([lockOcupado(), listarRuns(30), getRuntimeConfig()]);
    return NextResponse.json({
      ok: true,
      en_curso: enCurso,
      modo_simulacion: cfg.modoSimulacion,
      ultimo_total_erp: cfg.ultimoTotalErp,
      runs,
    });
  } catch (error: any) {
    console.error('[API MOD31 STATUS]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'No se pudo leer el estado' }, { status: 500 });
  }
}
