import { query } from '@/utils/db';

const MODULE_CONFIG_TABLE = 'modulos_autolarte_12_config';

export async function getModuleConfig(key: string): Promise<string | null> {
  try {
    const [rows] = await query<{ config_value: string | null }>(
      `SELECT config_value FROM ${MODULE_CONFIG_TABLE} WHERE config_key = ? LIMIT 1`,
      [key]
    );
    return rows[0]?.config_value ?? null;
  } catch (e) {
    console.error('[AUTOLARTE-CONFIG] Error:', e);
    return null;
  }
}

export async function setModuleConfig(key: string, value: string | null): Promise<void> {
  try {
    await query(
      `INSERT INTO ${MODULE_CONFIG_TABLE} (config_key, config_value, is_encrypted) VALUES (?, ?, FALSE)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), is_encrypted = FALSE`,
      [key, value]
    );
  } catch (e) {
    console.error('[AUTOLARTE-CONFIG] Error:', e);
    throw e;
  }
}

export async function getAllModuleConfig(): Promise<Record<string, string | null>> {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      `SELECT config_key, config_value FROM ${MODULE_CONFIG_TABLE}`
    );
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.config_key] = row.config_value;
    }
    return result;
  } catch (e) {
    console.error('[AUTOLARTE-CONFIG] Error:', e);
    return {};
  }
}

export interface ModuleCredentials {
  n8n_api_key: string | null;
  sigha_email: string | null;
  sigha_clave: string | null;
  outlook_client_id: string | null;
  outlook_client_secret: string | null;
  meilisearch_bearer: string | null;
  tarjetav_basic_auth: string | null;
  intranet_basic_auth: string | null;
  carta_api_key: string | null;
}

export async function getCredentials(): Promise<ModuleCredentials> {
  const config = await getAllModuleConfig();
  return {
    n8n_api_key: config['n8n_api_key'] ?? null,
    sigha_email: config['sigha_email'] ?? null,
    sigha_clave: config['sigha_clave'] ?? null,
    outlook_client_id: config['outlook_client_id'] ?? null,
    outlook_client_secret: config['outlook_client_secret'] ?? null,
    meilisearch_bearer: config['meilisearch_bearer'] ?? null,
    tarjetav_basic_auth: config['tarjetav_basic_auth'] ?? null,
    intranet_basic_auth: config['intranet_basic_auth'] ?? null,
    carta_api_key: config['carta_api_key'] ?? null
  };
}
