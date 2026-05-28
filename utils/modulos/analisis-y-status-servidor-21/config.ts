import { query } from '@/utils/db';
import { encrypt, decrypt } from '@/utils/encryption';

const TABLE = 'modulos_analisis_y_status_servidor_21_config';

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${TABLE} WHERE config_key = ?`,
    [key]
  );
  const value = rows[0]?.config_value ?? null;
  if (value && (key === 'password')) {
    try { return decrypt(value); } catch { return value; }
  }
  return value;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  let stored = value;
  if (value && (key === 'password')) {
    stored = encrypt(value);
  }
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
    let value = row.config_value;
    if (value && (row.config_key === 'password')) {
      try { value = decrypt(value); } catch { /* keep encrypted */ }
    }
    out[row.config_key] = value;
  }
  return out;
}
