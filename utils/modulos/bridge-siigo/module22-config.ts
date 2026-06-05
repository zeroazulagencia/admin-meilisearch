import { query } from '@/utils/db';

export async function getConfig(key: string): Promise<string | null> {
  try {
    const [rows] = await query<{ config_value: string | null }>(
      'SELECT config_value FROM modulos_bridge_siigo_22_config WHERE config_key = ? LIMIT 1',
      [key]
    );
    return rows?.[0]?.config_value ?? null;
  } catch {
    return null;
  }
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await query('DELETE FROM modulos_bridge_siigo_22_config WHERE config_key = ?', [key]);
  } else {
    await query(
      `INSERT INTO modulos_bridge_siigo_22_config (config_key, config_value, is_encrypted)
       VALUES (?, ?, FALSE)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), is_encrypted = FALSE`,
      [key, value]
    );
  }
}

export async function getAllConfig(): Promise<Record<string, string | null>> {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_bridge_siigo_22_config'
    );
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.config_key] = row.config_value;
    }
    return result;
  } catch {
    return {};
  }
}