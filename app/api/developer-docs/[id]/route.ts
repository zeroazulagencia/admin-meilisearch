import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener un documento específico por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [rows] = await query<any>(
      `SELECT 
        dd.*,
        a.name as agent_name,
        a.agent_code
      FROM developer_docs dd
      INNER JOIN agents a ON dd.agent_id = a.id
      WHERE dd.id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Documento no encontrado' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      doc: rows[0] 
    });
  } catch (e: any) {
    console.error('[API DEVELOPER DOCS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al obtener documento' 
    }, { status: 500 });
  }
}

// PUT - Actualizar un documento
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere title y content' 
      }, { status: 400 });
    }

    // Verificar que el documento existe
    const [existingRows] = await query<any>(
      'SELECT id FROM developer_docs WHERE id = ? LIMIT 1',
      [id]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Documento no encontrado' 
      }, { status: 404 });
    }

    // Actualizar el documento
    await query(
      'UPDATE developer_docs SET title = ?, content = ? WHERE id = ?',
      [title.trim(), content.trim(), id]
    );

    return NextResponse.json({ 
      ok: true, 
      message: 'Documento actualizado exitosamente'
    });
  } catch (e: any) {
    console.error('[API DEVELOPER DOCS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al actualizar documento' 
    }, { status: 500 });
  }
}

// DELETE - Eliminar un documento
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Verificar que el documento existe
    const [existingRows] = await query<any>(
      'SELECT id FROM developer_docs WHERE id = ? LIMIT 1',
      [id]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Documento no encontrado' 
      }, { status: 404 });
    }

    // Eliminar el documento
    await query('DELETE FROM developer_docs WHERE id = ?', [id]);

    return NextResponse.json({ 
      ok: true, 
      message: 'Documento eliminado exitosamente'
    });
  } catch (e: any) {
    console.error('[API DEVELOPER DOCS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al eliminar documento' 
    }, { status: 500 });
  }
}

