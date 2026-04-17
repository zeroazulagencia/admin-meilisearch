import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query(
    'SELECT `key`, value FROM modules_13_config WHERE `key` IN (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['wp_db_host', 'wp_db_port', 'wp_db_name', 'wp_db_user', 'wp_db_password', 'wp_table_prefix', 'api_token', 'zoho_client_id', 'zoho_client_secret', 'zoho_refresh_token']
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
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const params = new URLSearchParams();
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token?' + params.toString(), {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + encoded,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] Token error:', err);
    return null;
  }

  const data = await res.json();
  return data.access_token || null;
}

async function getZohoContacts(accessToken: string, limit: number = 100, offset: number = 0) {
  const res = await fetch(
    `https://www.zohoapis.com/crm/v2/Contacts?fields=id,First_Name,Last_Name,Email,Phone,Mobile,Shipping_Street,Shipping_City,Shipping_State,Shipping_Country,Shipping_Code,Billing_Street,Billing_City,Billing_State,Billing_Country,Billing_Code&per_page=${limit}&page=${Math.floor(offset / limit) + 1}`,
    {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[ZOHO] Contacts error:', err);
    return { data: [], info: { total: 0 } };
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

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    const analyzeShipping = req.nextUrl.searchParams.get('analyze') === 'true';

    const accessToken = await getZohoAccessToken(
      config.zoho_client_id,
      config.zoho_client_secret,
      config.zoho_refresh_token
    );

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Failed to get Zoho access token' }, { status: 500 });
    }

    const zohoData = await getZohoContacts(accessToken, limit, offset);

    if (analyzeShipping) {
      const contacts = zohoData.data || [];
      const shippingFields = ['Shipping_Street', 'Shipping_City', 'Shipping_State', 'Shipping_Country', 'Shipping_Code'];
      
      const analysis: any = {
        total_contacts: contacts.length,
        fields_with_shipping: {} as Record<string, any>,
        fields_missing: {} as Record<string, any>,
        sample_with_shipping: [] as any[],
      };

      for (const field of shippingFields) {
        analysis.fields_with_shipping[field] = 0;
        analysis.fields_missing[field] = 0;
      }

      for (const contact of contacts) {
        const hasShipping = shippingFields.some(f => contact[f] && String(contact[f]).trim() !== '');
        if (hasShipping) {
          analysis.sample_with_shipping.push({
            id: contact.id,
            name: `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim(),
            shipping_street: contact.Shipping_Street,
            shipping_city: contact.Shipping_City,
            shipping_state: contact.Shipping_State,
            shipping_code: contact.Shipping_Code,
          });
          if (analysis.sample_with_shipping.length > 5) break;
        }
      }

      for (const contact of contacts) {
        for (const field of shippingFields) {
          if (contact[field] && String(contact[field]).trim() !== '') {
            analysis.fields_with_shipping[field]++;
          } else {
            analysis.fields_missing[field]++;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        analysis,
        used_fields: shippingFields,
      });
    }

    return NextResponse.json({
      ok: true,
      data: zohoData.data || [],
      total: zohoData.info?.total || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await poolMain.end();
  }
}