import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener un módulo específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    console.log('[API MODULES] [GET BY ID] Cargando módulo:', moduleId);
    
    const [rows] = await query<any>(
      `SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.folder_name,
        m.description,
        m.created_at,
        m.updated_at,
        a.name as agent_name,
        c.name as client_name
      FROM modules m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE m.id = ?`,
      [moduleId]
    );
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Módulo no encontrado'
        },
        { status: 404 }
      );
    }
    
    console.log('[API MODULES] [GET BY ID] Módulo encontrado:', rows[0].title);
    
    return NextResponse.json({
      ok: true,
      module: rows[0]
    });
  } catch (error: any) {
    console.error('[API MODULES] [GET BY ID] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al cargar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un módulo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    const body = await request.json();
    const { title, description } = body;
    
    console.log('[API MODULES] [PUT] Actualizando módulo:', moduleId);
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'El título es requerido'
        },
        { status: 400 }
      );
    }
    
    await query<any>(
      'UPDATE modules SET title = ?, description = ? WHERE id = ?',
      [title.trim(), description || null, moduleId]
    );
    
    // Obtener el módulo actualizado
    const [rows] = await query<any>(
      `SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.folder_name,
        m.description,
        m.created_at,
        m.updated_at,
        a.name as agent_name,
        c.name as client_name
      FROM modules m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE m.id = ?`,
      [moduleId]
    );
    
    console.log('[API MODULES] [PUT] Módulo actualizado exitosamente');
    
    return NextResponse.json({
      ok: true,
      module: rows && rows.length > 0 ? rows[0] : null
    });
  } catch (error: any) {
    console.error('[API MODULES] [PUT] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al actualizar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un módulo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    console.log('[API MODULES] [DELETE] Eliminando módulo:', moduleId);
    
    await query<any>('DELETE FROM modules WHERE id = ?', [moduleId]);
    
    console.log('[API MODULES] [DELETE] Módulo eliminado exitosamente');
    
    return NextResponse.json({
      ok: true,
      message: 'Módulo eliminado correctamente'
    });
  } catch (error: any) {
    console.error('[API MODULES] [DELETE] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al eliminar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}
