/**
 * MÓDULO 6 - SUVI Opportunity
 * GET: listar registros con paginación y filtros
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || '';
    const tipo = searchParams.get('tipo') || '';
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [];
    const params: any[] = [];
    if (status) {
      whereConditions.push('processing_status = ?');
      params.push(status);
    }
    if (tipo) {
      whereConditions.push('tipo = ?');
      params.push(tipo);
    }
    if (search) {
      whereConditions.push('(email LIKE ? OR nombre LIKE ? OR apellido LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereClause = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';

    let [rows] = await query<any>(
      `SELECT id, email, nombre, apellido, telefono, pais, indicativo, ciudad, nombre_proyecto, form_variant, tipo,
              salesforce_account_id, salesforce_opportunity_id, salesforce_owner_id, proyecto_id,
              processing_status, current_step, error_message, received_at, completed_at, created_at,
              payload_raw
       FROM modulos_suvi_6_opportunities ${whereClause}
       ORDER BY received_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    rows = (rows || []).map((r: any) => {
      if (r.payload_raw != null && typeof r.payload_raw === 'string') {
        try { r.payload_raw = JSON.parse(r.payload_raw); } catch (_) { /* keep string */ }
      }
      return r;
    });
    const [countResult] = await query<any>(`SELECT COUNT(*) as total FROM modulos_suvi_6_opportunities ${whereClause}`, params);
    const total = countResult[0]?.total || 0;
    const [stats] = await query<any>(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN processing_status = 'completado' THEN 1 ELSE 0 END) as completados,
        SUM(CASE WHEN processing_status = 'error' THEN 1 ELSE 0 END) as errores,
        SUM(CASE WHEN processing_status NOT IN ('completado','error') THEN 1 ELSE 0 END) as en_proceso
       FROM modulos_suvi_6_opportunities`
    );

    return NextResponse.json({
      ok: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: stats[0] || {},
    });
  } catch (e: any) {
    console.error('[MOD6-API]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
