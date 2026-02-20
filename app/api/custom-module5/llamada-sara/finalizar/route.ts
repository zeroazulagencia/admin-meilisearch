import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { room_id } = await req.json().catch(() => ({}));
    if (!room_id) {
      return NextResponse.json({ ok: false, error: 'room_id requerido' }, { status: 400 });
    }

    const [rows] = await query<any>(
      'SELECT id, estado, inicio_llamada FROM modulos_sara_11_llamadas WHERE room_id = ?',
      [room_id]
    );
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'Llamada no encontrada' }, { status: 404 });
    }

    if (rows[0].estado === 'finalizada') {
      return NextResponse.json({ ok: true, mensaje: 'Llamada ya finalizada' });
    }

    let duracion_segundos = null;
    if (rows[0].inicio_llamada) {
      const inicio = new Date(rows[0].inicio_llamada).getTime();
      duracion_segundos = Math.round((Date.now() - inicio) / 1000);
    }

    await query(
      'UPDATE modulos_sara_11_llamadas SET estado = ?, fin_llamada = NOW(), duracion_segundos = ? WHERE room_id = ?',
      ['finalizada', duracion_segundos, room_id]
    );

    await query(
      "UPDATE modulos_sara_11_asesores SET estado = 'online', room_activo = NULL WHERE asesor_id = 'admin' AND estado = 'ocupado'",
      []
    );

    return NextResponse.json({ ok: true, duracion_segundos });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
