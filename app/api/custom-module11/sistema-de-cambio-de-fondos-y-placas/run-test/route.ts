import { NextResponse } from 'next/server';
import { runTest } from '@/utils/modulos/sistema-de-cambio-de-fondos-y-placas/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runTest();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error interno' }, { status: 500 });
  }
}
