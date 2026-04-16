import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id)) : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'ids requeridos' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    await query(`DELETE FROM modulos_suvi_6_opportunities WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (error: any) {
    console.error('[MOD6-DELETE]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
