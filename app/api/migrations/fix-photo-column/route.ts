import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export async function POST(request: NextRequest) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Verificar si la columna existe y su tipo actual
    const [columns]: any = await connection.execute(
      `SELECT COLUMN_TYPE, COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'agents' 
       AND COLUMN_NAME = 'photo'`,
      [process.env.DB_NAME]
    );

    if (columns.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'La columna photo no existe en la tabla agents' },
        { status: 400 }
      );
    }

    const currentType = columns[0].COLUMN_TYPE;
    if (currentType.toLowerCase().includes('text')) {
      return NextResponse.json(
        { ok: true, message: 'La columna photo ya es de tipo TEXT. No se requiere migración.' },
        { status: 200 }
      );
    }

    // Ejecutar la migración
    await connection.execute(
      `ALTER TABLE agents MODIFY COLUMN photo TEXT`
    );

    return NextResponse.json({
      ok: true,
      message: 'Columna photo actualizada exitosamente a TEXT',
    });
  } catch (error: any) {
    console.error('Error en migración:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error al ejecutar la migración' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

