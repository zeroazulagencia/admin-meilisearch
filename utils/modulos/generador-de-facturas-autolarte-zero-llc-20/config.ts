import { query } from '@/utils/db';

const TABLE = 'modulos_generador_de_facturas_autolarte_zero_llc_20_config';

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query(`SELECT config_value FROM ${TABLE} WHERE config_key = ?`, [key]);
  return (rows as any[])?.[0]?.config_value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO ${TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = ?`,
    [key, value, value]
  );
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const [rows] = await query(`SELECT config_key, config_value FROM ${TABLE}`);
  const cfg: Record<string, string> = {};
  for (const r of rows as any[]) cfg[r.config_key] = r.config_value;
  return cfg;
}

export async function getRuntimeConfig() {
  const [rows] = await query(`SELECT config_key, config_value FROM ${TABLE}`);
  const cfg: Record<string, string> = {};
  for (const r of rows as any[]) cfg[r.config_key] = r.config_value;
  return cfg;
}
