import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function POST(req: NextRequest) {
  console.log('[LOGIN API] Inicio');
  try {
    const body = await req.json();
    console.log('[LOGIN API] Body:', body);
    const email = (body.email || '').trim().toLowerCase();
    const clave = String(body.password || body.clave || '').trim();

    if (!email || !clave) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales' }, { status: 400 });
    }

    // TEMPORAL: Login hardcodeado mientras configuramos MySQL
    console.log('[LOGIN API] Login temporal sin MySQL');
    
    // Usuario temporal
    const tempUsers: any = {
      'zeroazul': { id: 1, name: 'Zero Azul', email: 'zeroazul', password: '43r1tnd*.*V1nc3nt+' },
      'admin@zeroazul.com': { id: 2, name: 'Admin Zero Azul', email: 'admin@zeroazul.com', password: 'admin123' }
    };
    
    const user = tempUsers[email];
    
    if (!user || user.password !== clave) {
      return NextResponse.json({ ok: false, error: 'Credenciales incorrectas' }, { status: 401 });
    }
    
    const rows = [user];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }

    const user = rows[0];
    const stored = String(user.clave ?? '');
    if (stored !== clave) {
      return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Validar permisos de login si existen
    let canLogin = true;
    try {
      const perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      if (perms && typeof perms.canLogin === 'boolean') canLogin = perms.canLogin;
    } catch {}

    if (!canLogin) {
      return NextResponse.json({ ok: false, error: 'Acceso deshabilitado' }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        phone: user.phone,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}


