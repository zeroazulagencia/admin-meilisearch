import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

const DB_MANAGER_API_KEY_HEADER = 'x-api-key';

function isAuthorized(req: NextRequest): boolean {
  const requiredKey = process.env.DB_MANAGER_API_KEY;
  if (!requiredKey) {
    return false;
  }
  const providedKey = req.headers.get(DB_MANAGER_API_KEY_HEADER) || '';
  return providedKey === requiredKey;
}

// GET - Listar todas las tablas de la base de datos
export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const [rows] = await query<any>(
      `SELECT TABLE_NAME as name 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );
    
    return NextResponse.json({ ok: true, tables: rows });
  } catch (e: any) {
    console.error('[DB MANAGER] Error loading tables:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar tablas' }, { status: 500 });
  }
}
