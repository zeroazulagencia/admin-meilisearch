/**
 * Módulo 9 - Backup Meilisearch
 * GET: listar log de sincronizaciones
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const [rows] = await query<any>(
      `SELECT id, started_at, finished_at, status, file_name, dropbox_path, bytes_size, error_message, created_at
       FROM modulos_backup_9_sync_log
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    return NextResponse.json({ ok: true, data: rows || [] });
  } catch (e: any) {
    console.error('[MOD9-BACKUP]', e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
