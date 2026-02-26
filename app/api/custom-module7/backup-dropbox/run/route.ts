/**
 * Módulo 7 - Ejecutar backup ahora (cron medianoche)
 * POST: ?cron_secret=XXX o ?token=XXX
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/backup-dropbox/config';
import { runBackup } from '@/utils/modulos/backup-dropbox/run-backup';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('cron_secret') || req.nextUrl.searchParams.get('token');
    const stored = await getConfig('cron_secret');
    if (stored && (!secret || secret !== stored)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const result = await runBackup();
    if (result.status === 'error') {
      return NextResponse.json({ ok: false, logId: result.logId, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, logId: result.logId });
  } catch (e: any) {
    console.error('[MOD7-BACKUP-RUN]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
