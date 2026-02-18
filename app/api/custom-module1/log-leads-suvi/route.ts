/**
 * MÓDULO 1 - SUVI LEADS
 * API: Listar y crear leads
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// Desactivar caché completamente
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar leads con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status') || '';
    const campaignType = searchParams.get('campaign_type') || '';
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;

    // Construir query dinámicamente
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (status) {
      whereConditions.push('processing_status = ?');
      params.push(status);
    }

    if (campaignType) {
      whereConditions.push('campaign_type = ?');
      params.push(campaignType);
    }

    if (search) {
      whereConditions.push('(leadgen_id LIKE ? OR campaign_name LIKE ? OR salesforce_account_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Consultar leads
    const [leads] = await query<any>(
      `SELECT 
        id,
        leadgen_id,
        form_id,
        page_id,
        campaign_name,
        ad_name,
        campaign_type,
        processing_status,
        current_step,
        error_message,
        salesforce_account_name,
        salesforce_opportunity_id,
        received_at,
        completed_at,
        processing_time_seconds,
        facebook_cleaned_data,
        facebook_raw_data,
        ai_enriched_data,
        ai_summary,
        ai_processed_at
      FROM modulos_suvi_12_leads
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Contar total
    const [countResult] = await query<any>(
      `SELECT COUNT(*) as total FROM modulos_suvi_12_leads ${whereClause}`,
      params
    );

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Estadísticas generales
    const [stats] = await query<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN processing_status = 'completado' THEN 1 ELSE 0 END) as completados,
        SUM(CASE WHEN processing_status = 'error' THEN 1 ELSE 0 END) as errores,
        SUM(CASE WHEN processing_status NOT IN ('completado', 'error') THEN 1 ELSE 0 END) as en_proceso,
        AVG(CASE WHEN processing_time_seconds IS NOT NULL THEN processing_time_seconds ELSE NULL END) as avg_time
      FROM modulos_suvi_12_leads`
    );

    // Parsear campos JSON
    const leadsWithParsedData = leads.map((lead: any) => ({
      ...lead,
      facebook_cleaned_data: lead.facebook_cleaned_data ? JSON.parse(lead.facebook_cleaned_data) : null,
      facebook_raw_data: lead.facebook_raw_data ? JSON.parse(lead.facebook_raw_data) : null,
      ai_enriched_data: lead.ai_enriched_data ? JSON.parse(lead.ai_enriched_data) : null,
    }));

    return NextResponse.json({
      ok: true,
      leads: leadsWithParsedData,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      stats: stats[0] || {}
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (e: any) {
    console.error('[API SUVI-LEADS] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error al obtener leads' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo lead (para webhook de Facebook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      leadgen_id,
      page_id,
      form_id,
      campaign_name,
      ad_name,
      facebook_raw_data
    } = body;

    if (!leadgen_id) {
      return NextResponse.json(
        { ok: false, error: 'leadgen_id es requerido' },
        { status: 400 }
      );
    }

    await query<any>(
      `INSERT INTO modulos_suvi_12_leads (
        leadgen_id,
        page_id,
        form_id,
        campaign_name,
        ad_name,
        facebook_raw_data,
        processing_status,
        current_step
      ) VALUES (?, ?, ?, ?, ?, ?, 'recibido', 'Lead recibido desde Facebook')`,
      [
        leadgen_id,
        page_id || null,
        form_id || null,
        campaign_name || null,
        ad_name || null,
        JSON.stringify(facebook_raw_data || {}),
      ]
    );

    return NextResponse.json({
      ok: true,
      message: 'Lead creado exitosamente',
      leadgen_id
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (e: any) {
    console.error('[API SUVI-LEADS POST] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error al crear lead' },
      { status: 500 }
    );
  }
}
