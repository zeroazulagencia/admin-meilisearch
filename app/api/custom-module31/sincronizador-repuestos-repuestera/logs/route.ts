import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { logsDeRun, obtenerRun } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/runs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const runId = Number(request.nextUrl.searchParams.get('run_id'));
    if (!Number.isInteger(runId) || runId <= 0) {
      return NextResponse.json({ ok: false, error: 'run_id requerido' }, { status: 400 });
    }
    const sku = request.nextUrl.searchParams.get('sku');
    const [run, logs] = await Promise.all([obtenerRun(runId), logsDeRun(runId, sku)]);
    if (!run) return NextResponse.json({ ok: false, error: 'Corrida no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true, run, logs });
  } catch (error: any) {
    console.error('[API MOD31 LOGS]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'No se pudieron leer los logs' }, { status: 500 });
  }
}
