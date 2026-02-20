import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const VALID_ESTADOS = ['online', 'offline'];

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT asesor_id, estado, room_activo, ultima_actividad FROM modulos_sara_11_asesores WHERE asesor_id = ?',
      ['admin']
    );
    if (!rows.length) {
      return NextResponse.json({ ok: true, estado: 'offline', room_activo: null });
    }
    return NextResponse.json({
      ok: true,
      estado: rows[0].estado,
      room_activo: rows[0].room_activo,
      ultima_actividad: rows[0].ultima_actividad,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { estado } = await req.json().catch(() => ({}));
    if (!estado || !VALID_ESTADOS.includes(estado)) {
      return NextResponse.json({ ok: false, error: 'Estado invalido. Usar: online | offline' }, { status: 400 });
    }

    await query(
      `INSERT INTO modulos_sara_11_asesores (asesor_id, estado, room_activo, ultima_actividad)
       VALUES ('admin', ?, NULL, NOW())
       ON DUPLICATE KEY UPDATE estado = ?, room_activo = NULL, ultima_actividad = NOW()`,
      [estado, estado]
    );

    return NextResponse.json({ ok: true, estado });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
