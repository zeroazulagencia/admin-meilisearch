import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_FILE = path.join(process.cwd(), '.hermes', 'sync-jobs', 'autolarte-sync.json');

function getStatus(): Record<string, any> | null {
  try {
    if (!fs.existsSync(STATUS_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const status = getStatus();
    if (!status) {
      return NextResponse.json({ ok: false, error: 'No hay sincronizacion activa' }, { status: 404 });
    }

    if (status.status !== 'running' && status.status !== 'spawning') {
      return NextResponse.json({ ok: false, error: 'La sincronizacion ya finalizo o fue cancelada', currentStatus: status.status }, { status: 400 });
    }

    // Try to kill the process
    const pid = status.pid;
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch (killErr: any) {
        if (killErr.code === 'ESRCH') {
          // Process already dead
        } else {
          console.error('[CANCEL] Error killing process:', killErr.message);
        }
      }
    }

    // Update status to cancelled
    const cancelled = {
      ...status,
      status: 'cancelled',
      step: 'cancelled',
      stepLabel: 'Cancelado por el usuario',
      error: null,
      finishedAt: new Date().toISOString(),
      elapsedSec: ((Date.now() - new Date(status.startedAt || Date.now()).getTime()) / 1000).toFixed(1),
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(cancelled, null, 2));

    // Also try to kill any remaining tsx process by name (backup)
    try {
      const { execSync } = require('child_process');
      execSync(`pkill -f "sync-autolarte-worker.ts" 2>/dev/null || true`);
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, message: 'Sincronizacion cancelada' });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Error al cancelar',
    }, { status: 500 });
  }
}