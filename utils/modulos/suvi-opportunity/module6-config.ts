/**
 * MÓDULO 6 - SUVI OPPORTUNITY (Ventas / Crédito)
 * Configuración y log en modulos_suvi_6_config y modulos_suvi_6_opportunities
 */
import { query } from '@/utils/db';

const CONFIG_TABLE = 'modulos_suvi_6_config';
const OPPORTUNITIES_TABLE = 'modulos_suvi_6_opportunities';

export async function getConfig(key: string): Promise<string | null> {
  try {
    const [rows] = await query<any>(
      `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = ? LIMIT 1`,
      [key]
    );
    return rows[0]?.config_value ?? null;
  } catch (e) {
    console.error(`[MOD6-CONFIG] Error obteniendo ${key}:`, e);
    return null;
  }
}

export async function setConfig(key: string, value: string): Promise<void> {
  try {
    await query<any>(
      `INSERT INTO ${CONFIG_TABLE} (config_key, config_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, value]
    );
  } catch (e) {
    console.error(`[MOD6-CONFIG] Error actualizando ${key}:`, e);
    throw e;
  }
}

export async function updateOpportunityLog(
  id: number,
  updates: Record<string, any>
): Promise<void> {
  if (Object.keys(updates).length === 0) return;
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    values.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
  }
  values.push(id);
  await query<any>(
    `UPDATE ${OPPORTUNITIES_TABLE} SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export interface CreateOpportunityRow {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  pais?: string | null;
  indicativo?: string | null;
  ciudad?: string | null;
  nombre_proyecto?: string | null;
  form_variant?: string | null;
  tipo: 'ventas' | 'credito';
  payload_raw?: any;
}

export async function createOpportunityRecord(data: CreateOpportunityRow): Promise<number> {
  const [result] = await query<any>(
    `INSERT INTO ${OPPORTUNITIES_TABLE} (
      email, nombre, apellido, telefono, pais, indicativo, ciudad,
      nombre_proyecto, form_variant, tipo, payload_raw, processing_status, current_step
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recibido', 'Recibido')`,
    [
      data.email,
      data.nombre,
      data.apellido,
      data.telefono,
      data.pais ?? null,
      data.indicativo ?? null,
      data.ciudad ?? null,
      data.nombre_proyecto ?? null,
      data.form_variant ?? null,
      data.tipo,
      JSON.stringify(data.payload_raw ?? {}),
    ]
  );
  return (result as any).insertId;
}
