import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { getConfig } from '@/utils/modulos/auditoria-agentes-25/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TABLE = 'modulos_auditoria_agentes_25_audits';

function mask(v: any): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}

function toDateTime(iso: unknown): string | null {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return null;
  // Formato 'YYYY-MM-DD HH:MM:SS' para MySQL
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function POST(request: NextRequest) {
  try {
    // ---- Autenticación por API key ----
    const apiKey = await getConfig('api_key');
    const provided =
      request.headers.get('x-api-key') ||
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')!.slice(7)
        : null);

    if (apiKey && provided !== apiKey) {
      return NextResponse.json({ ok: false, error: 'API key inválida' }, { status: 401 });
    }
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Módulo no configura API key. Difínele un api_key en Configuración.' },
        { status: 503 }
      );
    }

    // ---- Leer body ----
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Body JSON inválido' }, { status: 400 });
    }

    const agente_id = body?.agente_id;
    const periodo = body?.audit_period;
    if (!agente_id || !periodo?.start || !periodo?.end) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos requeridos: agente_id y audit_period.start/end' },
        { status: 400 }
      );
    }

    const auditStart = toDateTime(periodo.start);
    const auditEnd = toDateTime(periodo.end);
    if (!auditStart || !auditEnd) {
      return NextResponse.json({ ok: false, error: 'audit_period.start/end inválidos' }, { status: 400 });
    }

    // ---- Upsert: agente_id + período auditado ----
    const summary = body.summary ?? null;
    const examples = body.examples ?? null;

    await query(
      `INSERT INTO ${TABLE}
        (agente_id, cliente_id_workers, cliente_empresa, agent_display_name, plataforma,
         audit_start, audit_end, summary, examples, local_send_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         agente_id = VALUES(agente_id),
         audit_start = VALUES(audit_start),
         audit_end = VALUES(audit_end),
         summary = VALUES(summary),
         examples = VALUES(examples)`,
      [
        String(agente_id),
        body.cliente_id_workers ? String(body.cliente_id_workers) : null,
        body.cliente_empresa ? String(body.cliente_empresa) : null,
        body.agent_display_name ? String(body.agent_display_name) : null,
        body.plataforma ? String(body.plataforma) : null,
        auditStart,
        auditEnd,
        summary ? JSON.stringify(summary) : null,
        examples ? JSON.stringify(examples) : null,
        new Date(),
      ]
    );

    return NextResponse.json({ ok: true, agente_id: String(agente_id), guardado: 'registro_auditoria' });
  } catch (error: any) {
    console.error('[AUDIT-RESPONSES][POST] Error:', error?.message || error);
    return NextResponse.json(
      { ok: false, error: 'Error al guardar auditoría: ' + (error?.message || 'desconocido') },
      { status: 500 }
    );
  }
}