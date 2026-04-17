import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'bitnami',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'admin_dworkers',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      'SELECT `key`, value FROM modules_13_config LIMIT 100'
    );
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row['key']] = row.value;
    }
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const configKeys = [
      'wp_db_host',
      'wp_db_port',
      'wp_db_name',
      'wp_db_user',
      'wp_db_password',
      'wp_table_prefix',
      'api_token',
      'zoho_client_id',
      'zoho_client_secret',
      'zoho_refresh_token',
    ];

    for (const key of configKeys) {
      const value = body[key] || '';
      await pool.query(
        'INSERT INTO modules_13_config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [key, value, value]
      );
    }

    return NextResponse.json({ ok: true, message: 'Configuración guardada' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}