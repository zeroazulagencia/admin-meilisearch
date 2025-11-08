import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// POST - Ejecutar migración para crear la tabla developer_docs
export async function POST(req: NextRequest) {
  try {
    // Verificar si la tabla ya existe
    const [tableCheck] = await query<any>(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'developer_docs'`
    );
    
    const tableExists = tableCheck && tableCheck.length > 0 && tableCheck[0].count === 1;

    if (tableExists) {
      return NextResponse.json({ 
        ok: true, 
        message: 'La tabla developer_docs ya existe',
        results: ['Tabla developer_docs ya existe, no se requiere migración']
      });
    }

    const results: string[] = [];

    // Crear la tabla developer_docs
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS developer_docs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          agent_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
          INDEX idx_agent_id (agent_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      results.push('Tabla developer_docs creada exitosamente');
    } catch (e: any) {
      results.push(`Error creando tabla developer_docs: ${e?.message || 'Error desconocido'}`);
      return NextResponse.json({ 
        ok: false, 
        error: e?.message || 'Error al ejecutar migración',
        results 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Migración ejecutada exitosamente',
      results 
    });
  } catch (e: any) {
    console.error('[MIGRATION] Error executing migration:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al ejecutar migración' 
    }, { status: 500 });
  }
}

