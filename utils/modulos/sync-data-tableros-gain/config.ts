import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted } from '@/utils/encryption';

const TABLE = 'modulos_gain_10_config';
const SENSITIVE_KEYS = new Set(['n8n_api_key']);

export async function getConfigValue(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${TABLE} WHERE config_key = ?`,
    [key]
  );
  const value = rows[0]?.config_value ?? null;
  if (!value) return null;
  if (SENSITIVE_KEYS.has(key) && isEncrypted(value)) {
    return decrypt(value);
  }
  return value;
}

export async function setConfigValue(key: string, value: string | null): Promise<void> {
  let storedValue = value;
  if (value && SENSITIVE_KEYS.has(key)) {
    storedValue = isEncrypted(value) ? value : encrypt(value);
  }
  await query(
    `INSERT INTO ${TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, storedValue]
  );
}

export async function getHiddenProjects(): Promise<string[]> {
  const raw = await getConfigValue('hidden_projects');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
}

export async function setHiddenProjects(projects: string[]): Promise<void> {
  const unique = Array.from(new Set(projects.filter((p) => typeof p === 'string' && p.trim())));
  await setConfigValue('hidden_projects', JSON.stringify(unique));
}
