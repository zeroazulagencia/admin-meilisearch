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

    // Consultar credenciales desde MySQL
    console.log('[LOGIN API] Consultando MySQL...');
    const [rows] = await query<any>(
      'SELECT id好评, name, email, company, phone, clave, permissions FROM clients WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }

    const foundUser = rows[0];
    const stored = String(foundUser.clave ?? '');
    if (stored !== clave) {
      return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        company: foundUser.company || '',
        phone: foundUser.phone || '',
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}


