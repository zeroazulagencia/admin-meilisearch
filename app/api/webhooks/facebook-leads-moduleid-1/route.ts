/**
 * MÓDULO 1 - SUVI LEADS
 * Webhook de Facebook para recepción de leads
 * URL: https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1
 */
import { NextRequest, NextResponse } from 'next/server';
import { createLeadLog, getConfig } from '@/utils/modulos/suvi-leads/module1-config';
import { processLeadComplete } from '@/utils/modulos/suvi-leads/module1-orchestrator';

// GET - Verificación del webhook de Facebook
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = 'suvi_webhook_verify_token_2024';

    console.log('[WEBHOOK SUVI] Verificación GET');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WEBHOOK SUVI] ✅ Verificación exitosa');
      return new Response(challenge, { status: 200 });
    }

    console.log('[WEBHOOK SUVI] ❌ Verificación fallida');
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
  } catch (error: any) {
    console.error('[WEBHOOK SUVI] Error en GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Recepción de leads de Facebook
export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK SUVI] POST recibido');
    
    // Leer el body sin importar content-type
    const contentType = request.headers.get('content-type') || '';
    console.log('[WEBHOOK SUVI] Content-Type:', contentType);
    
    const text = await request.text();
    console.log('[WEBHOOK SUVI] Body raw:', text);
    
    if (!text || text.trim() === '') {
      console.log('[WEBHOOK SUVI] ❌ Body vacío');
      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    let body: any;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('[WEBHOOK SUVI] ❌ Error parseando JSON:', parseError);
      console.log('[WEBHOOK SUVI] Body que falló:', text);
      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    console.log('[WEBHOOK SUVI] ✅ Payload parseado:', JSON.stringify(body, null, 2));

    // Normalizar estructura - aceptar tanto {entry: [...]} como [...]
    let entries: any[];
    
    if (Array.isArray(body)) {
      // Si es array directo: [{id, time, changes}]
      entries = body;
      console.log('[WEBHOOK SUVI] Formato: array directo');
    } else if (body.entry && Array.isArray(body.entry)) {
      // Si es objeto con entry: {entry: [{id, time, changes}]}
      entries = body.entry;
      console.log('[WEBHOOK SUVI] Formato: objeto con entry');
    } else {
      console.log('[WEBHOOK SUVI] ❌ Estructura inválida - ni array ni objeto con entry');
      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    const blockedFormIds = JSON.parse(await getConfig('blocked_form_ids') || '[]');

    for (const entry of entries) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'leadgen') continue;

        const value = change.value;
        const formId = value.form_id;

        if (blockedFormIds.includes(formId)) {
          console.log(`[WEBHOOK SUVI] Formulario ${formId} bloqueado`);
          continue;
        }

        try {
          const leadId = await createLeadLog({
            leadgen_id: value.leadgen_id,
            page_id: value.page_id,
            form_id: value.form_id,
            facebook_raw_data: body,
          });

          console.log(`[WEBHOOK SUVI] ✅ Lead ${value.leadgen_id} → ID ${leadId}`);

          // Procesamiento automático: META → IA → Salesforce
          // Se ejecuta de forma asíncrona después de responder 200 OK
          processLeadComplete(leadId, value.leadgen_id, formId).catch((e) => {
            console.error(`[WEBHOOK SUVI] ❌ Error procesando lead ${leadId}:`, e);
          });
        } catch (dbError: any) {
          console.error('[WEBHOOK SUVI] Error BD:', dbError);
        }
      }
    }

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (e: any) {
    console.error('[WEBHOOK SUVI] Error:', e);
    // Siempre 200 para evitar reintentos de Facebook
    return NextResponse.json({ status: 'error', message: e.message }, { status: 200 });
  }
}
