import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener todos los documentos de developers, opcionalmente filtrados por agent_id
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');

    let sql = `
      SELECT 
        dd.*,
        a.name as agent_name,
        a.agent_code
      FROM developer_docs dd
      INNER JOIN agents a ON dd.agent_id = a.id
    `;
    const params: any[] = [];

    if (agentId) {
      sql += ' WHERE dd.agent_id = ?';
      params.push(agentId);
    }

    sql += ' ORDER BY dd.created_at DESC';

    const [rows] = await query<any>(sql, params);

    return NextResponse.json({ 
      ok: true, 
      docs: rows || [] 
    });
  } catch (e: any) {
    console.error('[API DEVELOPER DOCS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al obtener documentos' 
    }, { status: 500 });
  }
}

// POST - Crear un nuevo documento de developer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, title, content } = body;

    if (!agent_id || !title || !content) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, title y content' 
      }, { status: 400 });
    }

    // Verificar que el agente existe
    const [agentRows] = await query<any>(
      'SELECT id FROM agents WHERE id = ? LIMIT 1',
      [agent_id]
    );

    if (!agentRows || agentRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Agente no encontrado' 
      }, { status: 404 });
    }

    // Insertar el documento
    const [result] = await query<any>(
      'INSERT INTO developer_docs (agent_id, title, content) VALUES (?, ?, ?)',
      [agent_id, title.trim(), content.trim()]
    );

    return NextResponse.json({ 
      ok: true, 
      message: 'Documento creado exitosamente',
      doc: {
        id: result.insertId,
        agent_id,
        title: title.trim(),
        content: content.trim()
      }
    });
  } catch (e: any) {
    console.error('[API DEVELOPER DOCS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al crear documento' 
    }, { status: 500 });
  }
}

