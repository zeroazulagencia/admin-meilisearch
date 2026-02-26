/**
 * Módulo 7 - Backup BD a Dropbox
 * Config en modulos_backup_7_config
 */
import { query } from '@/utils/db';

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    'SELECT config_value FROM modulos_backup_7_config WHERE config_key = ?',
    [key]
  );
  return rows[0]?.config_value ?? null;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  await query(
    `INSERT INTO modulos_backup_7_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, value]
  );
}
