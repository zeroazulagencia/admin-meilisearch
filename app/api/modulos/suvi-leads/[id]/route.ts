import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// Desactivar caché completamente
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Obtener detalle completo de un lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    if (!leadId || isNaN(Number(leadId))) {
      return NextResponse.json(
        { ok: false, error: 'ID de lead inválido' },
        { status: 400 }
      );
    }

    const [rows] = await query<any>(
      `SELECT * FROM modulos_suvi_12_leads WHERE id = ? LIMIT 1`,
      [leadId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, lead: rows[0] }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (e: any) {
    console.error('[API SUVI-LEADS/:id] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error al obtener lead' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado del lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await request.json();

    if (!leadId || isNaN(Number(leadId))) {
      return NextResponse.json(
        { ok: false, error: 'ID de lead inválido' },
        { status: 400 }
      );
    }

    // Construir SET dinámicamente
    const allowedFields = [
      'processing_status',
      'current_step',
      'facebook_cleaned_data',
      'ai_enriched_data',
      'ai_summary',
      'campaign_type',
      'opportunity_type_id',
      'salesforce_account_id',
      'salesforce_account_name',
      'salesforce_opportunity_id',
      'salesforce_owner_id',
      'salesforce_project_id',
      'error_message',
      'error_step',
      'facebook_fetched_at',
      'ai_processed_at',
      'salesforce_account_created_at',
      'salesforce_opportunity_created_at',
      'completed_at',
      'processing_time_seconds'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // Si es JSON, convertir a string
        if (field.includes('_data')) {
          values.push(JSON.stringify(body[field]));
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    values.push(leadId);

    await query<any>(
      `UPDATE modulos_suvi_12_leads SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      ok: true,
      message: 'Lead actualizado exitosamente'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (e: any) {
    console.error('[API SUVI-LEADS/:id PATCH] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error al actualizar lead' },
      { status: 500 }
    );
  }
}
