import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar módulos (opcionalmente filtrados por agente)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');

    let sql = `
      SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.description,
        m.created_at,
        m.updated_at,
        a.name AS agent_name,
        c.name AS client_name
      FROM modules m
      INNER JOIN agents a ON a.id = m.agent_id
      LEFT JOIN clients c ON c.id = a.client_id
    `;
    const params: any[] = [];

    if (agentId) {
      sql += ' WHERE m.agent_id = ?';
      params.push(agentId);
    }

    sql += ' ORDER BY m.created_at DESC';

    const [rows] = await query<any>(sql, params);
    return NextResponse.json({ ok: true, modules: rows });
  } catch (e: any) {
    console.error('[API MODULES] Error loading modules:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar módulos' }, { status: 500 });
  }
}

// POST - Crear módulo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, agent_id } = body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'El título es obligatorio' }, { status: 400 });
    }

    if (!agent_id) {
      return NextResponse.json({ ok: false, error: 'El agente es obligatorio' }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = typeof description === 'string' ? description.trim() : null;

    // Verificar que el agente exista
    const [agentRows] = await query<any>(
      'SELECT id, name FROM agents WHERE id = ? LIMIT 1',
      [agent_id]
    );

    if (!agentRows || agentRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'El agente no existe' }, { status: 404 });
    }

    const [result] = await query<any>(
      'INSERT INTO modules (agent_id, title, description) VALUES (?, ?, ?)',
      [agent_id, trimmedTitle, trimmedDescription]
    );

    const insertResult = result as any;
    const newModuleId = insertResult?.insertId;

    const [moduleRows] = await query<any>(
      `SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.description,
        m.created_at,
        m.updated_at,
        a.name AS agent_name,
        c.name AS client_name
      FROM modules m
      INNER JOIN agents a ON a.id = m.agent_id
      LEFT JOIN clients c ON c.id = a.client_id
      WHERE m.id = ?`,
      [newModuleId]
    );

    return NextResponse.json({ ok: true, module: moduleRows?.[0] || null });
  } catch (e: any) {
    console.error('[API MODULES] Error creating module:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al crear módulo' }, { status: 500 });
  }
}


