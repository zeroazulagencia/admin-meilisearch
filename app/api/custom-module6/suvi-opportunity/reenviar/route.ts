/**
 * MÓDULO 6 - Reenviar / reprocesar un registro
 */
import { NextRequest, NextResponse } from 'next/server';
import { processOpportunity } from '@/utils/modulos/suvi-opportunity/module6-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = parseInt(body.id ?? body.recordId, 10);
    if (isNaN(id)) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });
    const result = await processOpportunity(id);
    return NextResponse.json({ ok: result.ok, error: result.error });
  } catch (e: any) {
    console.error('[MOD6-REENVIAR]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
