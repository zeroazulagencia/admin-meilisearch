/**
 * Worker del modulo 31 (Sincronizador Repuestos Repuestera).
 * Uso: node_modules/.bin/tsx scripts/mod31-repuestera-worker.ts <runId>
 * Lo lanza utils/modulos/sincronizador-repuestos-repuestera-31/launcher.ts; no se ejecuta a mano.
 */
import fs from 'fs';
import path from 'path';

// El proceso hereda el entorno de Next; si se lanza suelto, carga .env (ENCRYPTION_KEY, MYSQL_*).
function cargarEnv() {
  const archivo = path.join(process.cwd(), '.env');
  if (!fs.existsSync(archivo)) return;
  for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  cargarEnv();
  const runId = Number(process.argv[2]);
  if (!Number.isInteger(runId) || runId <= 0) {
    console.error('[MOD31 WORKER] runId invalido');
    process.exit(1);
  }

  const { ejecutarCorrida } = await import('../utils/modulos/sincronizador-repuestos-repuestera-31/sync');
  const { actualizarRun } = await import('../utils/modulos/sincronizador-repuestos-repuestera-31/runs');
  const { getDbPool } = await import('../utils/db');

  process.on('SIGTERM', async () => {
    await actualizarRun(runId, { status: 'error', paso: 'Error', motivo_error: 'Proceso detenido (SIGTERM)', finished_at: new Date() as any }).catch(() => undefined);
    process.exit(1);
  });

  try {
    await ejecutarCorrida(runId);
  } catch (e) {
    console.error('[MOD31 WORKER] Error no controlado:', e instanceof Error ? e.message : e);
    await actualizarRun(runId, {
      status: 'error', paso: 'Error',
      motivo_error: e instanceof Error ? e.message : String(e), finished_at: new Date() as any,
    }).catch(() => undefined);
  } finally {
    await getDbPool().end().catch(() => undefined);
  }
}

main();
