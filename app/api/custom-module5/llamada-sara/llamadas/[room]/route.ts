import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { requireAdmin } from '@/utils/api-auth';

export const dynamic = 'force-dynamic';

const VALID_ESTADOS = ['activa', 'finalizada', 'cancelada'];

export async function PATCH(req: NextRequest, { params }: { params: { room: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { estado } = await req.json().catch(() => ({}));
    if (!estado || !VALID_ESTADOS.includes(estado)) {
      return NextResponse.json({ ok: false, error: 'Estado inválido' }, { status: 400 });
    }
    await query('UPDATE modulos_sara_11_llamadas SET estado = ? WHERE room_id = ?', [estado, params.room]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { room: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    await query('DELETE FROM modulos_sara_11_llamadas WHERE room_id = ?', [params.room]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
