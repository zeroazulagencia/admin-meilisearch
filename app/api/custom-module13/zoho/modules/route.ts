import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query('SELECT `key`, value FROM modules_13_config');
  const config: Record<string, string> = {};
  for (const row of rows) config[row['key']] = row.value;
  return config;
}

async function getZohoAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.append('refresh_token', refreshToken);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function getZohoModules(accessToken: string) {
  const res = await fetch('https://www.zohoapis.com/crm/v2/settings/modules', {
    headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken },
  });

  if (!res.ok) return { modules: [] };
  return await res.json();
}

export async function GET() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'bitnami',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'admin_dworkers',
  });

  try {
    const config = await getDbConfig(pool);
    const accessToken = await getZohoAccessToken(config.zoho_client_id, config.zoho_client_secret, config.zoho_refresh_token);

    if (!accessToken) return NextResponse.json({ ok: false, error: 'No token' }, { status: 500 });

    const modulesData = await getZohoModules(accessToken);

    return NextResponse.json({
      ok: true,
      modules: (modulesData.modules || []).map((m: any) => ({
        api_name: m.api_name,
        singular_label: m.singular_label,
        plural_label: m.plural_label,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}