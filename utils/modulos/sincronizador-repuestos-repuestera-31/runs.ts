import { query } from '@/utils/db';

export const RUNS_TABLE = 'modulos_sincronizador_repuestos_repuestera_31_runs';
export const LOGS_TABLE = 'modulos_sincronizador_repuestos_repuestera_31_logs';
/** Lock de MySQL: lo toma el worker en su propia conexion y se libera solo si el proceso muere. */
export const LOCK_NAME = 'mod31_repuestera_sync';

export type Origen = 'boton' | 'cron' | 'manual';
export type RunStatus = 'queued' | 'running' | 'done' | 'done_with_errors' | 'error' | 'skipped';

export interface RunRow {
  id: number;
  origen: Origen;
  simulacion: number;
  forzado: number;
  status: RunStatus;
  paso: string | null;
  motivo_error: string | null;
  total_erp: number | null;
  creados: number;
  actualizados: number;
  sin_cambios: number;
  errores: number;
  stats: string | null;
  callback_status: string | null;
  pid: number | null;
  started_at: string;
  finished_at: string | null;
  duracion_segundos: number | null;
}

export interface LogEntrada {
  sku: string | null;
  accion: string;
  resultado: string;
  detalle?: string | null;
}

export async function crearRun(origen: Origen, simulacion: boolean, forzado: boolean): Promise<number> {
  const [res] = await query<any>(
    `INSERT INTO ${RUNS_TABLE} (origen, simulacion, forzado, status, paso) VALUES (?, ?, ?, 'queued', 'En cola')`,
    [origen, simulacion ? 1 : 0, forzado ? 1 : 0]
  );
  return (res as any).insertId;
}

export async function actualizarRun(id: number, campos: Partial<Omit<RunRow, 'id'>>): Promise<void> {
  const keys = Object.keys(campos);
  if (!keys.length) return;
  await query(
    `UPDATE ${RUNS_TABLE} SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
    [...keys.map((k) => (campos as any)[k]), id]
  );
}

export async function obtenerRun(id: number): Promise<RunRow | null> {
  const [rows] = await query<RunRow>(`SELECT * FROM ${RUNS_TABLE} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function listarRuns(limit = 30): Promise<RunRow[]> {
  const [rows] = await query<RunRow>(
    `SELECT id, origen, simulacion, forzado, status, paso, motivo_error, total_erp, creados, actualizados,
            sin_cambios, errores, callback_status, started_at, finished_at, duracion_segundos
       FROM ${RUNS_TABLE} ORDER BY id DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function insertarLogs(runId: number, entradas: LogEntrada[]): Promise<void> {
  for (let i = 0; i < entradas.length; i += 200) {
    const parte = entradas.slice(i, i + 200);
    await query(
      `INSERT INTO ${LOGS_TABLE} (run_id, sku, accion, resultado, detalle) VALUES ${parte.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
      parte.flatMap((e) => [runId, e.sku, e.accion, e.resultado, e.detalle ?? null])
    );
  }
}

export async function logsDeRun(runId: number, sku?: string | null, limit = 2000) {
  const params: any[] = [runId];
  let filtro = '';
  if (sku) {
    filtro = ' AND sku LIKE ?';
    params.push(`%${sku}%`);
  }
  params.push(limit);
  const [rows] = await query<any>(
    `SELECT id, sku, accion, resultado, detalle, created_at FROM ${LOGS_TABLE} WHERE run_id = ?${filtro} ORDER BY id ASC LIMIT ?`,
    params
  );
  return rows;
}

/** true si algun worker tiene el lock tomado. */
export async function lockOcupado(): Promise<boolean> {
  const [rows] = await query<{ ocupado: number | null }>('SELECT IS_USED_LOCK(?) AS ocupado', [LOCK_NAME]);
  return rows[0]?.ocupado != null;
}

/**
 * Corridas que quedaron en queued/running sin worker vivo (por ejemplo, un reinicio del servidor)
 * se cierran como error para que no queden colgadas.
 */
export async function cerrarHuerfanas(): Promise<void> {
  if (await lockOcupado()) return;
  await query(
    `UPDATE ${RUNS_TABLE}
        SET status = 'error', motivo_error = COALESCE(motivo_error, 'El proceso termino sin cerrar la corrida'),
            finished_at = NOW(), duracion_segundos = TIMESTAMPDIFF(SECOND, started_at, NOW())
      WHERE status IN ('queued', 'running') AND started_at < NOW() - INTERVAL 2 MINUTE`
  );
}

/** Borra corridas y logs de mas de 30 dias. */
export async function purgarAntiguos(): Promise<void> {
  await query(`DELETE FROM ${LOGS_TABLE} WHERE created_at < NOW() - INTERVAL 30 DAY`);
  await query(`DELETE FROM ${RUNS_TABLE} WHERE started_at < NOW() - INTERVAL 30 DAY`);
}
