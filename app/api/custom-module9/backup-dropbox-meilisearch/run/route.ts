/**
 * Módulo 9 - Ejecutar backup ahora (cron medianoche)
 * POST: ?cron_secret=XXX o ?token=XXX
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/backup-dropbox-meilisearch/config';
import { runBackup } from '@/utils/modulos/backup-dropbox-meilisearch/run-backup';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    // Verificar que el módulo 9 esté activo antes de ejecutar
    const [rows] = await query<any>('SELECT is_active FROM modules WHERE id = 9');
    const isActive = rows?.[0]?.is_active === 1;
    if (!isActive) {
      console.log('[MOD9-BACKUP-RUN] Módulo 9 inactivo — ejecución omitida');
      return NextResponse.json({ ok: false, error: 'Módulo desactivado' }, { status: 403 });
    }
    const secret = req.nextUrl.searchParams.get('cron_secret') || req.nextUrl.searchParams.get('token');
    const stored = await getConfig('cron_secret');
    if (stored && secret !== stored) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const result = await runBackup();
    if (result.status === 'error') {
      return NextResponse.json({ ok: false, logId: result.logId, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, logId: result.logId });
  } catch (e: any) {
    console.error('[MOD9-BACKUP-RUN]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
