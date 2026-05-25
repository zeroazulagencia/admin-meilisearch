import { query } from '@/utils/db';

const TABLE = 'modulos_sincronizador_usados_autolarte_19_logs';

export type SyncLog = {
  id: number;
  placa: string | null;
  operacion: string | null;
  resultado: string | null;
  status: string | null;
  detalle: string | null;
  created_at: string;
};

export async function insertLog(params: {
  placa?: string;
  operacion: string;
  resultado: string;
  status: string;
  detalle?: string;
}): Promise<void> {
  await query(
    `INSERT INTO ${TABLE} (placa, operacion, resultado, status, detalle) VALUES (?, ?, ?, ?, ?)`,
    [params.placa ?? '', params.operacion, params.resultado, params.status, params.detalle ?? '']
  );
}

export async function getStats(): Promise<{
  total: number;
  okCount: number;
  errorCount: number;
  ultimaSync: string | null;
  resumen: { operacion: string; count: number }[];
}> {
  const totalRow = (await query(`SELECT COUNT(*) as c FROM ${TABLE}`)) as any[];
  const okRow = (await query(`SELECT COUNT(*) as c FROM ${TABLE} WHERE status = 'ok'`)) as any[];
  const errRow = (await query(`SELECT COUNT(*) as c FROM ${TABLE} WHERE status != 'ok'`)) as any[];
  const lastRow = (await query(`SELECT created_at FROM ${TABLE} ORDER BY id DESC LIMIT 1`)) as any[];
  const resumen = (await query(
    `SELECT operacion, COUNT(*) as count FROM ${TABLE} GROUP BY operacion ORDER BY count DESC`
  )) as any[];

  return {
    total: totalRow[0]?.c ?? 0,
    okCount: okRow[0]?.c ?? 0,
    errorCount: errRow[0]?.c ?? 0,
    ultimaSync: lastRow[0]?.created_at ?? null,
    resumen: resumen as { operacion: string; count: number }[],
  };
}

export async function listLogs(limit = 200): Promise<SyncLog[]> {
  const rows = await query(
    `SELECT id, placa, operacion, resultado, status, detalle, created_at FROM ${TABLE} ORDER BY id DESC LIMIT ?`,
    [limit]
  );
  return JSON.parse(JSON.stringify(rows)) as SyncLog[];
}

export async function clearLogs(): Promise<void> {
  await query(`DELETE FROM ${TABLE}`);
}