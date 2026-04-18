import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query('SELECT `key`, value FROM modules_13_config');
  const config: Record<string, string> = {};
  for (const row of rows) config[row['key']] = row.value;
  return config;
}

async function getZohoAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<{accessToken: string, apiDomain: string} | null> {
  // Hardcoded for testing - remove after
  const testRefresh = '1000.832191142a3f9abbf25e43131c2a9863.8c473f179940b8ca4398bf2273137946';
  
  const params = new URLSearchParams();
  params.append('refresh_token', testRefresh);
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
  if (!data.access_token) return null;
  return { accessToken: data.access_token, apiDomain: data.api_domain || 'https://www.zohoapis.com' };
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
    console.log('[INVOICES] Getting config...');
    const [rows]: any = await pool.query('SELECT `key`, value FROM modules_13_config');
    const config: Record<string, string> = {};
    for (const row of rows) config[row['key']] = row.value;
    
    console.log('[INVOICES] Config keys:', Object.keys(config));
    console.log('[INVOICES] Getting token...');
    
    const tokenData = await getZohoAccessToken(
      config.zoho_client_id,
      config.zoho_client_secret,
      config.zoho_refresh_token
    );

    console.log('[INVOICES] Token result:', tokenData ? 'OK' : 'NULL');
    console.log('[INVOICES] API Domain:', tokenData?.apiDomain);

    if (!tokenData) return NextResponse.json({ ok: false, error: 'No token' }, { status: 500 });

    const apiDomain = tokenData.apiDomain;
    const accessToken = tokenData.accessToken;

    const contactId = req.nextUrl.searchParams.get('contact_id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    let url = `${apiDomain}/crm/v2/Invoices?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`;
    if (contactId) {
      url += `&contact_id=${contactId}`;
    }

    console.log('[INVOICES] Calling:', url);

    const res = await fetch(url, {
      headers: { 
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[INVOICES] API error:', err);
      return NextResponse.json({ ok: false, error: 'Zoho API error: ' + err }, { status: 500 });
    }

    const data = await res.json();
    const invoices = data.data || [];

    const enrichedInvoices = invoices.map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.Invoice_Number,
      date: inv.Invoice_Date,
      status: inv.Status,
      grand_total: inv.Grand_Total,
      contact_name: inv.Contact_Name?.name || null,
      contact_id: inv.Contact_Name?.id || null,
      billing_city: inv.Billing_City,
      shipping_city: inv.Shipping_City,
      products: (inv.Product_Details || []).map((p: any) => ({
        product_name: p.product?.name || null,
        product_code: p.product?.Product_Code || null,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total: p.total,
        description: p.product_description,
      })),
    }));

    return NextResponse.json({
      ok: true,
      data: enrichedInvoices,
      total: data.info?.count || 0,
      has_more: data.info?.more_records || false,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}