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
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] Token error:', err);
    return null;
  }

  const data = await res.json();
  return data.access_token || null;
}

async function getZohoContactById(accessToken: string, contactId: string) {
  const res = await fetch(
    `https://www.zohoapis.com/crm/v2/Contacts/${contactId}?fields=id,First_Name,Last_Name,Email,Phone,Mobile,Shipping_Street,Shipping_City,Shipping_State,Shipping_Country,Shipping_Code,Billing_Street,Billing_City,Billing_State,Billing_Country,Billing_Code`,
    {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] Contact error:', err);
    return { data: null };
  }

  return await res.json();
}

export async function GET(req: NextRequest) {
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

    if (config.api_token && !verifyAuth(req, config)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = req.nextUrl.searchParams.get('id');
    if (!contactId) {
      return NextResponse.json({ ok: false, error: 'Contact ID required' }, { status: 400 });
    }

    const accessToken = await getZohoAccessToken(
      config.zoho_client_id,
      config.zoho_client_secret,
      config.zoho_refresh_token
    );

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Failed to get Zoho access token' }, { status: 500 });
    }

    const zohoData = await getZohoContactById(accessToken, contactId);

    return NextResponse.json({
      ok: true,
      data: zohoData.data,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await poolMain.end();
  }
}