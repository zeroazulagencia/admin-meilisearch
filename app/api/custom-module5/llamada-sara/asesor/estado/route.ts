import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const VALID_ESTADOS = ['online', 'offline'];
const STALE_MINUTES = 10;

async function limpiarEstadoStale() {
  const [rows] = await query<any>(
    `SELECT asesor_id, estado, room_activo, ultima_actividad FROM modulos_sara_11_asesores
     WHERE asesor_id = 'admin' AND estado = 'ocupado'
     AND ultima_actividad < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [STALE_MINUTES]
  );
  if (rows.length) {
    const room = rows[0].room_activo;
    await query(
      "UPDATE modulos_sara_11_asesores SET estado = 'online', room_activo = NULL, ultima_actividad = NOW() WHERE asesor_id = 'admin'",
      []
    );
    if (room) {
      await query(
        "UPDATE modulos_sara_11_llamadas SET estado = 'finalizada', fin_llamada = NOW() WHERE room_id = ? AND estado = 'activa'",
        [room]
      );
    }
    await query(
      "UPDATE modulos_sara_11_llamadas SET estado = 'finalizada', fin_llamada = NOW() WHERE estado = 'activa' AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)",
      [STALE_MINUTES]
    );
  }
}

export async function GET() {
  try {
    await limpiarEstadoStale();

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

    if (estado === 'reset') {
      const [asesor] = await query<any>(
        "SELECT room_activo FROM modulos_sara_11_asesores WHERE asesor_id = 'admin'",
        []
      );
      if (asesor.length && asesor[0].room_activo) {
        await query(
          "UPDATE modulos_sara_11_llamadas SET estado = 'finalizada', fin_llamada = NOW() WHERE room_id = ? AND estado = 'activa'",
          [asesor[0].room_activo]
        );
      }
      await query(
        "UPDATE modulos_sara_11_llamadas SET estado = 'finalizada', fin_llamada = NOW() WHERE estado = 'activa'",
        []
      );
      await query(
        "UPDATE modulos_sara_11_asesores SET estado = 'online', room_activo = NULL, ultima_actividad = NOW() WHERE asesor_id = 'admin'",
        []
      );
      return NextResponse.json({ ok: true, estado: 'online' });
    }

    if (!estado || !VALID_ESTADOS.includes(estado)) {
      return NextResponse.json({ ok: false, error: 'Estado invalido. Usar: online | offline | reset' }, { status: 400 });
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
