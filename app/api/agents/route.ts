import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar todos los agentes
export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name FROM agents ORDER BY id'
    );
    return NextResponse.json({ ok: true, agents: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// POST - Crear nuevo agente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [result] = await query<any>(
      'INSERT INTO agents (client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        body.client_id,
        body.name,
        body.description || null,
        body.photo || null,
        body.email || null,
        body.phone || null,
        body.agent_code || null,
        'active',
        JSON.stringify(body.knowledge || {}),
        JSON.stringify(body.workflows || {}),
        body.conversation_agent_name || null,
        body.reports_agent_name || null
      ]
    );
    const insertResult = result as any;
    return NextResponse.json({ ok: true, id: insertResult?.insertId || 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
