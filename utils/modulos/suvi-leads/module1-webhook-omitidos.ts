/**
 * MÓDULO 1 - SUVI LEADS
 * Envía payload de leads omitidos al webhook de Google Sheet
 * Solo se ejecuta para leads con omitido_interno (Pauta interna o Formulario bloqueado)
 */

const WEBHOOK_OMITIDOS_URL = 'https://automation.zeroazul.com/webhook/f3e51e7f-5c02-41c3-999e-0c11f72c1e85';

export async function sendOmitidoToWebhook(
  leadId: number,
  enrichedData: Record<string, any>,
  metadata: {
    leadgen_id?: string;
    form_id?: string;
    campaign_name?: string;
    ad_name?: string;
    omitido_reason?: string;
  }
): Promise<boolean> {
  try {
    const payload = {
      lead_id: leadId,
      leadgen_id: metadata.leadgen_id,
      form_id: metadata.form_id,
      campaign_name: metadata.campaign_name,
      ad_name: metadata.ad_name,
      omitido_reason: metadata.omitido_reason,
      ai_enriched_data: enrichedData,
      sent_at: new Date().toISOString(),
    };

    const res = await fetch(WEBHOOK_OMITIDOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[WEBHOOK-OMITIDOS] Lead ${leadId} falló: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log(`[WEBHOOK-OMITIDOS] Lead ${leadId} enviado correctamente a Google Sheet`);
    return true;
  } catch (e: any) {
    console.error(`[WEBHOOK-OMITIDOS] Lead ${leadId} error:`, e?.message);
    return false;
  }
}
