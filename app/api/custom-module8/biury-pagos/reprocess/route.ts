import { NextRequest, NextResponse } from 'next/server';
import { getErrorLogs, getErrorLogsBySku, getLogById, getLogsByPaymentIds, getErrorLogsSince, getSuccessLogByPaymentId, updateLogById } from '@/utils/modulos/biury-pagos/module8-config';
import { processTreliWebhook } from '@/utils/modulos/biury-pagos/module8-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(200, Number(body.limit) || 50));
    const sku = typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim() : null;
    const logId = Number(body.id) || null;
    const paymentIdsRaw = body.payment_ids ?? body.paymentIds ?? null;
    const year = Number(body.year) || null;
    const paymentIds = Array.isArray(paymentIdsRaw)
      ? paymentIdsRaw.map((id: any) => String(id).trim()).filter(Boolean)
      : typeof paymentIdsRaw === 'string'
        ? paymentIdsRaw.split(/[\n,]+/).map((id: string) => id.trim()).filter(Boolean)
        : [];

    const cappedPaymentIds = paymentIds.slice(0, 200);

    const logs = logId
      ? [await getLogById(logId)].filter(Boolean)
      : cappedPaymentIds.length
        ? await getLogsByPaymentIds(cappedPaymentIds)
        : year
          ? await getErrorLogsSince(`${year}-01-01`, limit)
        : sku
          ? await getErrorLogsBySku(sku, limit)
          : await getErrorLogs(limit);
    let processed = 0;
    let success = 0;
    let failed = 0;

    const results: Array<{ payment_id: string; status: string; message?: string }> = [];
    const logMap = new Map<string, any>();
    if (cappedPaymentIds.length) {
      for (const log of logs) {
        if (log?.payment_id && !logMap.has(log.payment_id)) {
          logMap.set(log.payment_id, log);
        }
      }
    }

    const iterableLogs = cappedPaymentIds.length
      ? cappedPaymentIds.map((id) => logMap.get(id) || { payment_id: id, payload_raw: null, __notFound: true })
      : logs;

    const batchDelayMs = 20000;
    for (let i = 0; i < iterableLogs.length; i += 1) {
      const log = iterableLogs[i];
      processed += 1;
      try {
        if (log.__notFound) {
          failed += 1;
          results.push({ payment_id: log.payment_id, status: 'not_found', message: 'No existe en logs' });
          continue;
        }
        if (log.payment_id) {
          const successLog = await getSuccessLogByPaymentId(String(log.payment_id));
          if (successLog) {
            if (log.id && log.id !== successLog.id) {
              await updateLogById(log.id, {
                customer_document: successLog.customer_document || log.customer_document || 'unknown',
                product_name: successLog.product_name || log.product_name || 'unknown',
                gateway: successLog.gateway || log.gateway || 'unknown',
                total: Number(successLog.total ?? log.total ?? 0),
                payload_raw: log.payload_raw || successLog.payload_raw || null,
                siigo_response: successLog.siigo_response || null,
                status: 'success',
              });
            }
            results.push({ payment_id: log.payment_id, status: 'already_processed', message: 'Ya existe un éxito para este payment_id' });
            continue;
          }
        }
        const payload = log.payload_raw ? JSON.parse(log.payload_raw) : null;
        if (!payload) {
          failed += 1;
          results.push({ payment_id: log.payment_id || 'unknown', status: 'error', message: 'Sin payload' });
          continue;
        }
        const result = await processTreliWebhook({ content: payload, logId: log.id || null });
        if (result.status === 'success') {
          success += 1;
          results.push({ payment_id: log.payment_id || 'unknown', status: 'success' });
        } else {
          failed += 1;
          results.push({ payment_id: log.payment_id || 'unknown', status: result.status, message: result.error });
        }
      } catch (error) {
        failed += 1;
        results.push({ payment_id: log.payment_id || 'unknown', status: 'error', message: 'Error al reprocesar' });
      }

      if (i < iterableLogs.length - 1) {
        await sleep(batchDelayMs);
      }
    }

    return NextResponse.json({
      ok: true,
      id: logId,
      sku,
      year,
      payment_ids: cappedPaymentIds.length ? cappedPaymentIds : null,
      processed,
      success,
      failed,
      results: results.length ? results : null,
    });
  } catch (error: any) {
    console.error('[Biury-Reprocess] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
