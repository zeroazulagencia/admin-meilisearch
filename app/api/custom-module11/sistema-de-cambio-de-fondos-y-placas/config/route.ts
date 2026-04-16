/**
 * Módulo 11 - Config
 * GET: devuelve config enmascarada. PUT: actualiza.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/sistema-de-cambio-de-fondos-y-placas/config';
import { query } from '@/utils/db';
import { maskSensitiveValue } from '@/utils/encryption';

export const dynamic = 'force-dynamic';

const SENSITIVE = new Set([
  'replicate_api_token',
  'rapidapi_key',
  'wp_db_password',
  'wp_api_token',
]);

function maskToken(v: string | null): string | null {
  if (!v) return null;
  const masked = maskSensitiveValue(v, 4);
  return masked || '****';
}

export async function GET() {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_sistema_de_cambio_de_fondos_y_placas_11_config'
    );
    const config: Record<string, string | null> = {};
    for (const r of rows || []) {
      const value = await getConfig(r.config_key);
      if (SENSITIVE.has(r.config_key)) {
        config[r.config_key] = value ? maskToken(value) : null;
      } else {
        config[r.config_key] = value;
      }
    }
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.autolarte_base_url != null)
      await setConfig('autolarte_base_url', body.autolarte_base_url === '' ? null : String(body.autolarte_base_url));
    if (body.uploads_path != null)
      await setConfig('uploads_path', body.uploads_path === '' ? null : String(body.uploads_path));
    if (body.cronjobs_path != null)
      await setConfig('cronjobs_path', body.cronjobs_path === '' ? null : String(body.cronjobs_path));
    if (body.plate_assistant_path != null)
      await setConfig('plate_assistant_path', body.plate_assistant_path === '' ? null : String(body.plate_assistant_path));
    if (body.replicate_api_token != null)
      await setConfig('replicate_api_token', body.replicate_api_token === '' ? null : String(body.replicate_api_token));
    if (body.replicate_model != null)
      await setConfig('replicate_model', body.replicate_model === '' ? null : String(body.replicate_model));
    if (body.rapidapi_key != null)
      await setConfig('rapidapi_key', body.rapidapi_key === '' ? null : String(body.rapidapi_key));
    if (body.rapidapi_host != null)
      await setConfig('rapidapi_host', body.rapidapi_host === '' ? null : String(body.rapidapi_host));
    if (body.rapidapi_endpoint != null)
      await setConfig('rapidapi_endpoint', body.rapidapi_endpoint === '' ? null : String(body.rapidapi_endpoint));
    if (body.prompt_default != null)
      await setConfig('prompt_default', body.prompt_default === '' ? null : String(body.prompt_default));
    if (body.concesionario_json_url != null)
      await setConfig('concesionario_json_url', body.concesionario_json_url === '' ? null : String(body.concesionario_json_url));
    if (body.category_json_path != null)
      await setConfig('category_json_path', body.category_json_path === '' ? null : String(body.category_json_path));
    if (body.vehicles_json_path != null)
      await setConfig('vehicles_json_path', body.vehicles_json_path === '' ? null : String(body.vehicles_json_path));
    if (body.server_search_url != null)
      await setConfig('server_search_url', body.server_search_url === '' ? null : String(body.server_search_url));
    if (body.wp_db_host != null)
      await setConfig('wp_db_host', body.wp_db_host === '' ? null : String(body.wp_db_host));
    if (body.wp_db_port != null)
      await setConfig('wp_db_port', body.wp_db_port === '' ? null : String(body.wp_db_port));
    if (body.wp_db_name != null)
      await setConfig('wp_db_name', body.wp_db_name === '' ? null : String(body.wp_db_name));
    if (body.wp_db_user != null)
      await setConfig('wp_db_user', body.wp_db_user === '' ? null : String(body.wp_db_user));
    if (body.wp_db_password != null)
      await setConfig('wp_db_password', body.wp_db_password === '' ? null : String(body.wp_db_password));
    if (body.wp_table_prefix != null)
      await setConfig('wp_table_prefix', body.wp_table_prefix === '' ? null : String(body.wp_table_prefix));
    if (body.wp_api_base_url != null)
      await setConfig('wp_api_base_url', body.wp_api_base_url === '' ? null : String(body.wp_api_base_url));
    if (body.wp_api_token != null)
      await setConfig('wp_api_token', body.wp_api_token === '' ? null : String(body.wp_api_token));
    if (body.wp_api_upload_endpoint != null)
      await setConfig('wp_api_upload_endpoint', body.wp_api_upload_endpoint === '' ? null : String(body.wp_api_upload_endpoint));
    if (body.wp_api_override_endpoint != null)
      await setConfig('wp_api_override_endpoint', body.wp_api_override_endpoint === '' ? null : String(body.wp_api_override_endpoint));
    if (body.wp_api_list_large_endpoint != null)
      await setConfig('wp_api_list_large_endpoint', body.wp_api_list_large_endpoint === '' ? null : String(body.wp_api_list_large_endpoint));
    if (body.wp_api_get_base64_endpoint != null)
      await setConfig('wp_api_get_base64_endpoint', body.wp_api_get_base64_endpoint === '' ? null : String(body.wp_api_get_base64_endpoint));
    if (body.cron_times != null)
      await setConfig('cron_times', body.cron_times === '' ? null : String(body.cron_times));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
