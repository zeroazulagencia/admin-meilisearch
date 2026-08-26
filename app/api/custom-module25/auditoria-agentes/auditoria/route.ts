import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { requireAuth } from '@/utils/api-auth';

export const dynamic = 'force-dynamic';

const TABLE = 'modulos_auditoria_agentes_25_audits';

export async function GET(request: NextRequest) {
  try {
    // ---- Auth ----
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { userId } = auth;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Autenticación requerida' }, { status: 401 });
    }

    // ---- Obtener permisos del usuario ----
    let esAdmin = false;
    try {
      const [uRows]: any = await query(
        'SELECT permissions FROM clients WHERE id = ? LIMIT 1',
        [userId]
      );
      if (uRows && uRows.length > 0) {
        const perms = typeof uRows[0].permissions === 'string'
          ? JSON.parse(uRows[0].permissions)
          : (uRows[0].permissions || {});
        esAdmin = perms?.type === 'admin';
      }
    } catch {
      // fallback: no admin
    }

    const agente = request.nextUrl.searchParams.get('agente') || '';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 300), 500);

    // ---- Construir SQL ----
    const conditions: string[] = [];
    const params: any[] = [];

    if (!esAdmin) {
      // No-admin: solo ve registros donde cliente_id_workers coincida con su userId
      conditions.push('cliente_id_workers = ?');
      params.push(String(userId));
    }

    if (agente) {
      conditions.push('agente_id = ?');
      params.push(agente);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `SELECT
        id, agente_id, cliente_id_workers, cliente_empresa, agent_display_name, plataforma,
        audit_start, audit_end, summary, examples, created_at, updated_at
       FROM ${TABLE}
       ${whereClause}
       ORDER BY audit_start DESC
       LIMIT ?`;
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

    // ---- Lista de agentes (filtrada si no-admin) ----
    const agtConditions: string[] = [];
    const agtParams: any[] = [];

    if (!esAdmin) {
      agtConditions.push('cliente_id_workers = ?');
      agtParams.push(String(userId));
    }

    const agtWhere = agtConditions.length > 0 ? 'WHERE ' + agtConditions.join(' AND ') : '';

    const [agentesRaw] = await query<any[]>(
      `SELECT agente_id, COUNT(*) as count FROM ${TABLE} ${agtWhere}
       GROUP BY agente_id ORDER BY agente_id`,
      agtParams
    );

    return NextResponse.json({
      ok: true,
      esAdmin,
      userId,
      count: lista.length,
      agentes: (agentesRaw || []).map((a: any) => ({ agente: a.agente_id, count: a.count })),
      registros: lista,
    });
  } catch (error: any) {
    console.error('[AUDITORIA][GET] Error:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Error al cargar auditorías: ' + (error?.message || 'desconocido') }, { status: 500 });
  }
}
