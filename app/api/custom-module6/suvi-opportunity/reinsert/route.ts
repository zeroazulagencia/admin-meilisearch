import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { deriveFromPayload } from '@/utils/modulos/suvi-opportunity/module6-derive';
import { createOpportunityRecord } from '@/utils/modulos/suvi-opportunity/module6-config';
import { processOpportunity } from '@/utils/modulos/suvi-opportunity/module6-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = parseInt(body.id ?? body.recordId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });
    }

    const [rows] = await query<any>(
      'SELECT tipo, payload_raw FROM modulos_suvi_6_opportunities WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Registro no encontrado' }, { status: 404 });
    }

    let payload: any = rows[0].payload_raw;
    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Payload vacío' }, { status: 422 });
    }
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        console.error('[MOD6-REINSERT] Error parseando payload', err);
        return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 422 });
      }
    }
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 422 });
    }

    const captured = deriveFromPayload(payload);
    const tipo: 'ventas' | 'credito' = rows[0].tipo === 'credito' ? 'credito' : 'ventas';

    const recordId = await createOpportunityRecord({
      email: captured.email,
      nombre: captured.nombre,
      apellido: captured.apellido,
      telefono: captured.telefono,
      tipo,
      payload_raw: captured.payload_raw,
      pais: captured.pais,
      indicativo: captured.indicativo,
      ciudad: captured.ciudad,
      nombre_proyecto: captured.nombre_proyecto,
      form_variant: captured.form_variant,
    });

    processOpportunity(recordId).catch((error) => console.error('[MOD6-REINSERT]', error));

    return NextResponse.json({ ok: true, id: recordId });
  } catch (error: any) {
    console.error('[MOD6-REINSERT]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
