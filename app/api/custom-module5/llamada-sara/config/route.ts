import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { requireAdmin } from '@/utils/api-auth';

export const dynamic = 'force-dynamic';

const KEYS = ['account_sid', 'api_key_sid', 'api_key_secret', 'twiml_app_sid'];
const SECRET_KEYS = ['api_key_secret'];
const MASK_CHAR = '•';

function enmascarar(value: string): string {
  if (!value) return '';
  return MASK_CHAR.repeat(8) + value.slice(-4);
}

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
    const config: Record<string, string> = Object.fromEntries(
      rows.map((r: any) => [r.config_key, r.config_value ?? ''])
    );
    return NextResponse.json({
      ok: true,
      config: Object.fromEntries(
        KEYS.map(k => [k, SECRET_KEYS.includes(k) ? enmascarar(config[k] ?? '') : (config[k] ?? '')])
      ),
    });
  } catch (e: any) {
    console.error('[API MOD5 LLAMADA SARA] [config] Error GET:', e?.message || e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    for (const key of Object.keys(body)) {
      if (!KEYS.includes(key)) continue;
      const value = String(body[key] ?? '');
      // El secreto llega enmascarado si el usuario no lo cambio: no se sobrescribe
      if (SECRET_KEYS.includes(key) && (value === '' || value.includes(MASK_CHAR))) continue;
      await query('UPDATE modulos_sara_11_config SET config_value = ? WHERE config_key = ?', [value, key]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[API MOD5 LLAMADA SARA] [config] Error PUT:', e?.message || e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
