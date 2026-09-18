import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MODULE_ID = 29;

// POST - recibe un payload (cualquier JSON) y responde "ok recibido"
export async function POST(req: NextRequest) {
  try {
    const [rows] = await query<any>(`SELECT is_active FROM modules WHERE id = ${MODULE_ID}`);
    if (rows?.[0]?.is_active !== 1) {
      return NextResponse.json({ ok: false, error: 'Módulo desactivado' }, { status: 403 });
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // payload vacío o no-JSON: se acepta igual
      body = null;
    }

    console.log('[API MOD29 SARA V2] [recibir] payload recibido:', JSON.stringify(body)?.slice(0, 500));

    return NextResponse.json({ ok: true, message: 'ok recibido' });
  } catch (error: any) {
    console.error('[API MOD29 SARA V2] [recibir] Error:', error?.message || error);
    return NextResponse.json(
      { ok: false, error: 'Error procesando el payload: ' + (error?.message || 'Error desconocido') },
      { status: 500 }
    );
  }
}
