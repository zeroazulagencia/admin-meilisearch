import mysql from 'mysql2/promise';

// Conexión a MySQL usando variables de entorno
// Requiere configurar: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'admin_dworkers',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<[T[], mysql.FieldPacket[]]> {
  const conn = getDbPool();
  return conn.query<T[]>(sql, params);
}


