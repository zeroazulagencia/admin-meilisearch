/**
 * MÓDULO 6 - SUVI Opportunity
 * GET: leer config (webhook_secret enmascarado). PUT: actualizar config.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/suvi-opportunity/module6-config';

export const dynamic = 'force-dynamic';

const MASK_KEYS = ['webhook_secret'];

function mask(value: string | null): string | null {
  if (!value || value.length < 14) return value ? '****' : null;
  return value.slice(0, 6) + '****' + value.slice(-4);
}

export async function GET() {
  try {
    const keys = ['webhook_secret', 'salesforce_group_id_ventas', 'salesforce_group_id_credito', 'record_type_ventas', 'record_type_credito', 'valid_project_ids'];
    const config: Record<string, string | null> = {};
    for (const key of keys) {
      const v = await getConfig(key);
      config[key] = MASK_KEYS.includes(key) && v ? mask(v) : v;
    }
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    console.error('[MOD6-CONFIG]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const allowed: Record<string, string> = {
      webhook_secret: body.webhook_secret,
      salesforce_group_id_ventas: body.salesforce_group_id_ventas,
      salesforce_group_id_credito: body.salesforce_group_id_credito,
      record_type_ventas: body.record_type_ventas,
      record_type_credito: body.record_type_credito,
      valid_project_ids: typeof body.valid_project_ids === 'string' ? body.valid_project_ids : (body.valid_project_ids ? JSON.stringify(body.valid_project_ids) : undefined),
    };
    for (const [key, value] of Object.entries(allowed)) {
      if (value !== undefined && value !== null) await setConfig(key, String(value));
    }
    const config: Record<string, string | null> = {};
    for (const key of Object.keys(allowed)) {
      const v = await getConfig(key);
      config[key] = MASK_KEYS.includes(key) && v ? mask(v) : v;
    }
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    console.error('[MOD6-CONFIG]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
