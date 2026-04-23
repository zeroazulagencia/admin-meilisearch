import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

const BASE_URL = 'http://bienraiz.mbp.com.co/bienraiz-mobilia/ws/Auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation');
    
    if (operation !== 'generateToken') {
      return NextResponse.json({ ok: false, error: 'Operación no válida' }, { status: 400 });
    }
    
    const [rows] = await query<any>(
      'SELECT config_value FROM modulos_mobilia_14_config WHERE config_key = "mobilia_subject"',
      []
    );
    
    const subject = rows?.[0]?.config_value;
    if (!subject) {
      return NextResponse.json({ ok: false, error: 'Subject no configurado' }, { status: 400 });
    }
    
    const url = `${BASE_URL}?operation=getAccessJWToken&subject=${subject}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.JWT) {
      await query(
        `INSERT INTO modulos_mobilia_14_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        ['mobilia_token', data.JWT]
      );
    }
    
    return NextResponse.json({ ok: true, token: data.JWT || null, error: data.error || null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}