import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// Keys sensibles que deben mostrarse enmascaradas
const SENSITIVE_KEYS = [
  'openai_api_key',
  'facebook_access_token',
  'salesforce_consumer_key',
  'salesforce_consumer_secret',
  'salesforce_access_token',
  'salesforce_refresh_token',
];

// Keys editables desde la UI (las demas son de solo lectura o manejadas por OAuth)
const EDITABLE_KEYS = [
  'openai_api_key',
  'facebook_access_token',
  'salesforce_consumer_key',
  'salesforce_consumer_secret',
];

function maskValue(key: string, value: string): string {
  if (!value || !SENSITIVE_KEYS.includes(key)) return value;
  if (value.length <= 14) return '***';
  return value.slice(0, 10) + '...' + value.slice(-4);
}

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all');
    
    // Si piden todas las configs
    if (all === 'true') {
      const [rows] = await query<any>(
        'SELECT config_key, config_value FROM modulos_suvi_12_config ORDER BY config_key'
      );
      
      const configs = (rows || []).map((row: any) => ({
        key: row.config_key,
        value_masked: maskValue(row.config_key, row.config_value),
        has_value: !!row.config_value,
        is_sensitive: SENSITIVE_KEYS.includes(row.config_key),
        is_editable: EDITABLE_KEYS.includes(row.config_key),
      }));
      
      return NextResponse.json({ ok: true, configs });
    }
    
    // Default: solo blocked_form_ids
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

// POST: Actualizar una config individual
export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ ok: false, error: 'key es requerido' }, { status: 400 });
    }
    
    if (!EDITABLE_KEYS.includes(key)) {
      return NextResponse.json({ ok: false, error: 'Esta key no es editable desde la UI' }, { status: 403 });
    }
    
    if (!value || typeof value !== 'string') {
      return NextResponse.json({ ok: false, error: 'value es requerido' }, { status: 400 });
    }
    
    await setConfig(key, value.trim());
    return NextResponse.json({ ok: true, message: 'Configuracion guardada' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
