import mysql, { RowDataPacket } from 'mysql2/promise';
import { getConfig } from './config';

async function getWpConnection() {
  const host = await getConfig('wp_db_host');
  const portRaw = await getConfig('wp_db_port');
  const database = await getConfig('wp_db_name');
  const user = await getConfig('wp_db_user');
  const password = await getConfig('wp_db_password');

  if (!host || !database || !user) {
    throw new Error('WP DB config incompleta');
  }

  const port = portRaw ? Number(portRaw) : 3306;
  return mysql.createConnection({ host, port, user, password: password || '', database });
}

export async function queryWp<T = RowDataPacket>(sql: string, params: any[] = []) {
  const conn = await getWpConnection();
  const [rows] = await conn.execute<RowDataPacket[]>(sql, params);
  await conn.end();
  return rows as T[];
}

export async function getWpTablePrefix() {
  const prefix = await getConfig('wp_table_prefix');
  return prefix || 'krh_';
}
