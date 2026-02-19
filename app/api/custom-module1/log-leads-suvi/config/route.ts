import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<any>(
    'SELECT config_value FROM modulos_suvi_12_config WHERE config_key = ? LIMIT 1',
    [key]
  );
  return rows[0]?.config_value ?? null;
}

async function setConfig(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO modulos_suvi_12_config (config_key, config_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, value]
  );
}

export async function GET() {
  try {
    const raw = await getConfig('blocked_form_ids');
    const blocked: string[] = JSON.parse(raw || '[]');
    return NextResponse.json({ ok: true, blocked_form_ids: blocked });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked: string[] = body.blocked_form_ids;

    if (!Array.isArray(blocked)) {
      return NextResponse.json({ ok: false, error: 'blocked_form_ids debe ser un array' }, { status: 400 });
    }

    const clean = blocked.map((id: string) => String(id).trim()).filter(Boolean);
    await setConfig('blocked_form_ids', JSON.stringify(clean));
    return NextResponse.json({ ok: true, blocked_form_ids: clean });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
