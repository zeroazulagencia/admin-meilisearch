import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const TABLE = 'modulos_auditoria_agentes_25_audits';

export async function GET(request: NextRequest) {
  try {
    const agente = request.nextUrl.searchParams.get('agente') || '';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 300), 500);

    let sql = `SELECT
        id, agente_id, cliente_id_workers, cliente_empresa, agent_display_name, plataforma,
        audit_start, audit_end, summary, examples, created_at, updated_at
       FROM ${TABLE}`;
    const params: any[] = [];
    if (agente) {
      sql += ' WHERE agente_id = ?';
      params.push(agente);
    }
    sql += ' ORDER BY audit_start DESC LIMIT ?';
    params.push(limit);

    const [rows] = await query<any[]>(sql, params);

    const lista = (rows || []).map((r: any) => ({
      id: r.id,
      agente_id: r.agente_id,
      cliente_id_workers: r.cliente_id_workers,
      cliente_empresa: r.cliente_empresa,
      agent_display_name: r.agent_display_name,
      plataforma: r.plataforma,
      audit_start: r.audit_start,
      audit_end: r.audit_end,
      summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary,
      examples: typeof r.examples === 'string' ? JSON.parse(r.examples) : r.examples,
      received_at: r.created_at,
    }));

    // Lista única de agentes para el selector comparativo
    const [agentesRaw] = await query<any[]>(
      `SELECT agente_id, COUNT(*) as count FROM ${TABLE} GROUP BY agente_id ORDER BY agente_id`
    );

    return NextResponse.json({
      ok: true,
      count: lista.length,
      agentes: (agentesRaw || []).map((a: any) => ({ agente: a.agente_id, count: a.count })),
      registros: lista,
    });
  } catch (error: any) {
    console.error('[AUDITORIA][GET] Error:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Error al cargar auditorías: ' + (error?.message || 'desconocido') }, { status: 500 });
  }
}