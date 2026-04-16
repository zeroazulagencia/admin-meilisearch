import { query } from '@/utils/db';

export type Mod11LogStatus = 'success' | 'error' | 'skipped';

export async function createLog(data: {
  plate: string;
  flow: string;
  side?: string | null;
  status: Mod11LogStatus;
  step?: string | null;
  input_url?: string | null;
  output_url?: string | null;
  error_message?: string | null;
}) {
  await query(
    `INSERT INTO modulos_sistema_de_cambio_de_fondos_y_placas_11_logs
     (plate, flow, side, status, step, input_url, output_url, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      data.plate,
      data.flow,
      data.side || null,
      data.status,
      data.step || null,
      data.input_url || null,
      data.output_url || null,
      data.error_message || null,
    ]
  );
}

export async function listLogs(limit = 200) {
  const [rows] = await query(
    `SELECT id, plate, flow, side, status, step, input_url, output_url, error_message, created_at
     FROM modulos_sistema_de_cambio_de_fondos_y_placas_11_logs
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}
