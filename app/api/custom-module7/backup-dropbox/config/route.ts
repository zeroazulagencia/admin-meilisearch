/**
 * Módulo 7 - Config (dropbox_access_token, dropbox_folder_path, cron_secret)
 * GET: devuelve config con token enmascarado. PUT: actualiza.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/backup-dropbox/config';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

function maskToken(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return '****';
  return v.slice(0, 4) + '****' + v.slice(-4);
}

export async function GET() {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_backup_7_config'
    );
    const config: Record<string, string | null> = {};
    for (const r of rows || []) {
      if (r.config_key === 'dropbox_access_token' || r.config_key === 'cron_secret')
        config[r.config_key] = r.config_value ? maskToken(r.config_value) : null;
      else
        config[r.config_key] = r.config_value;
    }
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.dropbox_access_token != null)
      await setConfig('dropbox_access_token', body.dropbox_access_token === '' ? null : String(body.dropbox_access_token));
    if (body.dropbox_folder_path != null)
      await setConfig('dropbox_folder_path', body.dropbox_folder_path === '' ? null : String(body.dropbox_folder_path));
    if (body.cron_secret != null)
      await setConfig('cron_secret', body.cron_secret === '' ? null : String(body.cron_secret));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
