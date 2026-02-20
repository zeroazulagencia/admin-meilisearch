import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { cliente_id } = await req.json().catch(() => ({}));
    if (!cliente_id) {
      return NextResponse.json({ ok: false, error: 'cliente_id requerido' }, { status: 400 });
    }

    const [asesores] = await query<any>(
      'SELECT estado, room_activo FROM modulos_sara_11_asesores WHERE asesor_id = ?',
      ['admin']
    );

    if (!asesores.length || asesores[0].estado === 'offline') {
      return NextResponse.json({ ok: false, razon: 'sin_asesor' });
    }

    if (asesores[0].estado === 'ocupado') {
      return NextResponse.json({ ok: false, razon: 'ocupado' });
    }

    const room_id = 'llamada_' + randomBytes(8).toString('hex');

    await query(
      'INSERT INTO modulos_sara_11_llamadas (room_id, estado, creado_por, cliente_id, inicio_llamada) VALUES (?, ?, ?, ?, NOW())',
      [room_id, 'activa', 'cliente', cliente_id]
    );

    await query(
      "UPDATE modulos_sara_11_asesores SET estado = 'ocupado', room_activo = ? WHERE asesor_id = 'admin'",
      [room_id]
    );

    return NextResponse.json({ ok: true, room_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
