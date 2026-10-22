import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { leerSesion } from '@/utils/session';
import { query } from '@/utils/db';

/**
 * Verifica auth por dos mecanismos:
 * 1. Cookie de sesión firmada `admin_session` (admin panel, la emite el login).
 *    La cabecera x-admin-user-id ya NO autentica: cualquiera podía fabricarla.
 * 2. Authorization: Bearer <api_token> (servicios externos, cron, agentes)
 * 
 * Retorna { userId: number | null } si pasa, o NextResponse 401 si falla.
 */
export async function requireAuth(req: NextRequest): Promise<{ userId: number | null } | NextResponse> {
  // --- Método 1: cookie de sesión firmada (admin panel) ---
  const adminUserId = leerSesion(req);
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
        [adminUserId]
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

/**
 * Como requireAuth, pero solo admite admins del panel (permissions.type === 'admin').
 * El Bearer de servicio no basta (403). Retorna null si pasa, o NextResponse 401/403.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const forbidden = NextResponse.json({ ok: false, error: 'Solo administradores' }, { status: 403 });
  if (auth.userId == null) return forbidden;

  try {
    const [rows] = await query<{ permissions: any }>('SELECT permissions FROM clients WHERE id = ? LIMIT 1', [auth.userId]);
    const raw = rows[0]?.permissions;
    const permissions = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    return permissions?.type === 'admin' ? null : forbidden;
  } catch {
    return forbidden;
  }
}
