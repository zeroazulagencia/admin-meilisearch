import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

/**
 * Verifica auth por dos mecanismos:
 * 1. x-admin-user-id (admin panel, desde localStorage tras login)
 * 2. Authorization: Bearer <api_token> (servicios externos, cron, agentes)
 * 
 * Retorna { userId: number | null } si pasa, o NextResponse 401 si falla.
 */
export async function requireAuth(req: NextRequest): Promise<{ userId: number | null } | NextResponse> {
  // --- Método 1: x-admin-user-id (admin panel) ---
  const adminUserId = req.headers.get('x-admin-user-id');
  if (adminUserId) {
    try {
      const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'bitnami',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'admin_dworkers',
        waitForConnections: true,
        connectionLimit: 5,
      });
      const [rows]: any = await pool.query(
        'SELECT id, permissions FROM clients WHERE id = ? LIMIT 1',
        [parseInt(adminUserId)]
      );
      await pool.end();

      if (rows && rows.length > 0) {
        const user = rows[0];
        let permissions: any = {};
        try {
          permissions = typeof user.permissions === 'string'
            ? JSON.parse(user.permissions)
            : (user.permissions || {});
        } catch { /* ignore */ }

        const isAdmin = permissions?.type === 'admin';
        const hasModuleAccess =
          permissions?.modulos?.viewOwn === true ||
          permissions?.modulos?.viewAll === true ||
          permissions?.modulos?.editOwn === true ||
          permissions?.modulos?.editAll === true;

        if (isAdmin || hasModuleAccess || permissions?.canLogin !== false) {
          return { userId: user.id };
        }
      }
    } catch {
      // fall through to next method
    }
  }

  // --- Método 2: Authorization: Bearer <api_token> (externos) ---
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'bitnami',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'admin_dworkers',
        waitForConnections: true,
        connectionLimit: 5,
      });
      const [rows]: any = await pool.query(
        'SELECT `key`, value FROM modules_13_config WHERE `key` = ?',
        ['api_token']
      );
      await pool.end();

      if (rows && rows.length > 0 && rows[0].value === token) {
        return { userId: null };
      }
    } catch {
      // auth failed
    }
  }

  return NextResponse.json(
    { ok: false, error: 'No autorizado' },
    { status: 401 }
  );
}
