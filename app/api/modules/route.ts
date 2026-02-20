import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar todos los módulos con información del agente y cliente
export async function GET() {
  try {
    console.log('[API MODULES] [GET] Iniciando carga de módulos...');
    
    const [rows] = await query<any>(`
      SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.folder_name,
        m.description,
        m.created_at,
        m.updated_at,
        a.name as agent_name,
        a.photo as agent_photo,
        a.client_id,
        c.name as client_name
      FROM modules m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN clients c ON a.client_id = c.id
      ORDER BY m.created_at DESC
    `);
    
    console.log('[API MODULES] [GET] Módulos cargados:', rows?.length || 0);
    
    return NextResponse.json({
      ok: true,
      modules: rows || []
    });
  } catch (error: any) {
    console.error('[API MODULES] [GET] Error cargando módulos:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al cargar los módulos: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo módulo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, title, description } = body;
    
    console.log('[API MODULES] [POST] Creando módulo:', { agent_id, title });
    
    // Validaciones
    if (!agent_id || !title) {
      return NextResponse.json(
        {
          ok: false,
          error: 'agent_id y title son requeridos'
        },
        { status: 400 }
      );
    }
    
    // Generar folder_name único basado en el título
    const folderName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Insertar módulo
    const [result] = await query<any>(
      'INSERT INTO modules (agent_id, title, folder_name, description) VALUES (?, ?, ?, ?)',
      [agent_id, title, folderName, description || null]
    );
    
    const moduleId = (result as any).insertId;
    
    console.log('[API MODULES] [POST] Módulo creado con ID:', moduleId);
    
    // Obtener el módulo completo con datos del agente
    const [moduleRows] = await query<any>(
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
    
    return NextResponse.json({
      ok: true,
      module: moduleRows && moduleRows.length > 0 ? moduleRows[0] : null
    });
  } catch (error: any) {
    console.error('[API MODULES] [POST] Error creando módulo:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al crear el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}
