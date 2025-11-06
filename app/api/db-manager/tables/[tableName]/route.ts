import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener datos paginados de una tabla
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Validar nombre de tabla (prevenir SQL injection)
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ ok: false, error: 'Nombre de tabla inválido' }, { status: 400 });
    }

    // Obtener estructura de la tabla
    const [columns] = await query<any>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );

    // Obtener total de registros
    const [countResult] = await query<any>(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = countResult[0]?.total || 0;

    // Obtener datos paginados
    // Intentar ordenar por id, si no existe usar la primera columna de clave primaria
    let orderBy = 'id DESC';
    const primaryKey = columns.find((col: any) => col.COLUMN_KEY === 'PRI');
    if (!primaryKey) {
      // Si no hay clave primaria, ordenar por la primera columna
      orderBy = columns.length > 0 ? `${columns[0].COLUMN_NAME} DESC` : '';
    } else if (primaryKey.COLUMN_NAME !== 'id') {
      orderBy = `${primaryKey.COLUMN_NAME} DESC`;
    }

    const [rows] = await query<any>(
      `SELECT * FROM \`${tableName}\` ${orderBy ? `ORDER BY ${orderBy}` : ''} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      ok: true,
      data: rows,
      columns: columns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (e: any) {
    console.error('[DB MANAGER] Error loading table data:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar datos' }, { status: 500 });
  }
}

// POST - Crear nuevo registro
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const body = await req.json();

    // Validar nombre de tabla
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ ok: false, error: 'Nombre de tabla inválido' }, { status: 400 });
    }

    // Obtener columnas de la tabla
    const [columns] = await query<any>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );

    // Filtrar solo las columnas que existen en la tabla
    const validColumns = columns.map((col: any) => col.COLUMN_NAME);
    const filteredData: any = {};
    
    for (const key in body) {
      if (validColumns.includes(key) && key !== 'id') {
        filteredData[key] = body[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ ok: false, error: 'No hay campos válidos para insertar' }, { status: 400 });
    }

    // Construir consulta INSERT
    const columnsList = Object.keys(filteredData);
    const valuesList = Object.values(filteredData);
    const placeholders = columnsList.map(() => '?').join(', ');
    const columnsStr = columnsList.map(col => `\`${col}\``).join(', ');

    await query(
      `INSERT INTO \`${tableName}\` (${columnsStr}) VALUES (${placeholders})`,
      valuesList
    );

    return NextResponse.json({ ok: true, message: 'Registro creado exitosamente' });
  } catch (e: any) {
    console.error('[DB MANAGER] Error creating record:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al crear registro' }, { status: 500 });
  }
}

// PUT - Actualizar registro
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const body = await req.json();

    // Validar nombre de tabla
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ ok: false, error: 'Nombre de tabla inválido' }, { status: 400 });
    }

    // Obtener columnas de la tabla
    const [columns] = await query<any>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );

    // Encontrar la clave primaria
    const primaryKey = columns.find((col: any) => col.COLUMN_KEY === 'PRI');
    if (!primaryKey) {
      return NextResponse.json({ ok: false, error: 'La tabla no tiene clave primaria' }, { status: 400 });
    }

    const pkColumn = primaryKey.COLUMN_NAME;
    const pkValue = body[pkColumn] || body.id;
    
    if (!pkValue) {
      return NextResponse.json({ ok: false, error: `Se requiere el valor de la clave primaria (${pkColumn})` }, { status: 400 });
    }

    // Filtrar solo las columnas que existen en la tabla (excluir clave primaria)
    const validColumns = columns.map((col: any) => col.COLUMN_NAME);
    const filteredData: any = {};
    
    for (const key in body) {
      if (validColumns.includes(key) && key !== pkColumn) {
        filteredData[key] = body[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ ok: false, error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    // Construir consulta UPDATE
    const updatePairs = Object.keys(filteredData).map(key => `\`${key}\` = ?`).join(', ');
    const updateValues = Object.values(filteredData);

    await query(
      `UPDATE \`${tableName}\` SET ${updatePairs} WHERE \`${pkColumn}\` = ?`,
      [...updateValues, pkValue]
    );

    return NextResponse.json({ ok: true, message: 'Registro actualizado exitosamente' });
  } catch (e: any) {
    console.error('[DB MANAGER] Error updating record:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al actualizar registro' }, { status: 500 });
  }
}

// DELETE - Eliminar registro
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validar nombre de tabla
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json({ ok: false, error: 'Nombre de tabla inválido' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Se requiere el ID del registro' }, { status: 400 });
    }

    // Obtener la clave primaria de la tabla
    const [columns] = await query<any>(
      `SELECT COLUMN_NAME, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'
       LIMIT 1`,
      [tableName]
    );

    const pkColumn = columns.length > 0 ? columns[0].COLUMN_NAME : 'id';

    await query(`DELETE FROM \`${tableName}\` WHERE \`${pkColumn}\` = ?`, [id]);

    return NextResponse.json({ ok: true, message: 'Registro eliminado exitosamente' });
  } catch (e: any) {
    console.error('[DB MANAGER] Error deleting record:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al eliminar registro' }, { status: 500 });
  }
}

