/**
 * WEBHOOK ANTIGUO - NO USAR
 * Usar en su lugar: /api/webhooks/facebook-leads-moduleid-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { createLeadLog, getConfig } from '@/utils/modulos/suvi-leads/module1-config';
import { processLeadFlow } from '@/utils/modulos/suvi-leads/module1-orchestrator';
import { processLeadFlow } from '@/utils/modulos/suvi-leads/orchestrator';

// GET - Verificación del webhook de Facebook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Token de verificación (debe coincidir con el configurado en Facebook)
  const VERIFY_TOKEN = 'suvi_webhook_verify_token_2024';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WEBHOOK] Verificación exitosa');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
}

// POST - Recepción de leads de Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK] Payload recibido:', JSON.stringify(body, null, 2));

    // Validar estructura del webhook de Facebook
    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const blockedFormIds = JSON.parse(await getConfig('blocked_form_ids') || '[]');

    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'leadgen') continue;

        const value = change.value;
        const formId = value.form_id;

        // Verificar si el formulario está bloqueado
        if (blockedFormIds.includes(formId)) {
          console.log(`[WEBHOOK] Formulario ${formId} bloqueado, ignorando lead`);
          continue;
        }

        // Crear registro inicial en la BD
        const leadId = await createLeadLog({
          leadgen_id: value.leadgen_id,
          page_id: value.page_id,
          form_id: value.form_id,
          facebook_raw_data: body,
        });

        console.log(`[WEBHOOK] Lead ${value.leadgen_id} registrado con ID ${leadId}`);

        // Procesar flujo completo en background (no bloquear respuesta)
        processLeadFlow(leadId, value.leadgen_id, formId).catch((e) => {
          console.error('[WEBHOOK] Error procesando lead:', e);
        });
      }
    }

    // Responder inmediatamente a Facebook
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (e: any) {
    console.error('[WEBHOOK] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
