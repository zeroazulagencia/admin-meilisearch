import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { lanzarCorrida } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/launcher';

export const dynamic = 'force-dynamic';

/** Corrida manual desde el modulo. forzado=true aprueba seguir aunque el ERP haya caido. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const r = await lanzarCorrida({
      origen: 'manual',
      simulacion: typeof body.simulacion === 'boolean' ? body.simulacion : undefined,
      forzado: body.forzado === true,
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 409 });
    return NextResponse.json({ ok: true, run_id: r.runId, simulacion: r.simulacion });
  } catch (error: any) {
    console.error('[API MOD31 EJECUTAR]', error?.message || error);
    return NextResponse.json({ ok: false, error: 'No se pudo iniciar la sincronizacion' }, { status: 500 });
  }
}
