import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/config';
import { lanzarCorrida } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/launcher';
import { secretoDeCron, secretoValido } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/auth';

export const dynamic = 'force-dynamic';

/** Corrida programada (crontab cada 10 min). Si hay otra en curso, no arranca. */
async function handler(request: NextRequest) {
  try {
    const cfg = await getRuntimeConfig();
    if (!secretoValido(secretoDeCron(request), cfg.cronSecret)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const r = await lanzarCorrida({ origen: 'cron' });
    if (!r.ok) return NextResponse.json({ ok: true, status: 'skipped', message: r.error });
    return NextResponse.json({ ok: true, status: 'started', run_id: r.runId, simulacion: r.simulacion }, { status: 202 });
  } catch (error: any) {
    console.error('[API MOD31 CRON]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'No se pudo iniciar la sincronizacion' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
