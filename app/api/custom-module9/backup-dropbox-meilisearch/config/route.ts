/**
 * Módulo 9 - Config (dropbox_access_token, dropbox_folder_path, cron_secret, ssh, meilisearch)
 * GET: devuelve config con secretos enmascarados. PUT: actualiza.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/backup-dropbox-meilisearch/config';
import { query } from '@/utils/db';
import { maskSensitiveValue } from '@/utils/encryption';

export const dynamic = 'force-dynamic';

function maskValue(v: string | null): string | null {
  if (!v) return null;
  const masked = maskSensitiveValue(v, 4);
  return masked || '****';
}

const SENSITIVE = new Set([
  'dropbox_access_token',
  'cron_secret',
  'ssh_password',
  'meilisearch_api_key',
]);

export async function GET() {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_backup_9_config'
    );
    const config: Record<string, string | null> = {};
    for (const r of rows || []) {
      if (SENSITIVE.has(r.config_key))
        config[r.config_key] = r.config_value ? maskValue(r.config_value) : null;
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
    if (body.ssh_host != null)
      await setConfig('ssh_host', body.ssh_host === '' ? null : String(body.ssh_host));
    if (body.ssh_user != null)
      await setConfig('ssh_user', body.ssh_user === '' ? null : String(body.ssh_user));
    if (body.ssh_password != null)
      await setConfig('ssh_password', body.ssh_password === '' ? null : String(body.ssh_password));
    if (body.ssh_port != null)
      await setConfig('ssh_port', body.ssh_port === '' ? null : String(body.ssh_port));
    if (body.meilisearch_api_key != null)
      await setConfig('meilisearch_api_key', body.meilisearch_api_key === '' ? null : String(body.meilisearch_api_key));
    if (body.meilisearch_url != null)
      await setConfig('meilisearch_url', body.meilisearch_url === '' ? null : String(body.meilisearch_url));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
