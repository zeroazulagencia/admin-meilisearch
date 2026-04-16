import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getStats } from '@/utils/modulos/biury-pagos/module8-config';
import { hydrateLogRow } from '@/utils/modulos/biury-pagos/module8-display';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const logsRaw = await getLogs(limit, offset, { search, status });
    const logs = logsRaw.map((log) => hydrateLogRow(log));
    const stats = await getStats();

    return NextResponse.json({
      ok: true,
      data: logs,
      stats,
    });
  } catch (error: any) {
    console.error('[Biury-Logs] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
