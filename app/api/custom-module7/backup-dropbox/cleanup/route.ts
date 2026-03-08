/**
 * Módulo 7 - Limpiar historial y backups en Dropbox
 * POST: ?cron_secret=XXX o ?token=XXX
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/backup-dropbox/config';
import { listDropboxBackupPaths, deleteDropboxPaths, validateDropboxToken } from '@/utils/modulos/backup-dropbox/dropbox';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('cron_secret') || req.nextUrl.searchParams.get('token');
    const stored = await getConfig('cron_secret');
    if (!stored || !secret || secret !== stored) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }

    const deleteLogsResult = await query('DELETE FROM modulos_backup_7_sync_log');
    const deletedLogs = (deleteLogsResult as any)?.affectedRows ?? 0;

    const token = await getConfig('dropbox_access_token');
    const folderPath = (await getConfig('dropbox_folder_path')) || '/Aplicaciones/Zero Azul WORKERS';

    if (!token) {
      return NextResponse.json({ ok: true, deletedLogs, deletedDropbox: 0, dropboxError: 'dropbox_access_token no configurado' });
    }

    const tokenCheck = await validateDropboxToken(token);
    if (!tokenCheck.ok) {
      return NextResponse.json({ ok: true, deletedLogs, deletedDropbox: 0, dropboxError: tokenCheck.error || 'dropbox_access_token invalido' });
    }

    const listResult = await listDropboxBackupPaths(token, folderPath);
    if (!listResult.ok) {
      return NextResponse.json({ ok: true, deletedLogs, deletedDropbox: 0, dropboxError: listResult.error || 'Error al listar backups en Dropbox' });
    }

    const deleteResult = await deleteDropboxPaths(token, listResult.paths);
    if (!deleteResult.ok) {
      return NextResponse.json({ ok: true, deletedLogs, deletedDropbox: deleteResult.deleted, dropboxError: deleteResult.error || 'Error al eliminar backups en Dropbox' });
    }

    return NextResponse.json({ ok: true, deletedLogs, deletedDropbox: deleteResult.deleted });
  } catch (e: any) {
    console.error('[MOD7-BACKUP-CLEANUP]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
