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

    if (!config.treli_token) {
      return NextResponse.json({ ok: false, error: 'Treli token no configurado' }, { status: 500 });
    }

    const paymentId = req.nextUrl.searchParams.get('payment_id');
    if (!paymentId) {
      return NextResponse.json({ ok: false, error: 'payment_id requerido' }, { status: 400 });
    }

    const url = `https://treli.co/wp-json/api/payments/list?payment_id=${paymentId}`;

    const res = await fetch(url, {
      headers: { 
        'Authorization': 'Basic ' + config.treli_token,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: err }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}