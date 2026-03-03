/**
 * Módulo 7 - Ejecutar backup de BD y subir a Dropbox
 * Escribe en modulos_backup_7_sync_log
 */
import { spawn } from 'child_process';
import { readFile, unlink, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { query } from '@/utils/db';
import { getConfig } from './config';

const TMP_DIR = path.join(process.cwd(), 'tmp');

export interface SyncLogRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  file_name: string | null;
  dropbox_path: string | null;
  bytes_size: number | null;
  error_message: string | null;
}

export async function runBackup(): Promise<{ logId: number; status: string; error?: string }> {
  const startedAt = new Date();
  const fileName = `admin_dworkers_${startedAt.toISOString().slice(0, 10).replace(/-/g, '')}_${String(startedAt.getHours()).padStart(2, '0')}${String(startedAt.getMinutes()).padStart(2, '0')}${String(startedAt.getSeconds()).padStart(2, '0')}.sql`;
  const filePath = path.join(TMP_DIR, fileName);

  const [insertResult] = await query<{ insertId: number }>(
    `INSERT INTO modulos_backup_7_sync_log (started_at, status) VALUES (?, 'running')`,
    [startedAt.toISOString().slice(0, 19).replace('T', ' ')]
  );
  const logId = (insertResult as any)?.insertId ?? 0;

  const updateLog = async (updates: Partial<SyncLogRow>) => {
    const set: string[] = [];
    const vals: any[] = [];
    if (updates.finished_at != null) { set.push('finished_at = ?'); vals.push(updates.finished_at); }
    if (updates.status != null) { set.push('status = ?'); vals.push(updates.status); }
    if (updates.file_name != null) { set.push('file_name = ?'); vals.push(updates.file_name); }
    if (updates.dropbox_path != null) { set.push('dropbox_path = ?'); vals.push(updates.dropbox_path); }
    if (updates.bytes_size != null) { set.push('bytes_size = ?'); vals.push(updates.bytes_size); }
    if (updates.error_message != null) { set.push('error_message = ?'); vals.push(updates.error_message); }
    if (set.length) {
      vals.push(logId);
      await query(`UPDATE modulos_backup_7_sync_log SET ${set.join(', ')} WHERE id = ?`, vals);
    }
  };

  try {
    await mkdir(TMP_DIR, { recursive: true });
    const host = process.env.MYSQL_HOST || 'localhost';
    const user = process.env.MYSQL_USER || 'root';
    const pass = process.env.MYSQL_PASSWORD || '';
    const db = process.env.MYSQL_DATABASE || 'admin_dworkers';
    const passArg = pass ? `-p${pass}` : undefined;
    const dumpArgs = [
      `-h${host}`,
      `-u${user}`,
      passArg,
      db,
    ].filter(Boolean) as string[];

    await new Promise<void>((resolve, reject) => {
      const outStream = createWriteStream(filePath, { flags: 'w' });
      const child = spawn('mysqldump', dumpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';

      child.stdout.pipe(outStream);
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `mysqldump falló con código ${code}`));
        }
      });
      outStream.on('error', (err) => reject(err));
    });

    const buf = await readFile(filePath);
    const bytesSize = buf.length;
    await unlink(filePath).catch(() => {});

    const token = await getConfig('dropbox_access_token');
    const folderPath = (await getConfig('dropbox_folder_path')) || '/Aplicaciones/Zero Azul WORKERS';
    const dropboxPath = `${folderPath.replace(/\/$/, '')}/${fileName}`;

    if (!token) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        bytes_size: bytesSize,
        error_message: 'dropbox_access_token no configurado',
      });
      return { logId, status: 'error', error: 'dropbox_access_token no configurado' };
    }

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'add',
          autorename: true,
        }),
      },
      body: buf,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        bytes_size: bytesSize,
        dropbox_path: dropboxPath,
        error_message: `Dropbox: ${uploadRes.status} ${errText.slice(0, 500)}`,
      });
      return { logId, status: 'error', error: errText };
    }

    await updateLog({
      finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'ok',
      file_name: fileName,
      dropbox_path: dropboxPath,
      bytes_size: bytesSize,
    });
    return { logId, status: 'ok' };
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    await updateLog({
      finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'error',
      file_name: fileName,
      error_message: errMsg.slice(0, 1000),
    });
    return { logId, status: 'error', error: errMsg };
  }
}
