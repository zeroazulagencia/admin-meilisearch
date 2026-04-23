import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT config_key, config_value, is_encrypted FROM modulos_mobilia_14_config WHERE config_key LIKE "mobilia_%"',
      []
    );
    
    const config: Record<string, string> = {};
    for (const row of rows || []) {
      config[row.config_key] = row.config_value || '';
    }
    
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobilia_subject, mobilia_api_url } = body;
    
    const keys = ['mobilia_subject', 'mobilia_api_url'];
    const values = [mobilia_subject, mobilia_api_url];
    
    for (let i = 0; i < keys.length; i++) {
      await query(
        `INSERT INTO modulos_mobilia_14_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [keys[i], values[i] ?? '']
      );
    }
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}