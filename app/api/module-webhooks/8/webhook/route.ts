import { NextRequest, NextResponse } from 'next/server';
import { processTreliWebhook } from '@/utils/modulos/biury-pagos/module8-orchestrator';

export async function POST(request: NextRequest) {
  try {
    let body: any = null;

    try {
      body = await request.json();
    } catch {
      const textBody = await request.text();
      if (textBody) {
        try {
          body = JSON.parse(textBody);
        } catch {
          const params = new URLSearchParams(textBody);
          const obj: Record<string, string> = {};
          params.forEach((value, key) => {
            obj[key] = value;
          });
          body = obj;
        }
      }
    }

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Payload inválido: vacío' },
        { status: 400 }
      );
    }

    const content = body.data ?? body.content ?? body;
    const result = await processTreliWebhook({ content });

    if (result.status === 'filtered') {
      return NextResponse.json({
        ok: true,
        filtered: true,
        message: 'Producto no procesado',
      });
    }

    return NextResponse.json({
      ok: true,
      logId: result.logId,
      status: result.status,
      error: result.error,
    });
  } catch (error: any) {
    console.error('[Biury-Webhook] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
