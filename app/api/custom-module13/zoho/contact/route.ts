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

async function getContactHistory(accessToken: string, contactId: string) {
  const res = await fetch(
    `https://www.zohoapis.com/crm/v2/Contacts/${contactId}/history?type=field_change`,
    {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] History error:', err);
    return { data: [] };
  }

  const data = await res.json();
  return data;
}

async function getContactFieldHistory(accessToken: string, contactId: string) {
  const res = await fetch(
    `https://www.zohoapis.com/crm/v2/Contacts/${contactId}/history`,
    {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    return { data: [] };
  }

  const allData = await res.json();
  
  const shippingFields = ['Shipping_Street', 'Shipping_City', 'Shipping_State', 'Shipping_Country', 'Shipping_Code'];
  
  const historyData = allData.data || [];
  
  const fieldHistory = historyData.filter((entry: any) => {
    const field = entry.Field || entry.field || '';
    return shippingFields.some(f => field.toLowerCase().includes(f.toLowerCase()));
  });

  return { data: fieldHistory };
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

    const historyData = await getContactFieldHistory(accessToken, contactId);

    return NextResponse.json({
      ok: true,
      contact_id: contactId,
      history: historyData.data,
      total_changes: historyData.data?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await poolMain.end();
  }
}