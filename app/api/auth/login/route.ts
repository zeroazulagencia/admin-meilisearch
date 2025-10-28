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
      'zeroazul': { id: 1, name: 'Zero Azul', email: 'zeroazul', password: '43r innovator*.*V1nc3nt+' },
      'admin@zeroazul.com': { id: 2, name: 'Admin Zero Azul', email: 'admin@zeroazul.com', password: 'VLjcJz*OivJb' }
    };
    
    const user = tempUsers[email];
    
    if (!user || user.password !== clave) {
      return NextResponse.json({ ok: false, error: 'Credenciales incorrectas' }, { status: 401 });
    }
    
    const rows = [user];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }

    const foundUser = rows[0];

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


