import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { ponerCookieSesion } from '@/utils/session';

export async function POST(req: NextRequest) {
  console.log('[LOGIN API] Inicio');
  try {
    const body = await req.json();
    const usernameOrEmail = (body.email || body.username || '').trim();
    const clave = String(body.password || body.clave || '').trim();

    if (!usernameOrEmail || !clave) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales' }, { status: 400 });
    }

    // Consultar credenciales desde MySQL - buscar por email o por name (usuario)
    console.log('[LOGIN API] Consultando MySQL...');
    const [rows] = await query<any>(
      'SELECT id, name, email, company, phone, clave, permissions FROM clients WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1',
      [usernameOrEmail, usernameOrEmail]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }

    const foundUser = rows[0];
    const stored = String(foundUser.clave ?? '');
    if (stored !== clave) {
      return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Parsear permisos
    let permissions: any = {};
    try {
      permissions = typeof foundUser.permissions === 'string' ? JSON.parse(foundUser.permissions) : (foundUser.permissions || {});
    } catch (parseError) {
      console.error('[LOGIN API] Error parsing permissions:', parseError);
    }

    // Agregar clientId a los permisos para filtrado
    permissions.clientId = foundUser.id;

    // Validar permiso de login
    const canLogin = permissions?.canLogin !== false && permissions?.login !== false;
    if (!canLogin) {
      return NextResponse.json({ ok: false, error: 'Acceso deshabilitado' }, { status: 403 });
    }

    const res = NextResponse.json({
      ok: true,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        company: foundUser.company || '',
        phone: foundUser.phone || '',
        permissions
      }
    });
    ponerCookieSesion(res, foundUser.id);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}


