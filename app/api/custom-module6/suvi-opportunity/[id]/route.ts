/**
 * MÓDULO 6 - SUVI Opportunity
 * GET: detalle de un registro
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ ok: false, error: 'Id inválido' }, { status: 400 });
    const [rows] = await query<any>(
      'SELECT * FROM modulos_suvi_6_opportunities WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
    const row = rows[0];
    if (row.payload_raw && typeof row.payload_raw === 'string') row.payload_raw = JSON.parse(row.payload_raw);
    return NextResponse.json({ ok: true, data: row });
  } catch (e: any) {
    console.error('[MOD6-API]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
