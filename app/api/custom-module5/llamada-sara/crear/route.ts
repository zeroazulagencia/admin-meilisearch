import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const room_id = 'llamada_' + randomBytes(8).toString('hex');
    await query(
      'INSERT INTO modulos_sara_11_llamadas (room_id, estado, creado_por) VALUES (?, ?, ?)',
      [room_id, 'activa', 'admin']
    );
    const link = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://workers.zeroazul.com'}/custom-module5/llamada-sara/${room_id}`;
    return NextResponse.json({ ok: true, room_id, link });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
