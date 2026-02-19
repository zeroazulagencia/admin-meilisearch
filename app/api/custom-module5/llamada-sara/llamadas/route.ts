import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT id, room_id, estado, creado_por, created_at, updated_at FROM modulos_sara_11_llamadas ORDER BY created_at DESC'
    );
    return NextResponse.json({ ok: true, llamadas: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
