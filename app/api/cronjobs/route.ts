import { NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { execSync } from 'child_process';

interface CronEntry {
  schedule: string;         // "0 0 * * *"
  module_id: number | null;
  module_title: string | null;
  folder_name: string | null;
  agent_id: number | null;
  agent_name: string | null;
  command: string;
  is_active: boolean;       // true = línea activa, false = comentada por toggle
}

// GET /api/cronjobs
export async function GET() {
  try {
    // 1) Leer crontab del usuario
    let rawCrontab = '';
    try {
      rawCrontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    } catch {
      rawCrontab = '';
    }

    // 2) Parsear cada línea
    const lines = rawCrontab.split('\n').filter(Boolean);
    const cronEntries: CronEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Detectar si la línea está comentada por nuestro marcador
      const isDeactivated = trimmed.startsWith('#HERMES-DEACTIVATED:');
      // Para parsear, sacamos el marcador si existe
      const cleanLine = isDeactivated
        ? trimmed.replace(/^#HERMES-DEACTIVATED:\s*/, '')
        : trimmed;

      // Solo nos interesan líneas que tengan custom-module
      if (!cleanLine.includes('custom-module')) continue;

      // Extraer module_id del patrón custom-module{ID}/
      const moduleMatch = cleanLine.match(/custom-module(\d+)\//);
      const moduleId = moduleMatch ? parseInt(moduleMatch[1], 10) : null;

      // Extraer schedule (primeros 5 tokens separados por espacio que sean cron-compatibles)
      const cronPattern = /^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+/;
      const scheduleMatch = cleanLine.match(cronPattern);
      const schedule = scheduleMatch ? scheduleMatch[1] : '?';

      const entry: CronEntry = {
        schedule,
        module_id: moduleId,
        module_title: null,
        folder_name: null,
        agent_id: null,
        agent_name: null,
        command: cleanLine.trim(),
        is_active: !isDeactivated,
      };

      cronEntries.push(entry);
    }

    // 3) Si hay entradas con module_id, consultar datos del módulo + agente
    if (cronEntries.length > 0) {
      const seen = new Set<number>();
      const moduleIds: number[] = [];
      for (const e of cronEntries) {
        if (e.module_id !== null && !seen.has(e.module_id)) {
          seen.add(e.module_id);
          moduleIds.push(e.module_id);
        }
      }

      if (moduleIds.length > 0) {
        const placeholders = moduleIds.map(() => '?').join(',');
        const [rows] = await query<any>(
          `SELECT m.id, m.title, m.folder_name, m.agent_id, m.is_active, a.name as agent_name
           FROM modules m
           LEFT JOIN agents a ON m.agent_id = a.id
           WHERE m.id IN (${placeholders})`,
          moduleIds
        );

        const moduleMap: Record<number, any> = {};
        for (const row of rows || []) {
          moduleMap[row.id] = row;
        }

        for (const entry of cronEntries) {
          if (entry.module_id !== null && moduleMap[entry.module_id]) {
            const mod = moduleMap[entry.module_id];
            entry.module_title = mod.title;
            entry.folder_name = mod.folder_name;
            entry.agent_id = mod.agent_id;
            entry.agent_name = mod.agent_name;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      cronjobs: cronEntries,
    });
  } catch (error: any) {
    console.error('[API CRONJOBS] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al leer cronjobs' },
      { status: 500 }
    );
  }
}