/**
 * MÓDULO 6 - Webhook Ventas
 * Solo POST. Body JSON o form-urlencoded. Sin headers ni referer. Captura todo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createOpportunityRecord } from '@/utils/modulos/suvi-opportunity/module6-config';
import { processOpportunity } from '@/utils/modulos/suvi-opportunity/module6-orchestrator';
import { deriveFromPayload, getBodyPayload } from '@/utils/modulos/suvi-opportunity/module6-derive';

export async function POST(req: NextRequest) {
  try {
    const payload = await getBodyPayload(req);
    const captured = deriveFromPayload(payload);
    console.log('[WEBHOOK-VENTAS] recibido', captured.payload_raw);
    const recordId = await createOpportunityRecord({
      email: captured.email,
      nombre: captured.nombre,
      apellido: captured.apellido,
      telefono: captured.telefono,
      tipo: 'ventas',
      payload_raw: captured.payload_raw,
      pais: captured.pais,
      indicativo: captured.indicativo,
      ciudad: captured.ciudad,
      nombre_proyecto: captured.nombre_proyecto,
      form_variant: captured.form_variant,
    });
    processOpportunity(recordId).catch((e) => console.error('[WEBHOOK-VENTAS]', e));
    return NextResponse.json({ ok: true, id: recordId, tipo: 'ventas' }, { status: 200 });
  } catch (e: any) {
    console.error('[WEBHOOK-VENTAS]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
