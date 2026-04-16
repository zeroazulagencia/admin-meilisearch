import { NextRequest, NextResponse } from 'next/server';
import { runManual } from '@/utils/modulos/sistema-de-cambio-de-fondos-y-placas/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plates = Array.isArray(body?.plates) ? body.plates : [];
    const result = await runManual(plates);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error interno' }, { status: 500 });
  }
}
