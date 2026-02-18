import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// Campos editables por el usuario desde el modulo (excluye api_key que es interno)
const EDITABLE_KEYS = [
  'empresa_nombre', 'empresa_nit', 'empresa_direccion', 'empresa_ciudad',
  'firma_nombre', 'firma_cargo', 'firma_imagen_url', 'logo_path',
  'sigha_login_url', 'sigha_empleados_url', 'sigha_email', 'sigha_clave', 'sigha_nit_cliente',
];

export async function GET() {
  const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_lucas_9_config');
  const config: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.config_key, r.config_value]));

  return NextResponse.json({
    ok: true,
    api_key: config.api_key,
    config: Object.fromEntries(EDITABLE_KEYS.map(k => [k, config[k] ?? ''])),
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    for (const key of Object.keys(body)) {
      if (!EDITABLE_KEYS.includes(key)) continue;
      await query(
        'UPDATE modulos_lucas_9_config SET config_value = ? WHERE config_key = ?',
        [body[key], key]
      );
    }

    return NextResponse.json({ ok: true, message: 'Configuracion actualizada' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
