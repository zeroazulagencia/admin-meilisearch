import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted } from '@/utils/encryption';

const SENSITIVE_KEYS = new Set([
  'replicate_api_token',
  'rapidapi_key',
  'wp_db_password',
  'wp_api_token',
]);

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    'SELECT config_value FROM modulos_sistema_de_cambio_de_fondos_y_placas_11_config WHERE config_key = ?',
    [key]
  );
  const value = rows[0]?.config_value ?? null;
  if (!value) return null;
  if (isEncrypted(value)) {
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
    `INSERT INTO modulos_sistema_de_cambio_de_fondos_y_placas_11_config (config_key, config_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, storedValue]
  );
}
