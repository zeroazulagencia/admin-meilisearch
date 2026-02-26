/**
 * MÓDULO 1 - SUVI LEADS
 * Reenvía al webhook de Google Sheet todos los leads con processing_status = omitido_interno
 * Body opcional: { "leadIds": [183, 207, 222] } para reenviar solo esos IDs
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { sendOmitidoToWebhook } from '@/utils/modulos/suvi-leads/module1-webhook-omitidos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function inferOmitidoReason(currentStep: string | null): string {
  if (!currentStep) return 'Reenvío histórico';
  if (currentStep.toLowerCase().includes('pauta interna')) return 'Pauta Interna';
  if (currentStep.toLowerCase().includes('bloqueado')) return 'Formulario Bloqueado';
  return 'Reenvío histórico';
}

export async function POST(req: NextRequest) {
  try {
    let leadIdsFilter: number[] | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.leadIds) && body.leadIds.length > 0) {
        leadIdsFilter = body.leadIds.map((x: any) => parseInt(String(x), 10)).filter((n: number) => !isNaN(n));
      }
    } catch {
      // sin body
    }

    const whereClause = leadIdsFilter?.length
      ? `processing_status = 'omitido_interno' AND id IN (${leadIdsFilter.join(',')})`
      : "processing_status = 'omitido_interno'";

    const [rows] = await query<any>(
      `SELECT id, leadgen_id, form_id, campaign_name, ad_name, current_step, ai_enriched_data
       FROM modulos_suvi_12_leads
       WHERE ${whereClause}
       ORDER BY id ASC`
    );

    let sent = 0;
    let failed = 0;
    const errors: { leadId: number; error: string }[] = [];

    for (const lead of rows) {
      let enrichedData: Record<string, any>;
      try {
        enrichedData = typeof lead.ai_enriched_data === 'string'
          ? JSON.parse(lead.ai_enriched_data)
          : lead.ai_enriched_data || {};
      } catch {
        errors.push({ leadId: lead.id, error: 'ai_enriched_data inválido' });
        failed++;
        continue;
      }

      const ok = await sendOmitidoToWebhook(lead.id, enrichedData, {
        leadgen_id: lead.leadgen_id,
        form_id: lead.form_id,
        campaign_name: lead.campaign_name,
        ad_name: lead.ad_name,
        omitido_reason: inferOmitidoReason(lead.current_step),
      });

      if (ok) sent++;
      else {
        failed++;
        errors.push({ leadId: lead.id, error: 'Webhook respondió error' });
      }
    }

    return NextResponse.json({
      ok: true,
      total: rows.length,
      sent,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (e: any) {
    console.error('[REENVIAR-OMITIDOS]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error al reenviar' },
      { status: 500 }
    );
  }
}
