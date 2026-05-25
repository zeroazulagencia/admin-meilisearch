import { query } from '@/utils/db';

const TABLE = 'modulos_monitor_web_cfa_18_config';

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${TABLE} WHERE config_key = ?`,
    [key]
  );
  return rows[0]?.config_value ?? null;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  await query(
    `INSERT INTO ${TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, value]
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

export async function getRuntimeConfig(): Promise<{
  url: string;
  intervalMinutes: number;
  enabled: boolean;
}> {
  const [urlValue, intervalValue, enabledValue] = await Promise.all([
    getConfig('url'),
    getConfig('interval_minutes'),
    getConfig('enabled'),
  ]);

  return {
    url: (urlValue || 'https://www.cfa.com.co/').trim(),
    intervalMinutes: Math.max(1, Number(intervalValue || 5)),
    enabled: enabledValue === '1' || enabledValue === 'true',
  };
}