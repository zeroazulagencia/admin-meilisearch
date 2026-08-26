import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/auditoria-agentes-25/config';
import { requireAuth } from '@/utils/api-auth';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

async function esAdmin(userId: number): Promise<boolean> {
  try {
    const [rows]: any = await query(
      'SELECT permissions FROM clients WHERE id = ? LIMIT 1',
      [userId]
    );
    if (rows && rows.length > 0) {
      const perms = typeof rows[0].permissions === 'string'
        ? JSON.parse(rows[0].permissions)
        : (rows[0].permissions || {});
      return perms?.type === 'admin';
    }
  } catch { /* no-admin */ }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.userId) {
      return NextResponse.json({ ok: false, error: 'Autenticación requerida' }, { status: 401 });
    }

    const admin = await esAdmin(auth.userId);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Solo administradores' }, { status: 403 });
    }

    const config = await getAllConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al obtener configuracion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.userId) {
      return NextResponse.json({ ok: false, error: 'Autenticación requerida' }, { status: 401 });
    }

    const admin = await esAdmin(auth.userId);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Solo administradores' }, { status: 403 });
    }

    const body = await request.json();
    const upserts: Array<Promise<void>> = [];
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && key !== 'api_key_actual') {
        if (key === 'api_key' && String(value).includes('•')) continue;
        upserts.push(setConfig(key, String(value)));
      }
    }
    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuracion' }, { status: 500 });
  }
}
