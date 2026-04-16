const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || '3306',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'admin_dworkers',
  });

  const keys = [
    'dropbox_app_key',
    'dropbox_app_secret',
    'dropbox_refresh_token',
    'dropbox_access_token',
  ];

  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await conn.execute(
    `SELECT config_key, config_value FROM modulos_backup_7_config WHERE config_key IN (${placeholders})`,
    keys
  );

  const result = {};
  for (const key of keys) {
    const row = rows.find((r) => r.config_key === key);
    result[key] = {
      hasValue: Boolean(row?.config_value),
      length: row?.config_value?.length || 0,
    };
  }

  console.log(JSON.stringify(result, null, 2));
  await conn.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
