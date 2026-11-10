import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { requireAdmin } from '@/utils/api-auth';
import { leerConfigSara } from '@/utils/modulos/llamada-sara-5/config';

export const dynamic = 'force-dynamic';

const KEYS = ['account_sid', 'api_key_sid', 'api_key_secret', 'twiml_app_sid'];

// El secreto nunca sale del servidor: se devuelve vacío con has_secret.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const config = await leerConfigSara();
    const out: Record<string, string> = Object.fromEntries(KEYS.map(k => [k, config[k] ?? '']));
    out.api_key_secret = '';
    return NextResponse.json({ ok: true, config: out, has_secret: !!config.api_key_secret });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    for (const key of Object.keys(body)) {
      if (!KEYS.includes(key)) continue;
      const val = String(body[key] ?? '').trim();
      // Secreto vacío = mantener el guardado.
      if (key === 'api_key_secret' && (!val || val.includes('•'))) continue;
      await query('UPDATE modulos_sara_11_config SET config_value = ? WHERE config_key = ?', [val, key]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
