import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getDbConfig(poolMain: mysql.Pool) {
  const [rows]: any = await poolMain.query(
    `SELECT key, value FROM modules_13_config WHERE \`key\` IN (
      'wp_db_host', 'wp_db_port', 'wp_db_name', 'wp_db_user', 'wp_db_password', 'wp_table_prefix', 'api_token'
    )`
  );
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
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

    const wpPool = mysql.createPool({
      host: config.wp_db_host,
      port: parseInt(config.wp_db_port || '3306'),
      user: config.wp_db_user,
      password: config.wp_db_password,
      database: config.wp_db_name,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    const prefix = config.wp_table_prefix || 'anu_';

    const [users]: any = await wpPool.query(
      `SELECT ID, user_login, user_email, display_name, user_registered, user_status
       FROM ${prefix}users 
       WHERE ID NOT IN (
         SELECT user_id FROM ${prefix}usermeta WHERE meta_key = '${prefix}capabilities' AND meta_value LIKE '%administrator%'
       )
       ORDER BY user_registered DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const userIds = users.map((u: any) => u.ID);
    let clientes: any[] = [];

    if (userIds.length > 0) {
      const [metas]: any = await wpPool.query(
        `SELECT user_id, meta_key, meta_value 
         FROM ${prefix}usermeta 
         WHERE user_id IN (?)`,
        [userIds]
      );

      const metaMap: Record<string, Record<string, string>> = {};
      for (const meta of metas) {
        if (!metaMap[meta.user_id]) metaMap[meta.user_id] = {};
        metaMap[meta.user_id][meta.meta_key.replace(prefix, '')] = meta.meta_value;
      }

      clientes = users.map((user: any) => ({
        ID: user.ID,
        user_login: user.user_login,
        user_email: user.user_email,
        display_name: user.display_name,
        user_registered: user.user_registered,
        meta: metaMap[user.ID] || {},
      }));
    }

    const [totalRows]: any = await wpPool.query(
      `SELECT COUNT(*) as total FROM ${prefix}users WHERE ID NOT IN (
        SELECT user_id FROM ${prefix}usermeta WHERE meta_key = '${prefix}capabilities' AND meta_value LIKE '%administrator%'
      )`
    );

    await wpPool.end();
    return NextResponse.json({
      ok: true,
      data: clientes,
      total: totalRows[0]?.total || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    await poolMain.end();
  }
}