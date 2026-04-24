import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT config_key, config_value FROM modulos_mipaquete_15_config',
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
    const { api_key } = body;
    
    await query(
      `INSERT INTO modulos_mipaquete_15_config (config_key, config_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      ['api_key', api_key ?? '']
    );
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}