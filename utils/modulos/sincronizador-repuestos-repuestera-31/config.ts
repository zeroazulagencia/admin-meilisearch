import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted, maskSensitiveValue } from '@/utils/encryption';

const TABLE = 'modulos_sincronizador_repuestos_repuestera_31_config';

/** Se guardan cifradas (AES-256-GCM) y se devuelven enmascaradas al frontend. */
export const SENSITIVE_KEYS = new Set([
  'erp_clave',
  'woo_consumer_key',
  'woo_consumer_secret',
  'sync_token',
  'cron_secret',
]);

/** Claves que se pueden editar desde la pestaña Configuracion. */
export const EDITABLE_KEYS = [
  'erp_base_url',
  'erp_usuario',
  'erp_clave',
  'woo_base_url',
  'woo_consumer_key',
  'woo_consumer_secret',
  'wp_callback_url',
  'sync_token',
  'cron_secret',
  'modo_simulacion',
  'tamano_lote',
  'max_categorias_nuevas',
  'min_ratio_erp',
  'max_huerfanos',
  'skus_excluidos',
] as const;

/** Claves internas que escribe el worker (no editables). */
export const INTERNAL_KEYS = ['ultimo_total_erp', 'ultima_sincronizacion'] as const;

export async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${TABLE} WHERE config_key = ?`,
    [key]
  );
  const value = rows[0]?.config_value ?? null;
  if (!value) return null;
  if (SENSITIVE_KEYS.has(key) && isEncrypted(value)) return decrypt(value);
  return value;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  let storedValue = value;
  if (value && SENSITIVE_KEYS.has(key)) storedValue = isEncrypted(value) ? value : encrypt(value);
  await query(
    `INSERT INTO ${TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, storedValue]
  );
}

export async function getAllConfig(): Promise<Record<string, string | null>> {
  const [rows] = await query<{ config_key: string; config_value: string | null }>(
    `SELECT config_key, config_value FROM ${TABLE}`
  );
  const out: Record<string, string | null> = {};
  for (const row of rows || []) {
    if (!SENSITIVE_KEYS.has(row.config_key)) {
      out[row.config_key] = row.config_value;
      continue;
    }
    if (!row.config_value) {
      out[row.config_key] = null;
      continue;
    }
    try {
      const visible = isEncrypted(row.config_value) ? decrypt(row.config_value) : row.config_value;
      out[row.config_key] = maskSensitiveValue(visible, 5) || '*****';
    } catch {
      out[row.config_key] = '*****';
    }
  }
  return out;
}

/** true si el valor es la version enmascarada de lo que ya esta guardado (no se debe sobrescribir). */
export async function esValorEnmascarado(key: string, value: string): Promise<boolean> {
  if (!SENSITIVE_KEYS.has(key)) return false;
  if (value === '*****') return true;
  const actual = await getConfig(key);
  return !!actual && maskSensitiveValue(actual, 5) === value;
}

const numero = (v: string | null, def: number) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : def;
};

/** Config completa sin enmascarar (uso interno del worker y de los endpoints). */
export async function getRuntimeConfig() {
  const [rows] = await query<{ config_key: string; config_value: string | null }>(
    `SELECT config_key, config_value FROM ${TABLE}`
  );
  const raw: Record<string, string | null> = {};
  for (const r of rows || []) {
    const v = r.config_value;
    raw[r.config_key] = v && SENSITIVE_KEYS.has(r.config_key) && isEncrypted(v) ? decrypt(v) : v;
  }
  return {
    erpBaseUrl: (raw.erp_base_url || '').replace(/\/+$/, ''),
    erpUsuario: raw.erp_usuario || '',
    erpClave: raw.erp_clave || '',
    wooBaseUrl: (raw.woo_base_url || '').replace(/\/+$/, ''),
    wooKey: raw.woo_consumer_key || '',
    wooSecret: raw.woo_consumer_secret || '',
    wpCallbackUrl: raw.wp_callback_url || '',
    syncToken: raw.sync_token || '',
    cronSecret: raw.cron_secret || '',
    modoSimulacion: raw.modo_simulacion !== '0',
    tamanoLote: numero(raw.tamano_lote, 50),
    maxCategoriasNuevas: numero(raw.max_categorias_nuevas, 100),
    minRatioErp: numero(raw.min_ratio_erp, 0.7),
    maxHuerfanos: numero(raw.max_huerfanos, 300),
    skusExcluidos: raw.skus_excluidos || '',
    ultimoTotalErp: numero(raw.ultimo_total_erp, 0),
  };
}

export type RuntimeConfig = Awaited<ReturnType<typeof getRuntimeConfig>>;
