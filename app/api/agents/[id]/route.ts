import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener un agente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [rows] = await query<any>(
      'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name FROM agents WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, agent: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// PUT - Actualizar un agente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    await query(
      'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, email = ?, phone = ?, agent_code = ?, knowledge = ?, workflows = ?, conversation_agent_name = ? WHERE id = ?',
      [
        body.client_id,
        body.name,
        body.description || null,
        body.photo || null,
        body.email || null,
        body.phone || null,
        body.agent_code || null,
        JSON.stringify(body.knowledge || {}),
        JSON.stringify(body.workflows || {}),
        body.conversation_agent_name || null,
        id
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// DELETE - Eliminar un agente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM agents WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
