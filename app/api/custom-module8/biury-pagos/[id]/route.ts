import { NextRequest, NextResponse } from 'next/server';
import { getLogById } from '@/utils/modulos/biury-pagos/module8-config';
import { hydrateLogRow } from '@/utils/modulos/biury-pagos/module8-display';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const logRaw = await getLogById(logId);
    const log = logRaw ? hydrateLogRow(logRaw) : null;

    if (!log) {
      return NextResponse.json(
        { ok: false, error: 'Log no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: log,
    });
  } catch (error: any) {
    console.error('[Biury-Detail] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
