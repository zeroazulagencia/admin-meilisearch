import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const KEYS = ['account_sid', 'api_key_sid', 'api_key_secret', 'twiml_app_sid'];

export async function GET() {
  try {
    const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
    const config: Record<string, string> = Object.fromEntries(
      rows.map((r: any) => [r.config_key, r.config_value ?? ''])
    );
    return NextResponse.json({ ok: true, config: Object.fromEntries(KEYS.map(k => [k, config[k] ?? ''])) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    for (const key of Object.keys(body)) {
      if (!KEYS.includes(key)) continue;
      await query('UPDATE modulos_sara_11_config SET config_value = ? WHERE config_key = ?', [body[key], key]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
