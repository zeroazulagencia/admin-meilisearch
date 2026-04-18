import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query('SELECT `key`, value FROM modules_13_config');
  const config: Record<string, string> = {};
  for (const row of rows) config[row['key']] = row.value;
  return config;
}

function verifyAuth(req: NextRequest, config: Record<string, string>) {
  if (!config.api_token) return true;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === config.api_token;
}

async function getZohoAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.append('refresh_token', refreshToken);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: params.toString(),
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

export async function GET(req: NextRequest) {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'bitnami',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'admin_dworkers',
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const [rows]: any = await pool.query('SELECT `key`, value FROM modules_13_config');
    const config: Record<string, string> = {};
    for (const row of rows) config[row['key']] = row.value;

    if (config.api_token && !verifyAuth(req, config)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getZohoAccessToken(
      config.zoho_client_id,
      config.zoho_client_secret,
      config.zoho_refresh_token
    );

    if (!accessToken) return NextResponse.json({ ok: false, error: 'No token' }, { status: 500 });

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    const contactId = req.nextUrl.searchParams.get('contact_id');
    const status = req.nextUrl.searchParams.get('status');

    let url = `https://www.zohoapis.com/crm/v2/Cancelaciones?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`;
    if (contactId) {
      url += `&contact_id=${contactId}`;
    }
    if (status) {
      url += `&Accion=${status}`;
    }

    const res = await fetch(url, {
      headers: { 
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err }, { status: 500 });
    }

    const data = await res.json();
    const records = data.data || [];

    return NextResponse.json({
      ok: true,
      data: records,
      total: data.info?.count || 0,
      has_more: data.info?.more_records || false,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}