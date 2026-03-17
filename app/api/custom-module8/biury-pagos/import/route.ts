import { NextRequest, NextResponse } from 'next/server';
import { upsertLogByPaymentId } from '@/utils/modulos/biury-pagos/module8-config';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

async function importLines(lines: string[]) {
  let processed = 0;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const results: Array<{ payment_id: string; status: string; message?: string }> = [];

  for (const line of lines) {
    processed += 1;
    let payload: any = null;
    try {
      payload = JSON.parse(line);
    } catch {
      skipped += 1;
      results.push({ payment_id: 'unknown', status: 'invalid_json', message: 'Linea JSON inválida' });
      continue;
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    const match = items.find((item: any) => item?.name === 'TRUE BIURY - BiuryBox Trimestre');
    if (!match) {
      skipped += 1;
      results.push({ payment_id: String(payload?.payment_id || 'unknown'), status: 'skipped', message: 'No es BiuryBox Trimestre' });
      continue;
    }

    const paymentId = String(payload?.payment_id || 'unknown');
    const customerDocument = payload?.billing?.document || 'unknown';
    const total = Number(payload?.totals?.total || match?.total || 0);
    const gateway = payload?.payment_gateway_name || payload?.payment_gateway || 'unknown';

    const action = await upsertLogByPaymentId({
      payment_id: paymentId,
      customer_document: customerDocument,
      product_name: match?.name || 'unknown',
      gateway,
      total,
      payload_raw: line,
      status: 'filtered',
    });

    if (action === 'updated') {
      updated += 1;
      results.push({ payment_id: paymentId, status: 'updated' });
    } else {
      imported += 1;
      results.push({ payment_id: paymentId, status: 'created' });
    }
  }

  return { processed, imported, updated, skipped, results };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const lines = Array.isArray(body?.lines)
        ? body.lines.map((line: any) => String(line)).filter((line: string) => line.trim().length > 0)
        : [];

      if (!lines.length) {
        return NextResponse.json({ ok: false, error: 'No hay lineas para importar' }, { status: 400 });
      }

      const result = await importLines(lines);
      return NextResponse.json({ ok: true, ...result });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Archivo requerido' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      return NextResponse.json({ ok: false, error: 'Solo se permite .txt' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: 'Archivo supera 100 MB' }, { status: 400 });
    }

    const content = await file.text();
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

    const result = await importLines(lines);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Biury-Import] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
