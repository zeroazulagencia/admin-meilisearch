import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// POST - Check if a client has associated agents before deletion
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'client_id requerido' },
        { status: 400 }
      );
    }

    const [agents]: any = await query(
      'SELECT id, name FROM agents WHERE client_id = ?',
      [id]
    );

    if (agents && agents.length > 0) {
      return NextResponse.json({
        ok: false,
        blocked: true,
        error: 'No se puede eliminar: este cliente tiene agentes asociados',
        agents: agents.map((a: any) => ({ id: a.id, name: a.name })),
        agentCount: agents.length,
      }, { status: 409 });
    }

    return NextResponse.json({ ok: true, agentCount: 0 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error' },
      { status: 500 }
    );
  }
}
