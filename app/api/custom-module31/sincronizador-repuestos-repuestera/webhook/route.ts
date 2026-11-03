import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/config';
import { lanzarCorrida } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/launcher';
import { secretoValido, tokenDePlugin } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/auth';

export const dynamic = 'force-dynamic';

/**
 * Boton "Sincronizar Productos Repuestera" del plugin de WordPress.
 * Valida X-Sync-Token, responde enseguida y la corrida sigue en segundo plano.
 * Al terminar, el worker avisa a WordPress por admin-ajax (repuestera_sync_callback).
 */
export async function POST(request: NextRequest) {
  try {
    const cfg = await getRuntimeConfig();
    if (!secretoValido(tokenDePlugin(request), cfg.syncToken)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const r = await lanzarCorrida({ origen: 'boton' });
    if (!r.ok) {
      // La corrida en curso enviara el aviso a WordPress al terminar
      return NextResponse.json({ ok: true, status: 'running', message: r.error }, { status: 202 });
    }
    return NextResponse.json({ ok: true, status: 'started', run_id: r.runId, simulacion: r.simulacion }, { status: 202 });
  } catch (error: any) {
    console.error('[API MOD31 WEBHOOK]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'No se pudo iniciar la sincronizacion' }, { status: 500 });
  }
}
