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

    if (!config.treli_api_key) {
      return NextResponse.json({ ok: false, error: 'Treli token no configurado' }, { status: 500 });
    }

    const startDate = req.nextUrl.searchParams.get('start_date');
    const endDate = req.nextUrl.searchParams.get('end_date');
    const limit = req.nextUrl.searchParams.get('limit') || '100';
    const cursor = req.nextUrl.searchParams.get('cursor') || '';

    const queryParams = new URLSearchParams();
    queryParams.append('status', 'paid');
    queryParams.append('limit', limit);
    if (startDate) queryParams.append('created_after', startDate);
    if (endDate) queryParams.append('created_before', endDate);
    if (cursor) queryParams.append('start_after', cursor);

    const url = `https://api.treli.co/v1/collections?${queryParams.toString()}`;

    const auth = Buffer.from(config.treli_api_key + ':').toString('base64');

    const res = await fetch(url, {
      headers: { 
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err }, { status: 500 });
    }

    const data = await res.json();
    
    const enrichedData = (data.data || []).map((col: any) => ({
      id: col.id,
      status: col.status,
      total: col.total,
      currency: col.currency,
      description: col.description,
      created_date: col.created_date,
      paid_date: col.paid_date,
      due_date: col.due_date,
      customer: col.customer,
      subscription_id: col.subscription_id,
      invoice: col.invoice,
      invoice_number: col.invoice_number,
      payment_method_type: col.payment_method_type,
      checkout_url: col.checkout_url,
    }));

    return NextResponse.json({ 
      ok: true, 
      data: enrichedData,
      has_more: data.has_more,
      next_cursor: data.next_cursor,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}