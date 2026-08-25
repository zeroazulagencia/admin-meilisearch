import { query } from '@/utils/db';

const TABLE = 'modulos_auditoria_agentes_25_config';

// Colores por nivel/categoria para visualizaciones compartidas
export const NIVEL_COLORS: Record<string, string> = {
  Excelente: '#10B981',
  Bueno: '#3B82F6',
  Aceptable: '#F59E0B',
  Regular: '#F97316',
  Deficiente: '#EF4444',
  acierto: '#10B981',
  revisar: '#F59E0B',
  error: '#EF4444',
};

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${TABLE} WHERE config_key = ?`,
    [key]
  );
  return rows?.[0]?.config_value ?? null;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  const stored = value ?? null;
  await query(
    `INSERT INTO ${TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, stored]
  );
}

export async function getAllConfig(): Promise<Record<string, string | null>> {
  const [rows] = await query<{ config_key: string; config_value: string | null }>(
    `SELECT config_key, config_value FROM ${TABLE}`
  );
  const out: Record<string, string | null> = {};
  for (const row of rows || []) {
    out[row.config_key] = row.config_value;
  }
  return out;
}