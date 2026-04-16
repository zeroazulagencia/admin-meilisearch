/**
 * Módulo 9 - Ejecutar backup Meilisearch y subir a Dropbox
 * Escribe en modulos_backup_9_sync_log
 */
import { spawn } from 'child_process';
import { gzip as gzipCallback } from 'zlib';
import { promisify } from 'util';
import { query } from '@/utils/db';
import { getConfig } from './config';
import { getDropboxAccessToken } from './token';

const gzip = promisify(gzipCallback);

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

type CommandResult = { ok: boolean; stdout: string; stdoutBuffer: Buffer; stderr: string; error?: string };

function runCommand(command: string, args: string[], input?: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    let stderr = '';

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      resolve({ ok: false, stdout: stdoutBuffer.toString(), stdoutBuffer, stderr, error: err?.message || 'Error ejecutando comando' });
    });

    child.on('close', (code) => {
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const stdout = stdoutBuffer.toString();
      if (code === 0) {
        resolve({ ok: true, stdout, stdoutBuffer, stderr });
      } else {
        resolve({ ok: false, stdout, stdoutBuffer, stderr, error: stderr || `Comando fallo con codigo ${code}` });
      }
    });
  });
}

function buildSshArgs(host: string, user: string, port: string, remoteCommand: string, password: string): { cmd: string; args: string[] } {
  return {
    cmd: 'sshpass',
    args: [
      '-p',
      password,
      'ssh',
      '-T',
      '-p',
      port,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'LogLevel=ERROR',
      '-o',
      'PreferredAuthentications=password',
      '-o',
      'PubkeyAuthentication=no',
      `${user}@${host}`,
      remoteCommand,
    ],
  };
}

async function createRemoteDump(host: string, user: string, port: string, password: string, apiKey: string, baseUrl: string): Promise<{ ok: boolean; taskUid?: string; error?: string }> {
  const createCommand = `curl -s -X POST "${baseUrl}/dumps" -H "Authorization: Bearer ${apiKey}"`;
  const { cmd, args } = buildSshArgs(host, user, port, createCommand, password);
  const result = await runCommand(cmd, args);

  if (!result.ok) {
    return { ok: false, error: result.error || result.stderr || 'Error creando dump en Meilisearch' };
  }

  try {
    const parsed = JSON.parse(result.stdout || '{}');
    if (!parsed.taskUid) {
      const errDetail = parsed.message || parsed.error || result.stdout;
      return { ok: false, error: `Respuesta invalida de Meilisearch al crear dump: ${String(errDetail).slice(0, 500)}` };
    }
    return { ok: true, taskUid: String(parsed.taskUid) };
  } catch (e: any) {
    return { ok: false, error: e?.message || `No se pudo parsear respuesta de Meilisearch: ${result.stdout.slice(0, 500)}` };
  }
}

async function waitForDump(host: string, user: string, port: string, password: string, apiKey: string, baseUrl: string, taskUid: string): Promise<{ ok: boolean; dumpUid?: string; error?: string }> {
  const maxAttempts = 60;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const statusCommand = `curl -s -X GET "${baseUrl}/tasks/${taskUid}" -H "Authorization: Bearer ${apiKey}"`;
    const { cmd, args } = buildSshArgs(host, user, port, statusCommand, password);
    const result = await runCommand(cmd, args);
    if (!result.ok) {
      return { ok: false, error: result.error || result.stderr || 'Error consultando tarea de dump en Meilisearch' };
    }

    try {
      const parsed = JSON.parse(result.stdout || '{}');
      if (parsed.status === 'succeeded') {
        const dumpUid = parsed?.details?.dumpUid ? String(parsed.details.dumpUid) : '';
        if (!dumpUid) {
          return { ok: false, error: 'Tarea completada pero sin dumpUid' };
        }
        return { ok: true, dumpUid };
      }
      if (parsed.status === 'failed') {
        return { ok: false, error: parsed.error || 'Dump fallo en Meilisearch' };
      }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'No se pudo parsear estado de la tarea del dump' };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { ok: false, error: 'Timeout esperando la tarea de dump de Meilisearch' };
}

async function downloadRemoteDump(host: string, user: string, port: string, password: string, dumpUid: string): Promise<{ ok: boolean; buffer?: Buffer; error?: string }> {
  const remotePath = `/opt/meilisearch/dumps/${dumpUid}.dump`;
  const catCommand = `cat "${remotePath}"`;
  const { cmd, args } = buildSshArgs(host, user, port, catCommand, password);
  const result = await runCommand(cmd, args);

  if (!result.ok) {
    return { ok: false, error: result.error || result.stderr || 'Error descargando dump remoto' };
  }

  return { ok: true, buffer: result.stdoutBuffer };
}

async function removeRemoteDump(host: string, user: string, port: string, password: string, dumpUid: string): Promise<void> {
  const remotePath = `/opt/meilisearch/dumps/${dumpUid}.dump`;
  const rmCommand = `rm -f "${remotePath}"`;
  const { cmd, args } = buildSshArgs(host, user, port, rmCommand, password);
  await runCommand(cmd, args);
}

export async function runBackup(): Promise<{ logId: number; status: string; error?: string }> {
  const startedAt = new Date();
  const timestamp = `${startedAt.toISOString().slice(0, 10).replace(/-/g, '')}_${String(startedAt.getHours()).padStart(2, '0')}${String(startedAt.getMinutes()).padStart(2, '0')}${String(startedAt.getSeconds()).padStart(2, '0')}`;
  const fileName = `meilisearch_${timestamp}.dump.gz`;

  const [insertResult] = await query<{ insertId: number }>(
    `INSERT INTO modulos_backup_9_sync_log (started_at, status) VALUES (?, 'running')`,
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
      await query(`UPDATE modulos_backup_9_sync_log SET ${set.join(', ')} WHERE id = ?`, vals);
    }
  };

  try {
    const tokenResult = await getDropboxAccessToken();
    const folderPath = (await getConfig('dropbox_folder_path')) || '/Aplicaciones/Zero Azul WORKERS/MEILISEARCH';
    const dropboxPath = `${folderPath.replace(/\/$/, '')}/${fileName}`;

    const sshHost = await getConfig('ssh_host');
    const sshUser = await getConfig('ssh_user');
    const sshPassword = await getConfig('ssh_password');
    const sshPort = (await getConfig('ssh_port')) || '22';
    const meiliKey = await getConfig('meilisearch_api_key');

    if (!tokenResult.ok || !tokenResult.token) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        error_message: tokenResult.error || 'dropbox_access_token no configurado',
      });
      return { logId, status: 'error', error: tokenResult.error || 'dropbox_access_token no configurado' };
    }

    if (!sshHost || !sshUser || !sshPassword || !meiliKey) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        error_message: 'Credenciales SSH o API key de Meilisearch no configuradas',
      });
      return { logId, status: 'error', error: 'Credenciales SSH o API key de Meilisearch no configuradas' };
    }

    const token = tokenResult.token;

    const baseUrl = (await getConfig('meilisearch_url')) || 'http://localhost:7700';
    const createDump = await createRemoteDump(sshHost, sshUser, sshPort, sshPassword, meiliKey, baseUrl);
    if (!createDump.ok || !createDump.taskUid) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        error_message: createDump.error || 'Error creando dump remoto',
      });
      return { logId, status: 'error', error: createDump.error || 'Error creando dump remoto' };
    }

    const waitResult = await waitForDump(sshHost, sshUser, sshPort, sshPassword, meiliKey, baseUrl, createDump.taskUid);
    if (!waitResult.ok || !waitResult.dumpUid) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        error_message: waitResult.error || 'Error esperando dump remoto',
      });
      return { logId, status: 'error', error: waitResult.error || 'Error esperando dump remoto' };
    }

    const downloadResult = await downloadRemoteDump(sshHost, sshUser, sshPort, sshPassword, waitResult.dumpUid);
    if (!downloadResult.ok || !downloadResult.buffer) {
      await updateLog({
        finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'error',
        file_name: fileName,
        error_message: downloadResult.error || 'Error descargando dump remoto',
      });
      return { logId, status: 'error', error: downloadResult.error || 'Error descargando dump remoto' };
    }

    const gzBuffer = await gzip(downloadResult.buffer);
    const bytesSize = gzBuffer.length;

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
      body: new Uint8Array(gzBuffer),
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

    await removeRemoteDump(sshHost, sshUser, sshPort, sshPassword, waitResult.dumpUid);

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
