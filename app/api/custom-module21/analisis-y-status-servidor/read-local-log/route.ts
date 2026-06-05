import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface LocalLogInfo {
  path: string;
  label: string;
  desc: string;
}

const LOCAL_LOG_MAP: Record<string, LocalLogInfo> = {
  'hermes_agent': { path: '/root/.hermes/logs/agent.log', label: 'agent.log', desc: 'Log de Hermes Agent' },
  'hermes_errors': { path: '/root/.hermes/logs/errors.log', label: 'errors.log', desc: 'Errores de Hermes' },
  'hermes_gateway': { path: '/root/.hermes/logs/gateway.log', label: 'gateway.log', desc: 'Gateway de Hermes' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const logKey = body.logKey as string;
    const logInfo = LOCAL_LOG_MAP[logKey];
    if (!logInfo) {
      return NextResponse.json({ ok: false, error: 'Log key no valida' }, { status: 400 });
    }
    const lines = Math.min(Math.max(body.lines || 100, 10), 500);

    const content = await fs.readFile(logInfo.path, 'utf-8');
    const allLines = content.split('\n');
    const totalLines = allLines.length;
    const tailLines = allLines.slice(-lines);
    const tailContent = tailLines.join('\n');

    return NextResponse.json({
      ok: true,
      output: tailContent,
      logInfo,
      totalLines,
      linesRead: Math.min(lines, totalLines),
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Error al leer archivo local',
    }, { status: 500 });
  }
}