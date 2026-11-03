import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getRuntimeConfig } from './config';
import { cerrarHuerfanas, crearRun, lockOcupado, type Origen } from './runs';

export interface LanzarOpciones {
  origen: Origen;
  /** Si no se indica, se usa modo_simulacion de la configuracion. */
  simulacion?: boolean;
  /** Aprobacion manual para seguir aunque el ERP haya caido mas del minimo. */
  forzado?: boolean;
}

export type LanzarResultado =
  | { ok: true; runId: number; simulacion: boolean }
  | { ok: false; ocupado: true; error: string };

/**
 * Crea la corrida y lanza el worker en un proceso separado (detached), asi el endpoint
 * responde enseguida y la corrida sobrevive a un reinicio de Next.
 * El lock real lo toma el worker con GET_LOCK; esta verificacion solo evita encolar de mas.
 */
export async function lanzarCorrida(op: LanzarOpciones): Promise<LanzarResultado> {
  await cerrarHuerfanas();
  if (await lockOcupado()) return { ok: false, ocupado: true, error: 'Ya hay una sincronizacion en curso' };

  const cfg = await getRuntimeConfig();
  const simulacion = op.simulacion ?? cfg.modoSimulacion;
  const runId = await crearRun(op.origen, simulacion, !!op.forzado);

  const cwd = process.cwd();
  const tsx = path.join(cwd, 'node_modules', '.bin', 'tsx');
  const script = path.join(cwd, 'scripts', 'mod31-repuestera-worker.ts');
  const logDir = path.join(cwd, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, 'mod31-repuestera-worker.log'), 'a');

  const child = spawn(tsx, [script, String(runId)], {
    cwd,
    env: process.env,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  fs.closeSync(out);

  return { ok: true, runId, simulacion };
}
