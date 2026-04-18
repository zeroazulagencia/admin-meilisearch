import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query(
    'SELECT `key`, value FROM modules_13_config'
  );
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row['key']] = row.value;
  }
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

async function getZohoFields(accessToken: string) {
  const res = await fetch('https://www.zohoapis.com/crm/v2/Contacts/meta/fields', {
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] Fields error:', err);
    return { fields: [] };
  }

  return await res.json();
}

export async function GET() {
  const poolMain = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'bitnami',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'admin_dworkers',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    const config = await getDbConfig(poolMain);

    const accessToken = await getZohoAccessToken(
      config.zoho_client_id,
      config.zoho_client_secret,
      config.zoho_refresh_token
    );

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Failed to get Zoho access token' }, { status: 500 });
    }

    const fieldsData = await getZohoFields(accessToken);

    const allFields = fieldsData?.fields || [];
    const customFields = allFields.filter((f: any) => f.custom_field);

    return NextResponse.json({
      ok: true,
      total_fields: allFields.length,
      custom_fields: customFields.map((f: any) => ({
        api_name: f.api_name,
        field_label: f.field_label,
        data_type: f.data_type,
      })),
      all_fields: allFields.map((f: any) => ({
        api_name: f.api_name,
        field_label: f.field_label,
        data_type: f.data_type,
        custom: f.custom_field,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await poolMain.end();
  }
}