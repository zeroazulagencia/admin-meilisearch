import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_FILE = path.join(process.cwd(), '.hermes', 'sync-jobs', 'autolarte-sync.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      return NextResponse.json({
        running: false,
        status: null,
      });
    }

    const raw = fs.readFileSync(STATUS_FILE, 'utf-8');
    const data = JSON.parse(raw);

    // If pid is set but status is running, check if process is alive
    if (data.status === 'running' && data.pid) {
      try {
        // On Linux, sending signal 0 checks if process exists
        process.kill(data.pid, 0);
      } catch {
        // Process died without updating status file
        data.status = 'error';
        data.step = 'error';
        data.stepLabel = 'El worker termino inesperadamente';
        data.error = 'Process not found';
        data.finishedAt = new Date().toISOString();
        fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
      }
    }

    // Clean up old finished jobs (keep for 5 minutes for frontend to poll)
    if (data.status !== 'running' && data.finishedAt) {
      const age = Date.now() - new Date(data.finishedAt).getTime();
      if (age > 5 * 60 * 1000) {
        // Return data but don't clean up yet (leave for /cleanup or next start)
      }
    }

    return NextResponse.json({
      running: data.status === 'running' || data.status === 'spawning',
      status: data.status,
      step: data.step,
      stepLabel: data.stepLabel,
      processed: data.processed || 0,
      total: data.total || 0,
      errors: data.errors || 0,
      okCount: data.okCount || 0,
      errCount: data.errCount || 0,
      elapsedSec: data.elapsedSec || null,
      startedAt: data.startedAt || null,
      finishedAt: data.finishedAt || null,
      error: data.error || null,
      testResults: data.testResults || null,
      results: (data.results || []).slice(-100), // last 100 for detail view
    });
  } catch (err: any) {
    return NextResponse.json({
      running: false,
      status: 'error',
      error: err?.message || 'Error al leer estado',
    });
  }
}