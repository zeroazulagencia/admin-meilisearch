import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar todas las tablas de la base de datos
export async function GET() {
  try {
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

