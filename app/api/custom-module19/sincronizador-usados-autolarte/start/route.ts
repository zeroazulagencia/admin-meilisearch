import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_DIR = path.join(process.cwd(), '.hermes', 'sync-jobs');
const STATUS_FILE = path.join(STATUS_DIR, 'autolarte-sync.json');

function getStatus(): Record<string, any> | null {
  try {
    if (!fs.existsSync(STATUS_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function ensureDir() {
  if (!fs.existsSync(STATUS_DIR)) {
    fs.mkdirSync(STATUS_DIR, { recursive: true });
  }
}

export async function POST() {
  try {
    const current = getStatus();

    // If a job is already running, reject
    if (current && current.status === 'running') {
      return NextResponse.json({
        ok: false,
        error: 'Ya hay una sincronizacion en ejecucion',
        jobId: current.pid ? `job-${current.pid}` : null,
      }, { status: 409 });
    }

    ensureDir();

    // Write initial status
    const initStatus = {
      status: 'spawning',
      step: 'init',
      stepLabel: 'Iniciando worker...',
      processed: 0,
      total: 0,
      errors: 0,
      okCount: 0,
      errCount: 0,
      results: [],
      testResults: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      elapsedSec: null,
      error: null,
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(initStatus, null, 2));

    // Spawn the worker
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-autolarte-worker.ts');
    const child = spawn('npx', ['tsx', scriptPath, STATUS_FILE], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    child.stdout.on('data', (data: Buffer) => {
      console.log(`[WORKER:OUT] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data: Buffer) => {
      console.error(`[WORKER:ERR] ${data.toString().trim()}`);
    });

    child.on('error', (err: Error) => {
      console.error('[WORKER:SPAWN_ERROR]', err.message);
      const failed = {
        ...getStatus(),
        status: 'error',
        step: 'error',
        stepLabel: `Error al iniciar worker: ${err.message}`,
        error: err.message,
        finishedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STATUS_FILE, JSON.stringify(failed, null, 2));
    });

    child.on('exit', (code: number | null, signal: string | null) => {
      console.log(`[WORKER:EXIT] code=${code} signal=${signal}`);
      // Worker itself already writes final status on exit
    });

    // Update status with PID
    const started = {
      ...getStatus(),
      status: 'running',
      pid: child.pid,
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(started, null, 2));

    return NextResponse.json({
      ok: true,
      jobId: `job-${child.pid}`,
      pid: child.pid,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Error al iniciar sincronizacion',
    }, { status: 500 });
  }
}