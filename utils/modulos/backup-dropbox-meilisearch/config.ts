/**
 * Módulo 9 - Backup Meilisearch a Dropbox
 * Config en modulos_backup_9_config
 */
import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted } from '@/utils/encryption';

const SENSITIVE_KEYS = new Set([
  'dropbox_access_token',
  'cron_secret',
  'ssh_password',
  'meilisearch_api_key',
]);

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    'SELECT config_value FROM modulos_backup_9_config WHERE config_key = ?',
    [key]
  );
  const value = rows[0]?.config_value ?? null;
  if (!value) return null;
  if (SENSITIVE_KEYS.has(key) && isEncrypted(value)) {
    return decrypt(value);
  }
  return value;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  let storedValue = value;
  if (value && SENSITIVE_KEYS.has(key)) {
    storedValue = isEncrypted(value) ? value : encrypt(value);
  }
  await query(
    `INSERT INTO modulos_backup_9_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, storedValue]
  );
}
