import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted, maskSensitiveValue } from '@/utils/encryption';

const TABLE = 'modulos_precios_dinamicos_ubicacion_shopify_30_config';

/**
 * Claves sensibles: se guardan cifradas (AES-256-GCM) y se devuelven enmascaradas
 * en getAllConfig(). El dominio (shopify_shop_domain) no es sensible.
 * Mismas claves que el módulo 17 (motor de reglas de El Retén del Casco).
 */
const SENSITIVE_KEYS = new Set([
  'shopify_admin_access_token',
  'shopify_api_key',
  'shopify_api_secret',
  'shopify_webhook_secret',
  'shopify_bridge_secret',
  'shopify_storefront_access_token',
]);

export async function getConfig(key: string): Promise<string | null> {
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

export async function setConfig(key: string, value: string | null): Promise<void> {
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

export async function getAllConfig(): Promise<Record<string, string | null>> {
  const [rows] = await query<{ config_key: string; config_value: string | null }>(
    `SELECT config_key, config_value FROM ${TABLE}`
  );

  const out: Record<string, string | null> = {};

  for (const row of rows || []) {
    if (SENSITIVE_KEYS.has(row.config_key)) {
      if (!row.config_value) {
        out[row.config_key] = null;
        continue;
      }

      try {
        const visible = isEncrypted(row.config_value)
          ? decrypt(row.config_value)
          : row.config_value;
        out[row.config_key] = maskSensitiveValue(visible, 5) || '*****';
      } catch {
        out[row.config_key] = '*****';
      }
      continue;
    }

    out[row.config_key] = row.config_value;
  }

  return out;
}

/** Config completa sin enmascarar (uso interno / runtime). */
export async function getRuntimeConfig() {
  const [
    shopifyShopDomain,
    shopifyAdminAccessToken,
    shopifyApiKey,
    shopifyApiSecret,
    shopifyWebhookSecret,
    shopifyBridgeSecret,
    shopifyStorefrontAccessToken,
    shopifyAppName,
  ] = await Promise.all([
    getConfig('shopify_shop_domain'),
    getConfig('shopify_admin_access_token'),
    getConfig('shopify_api_key'),
    getConfig('shopify_api_secret'),
    getConfig('shopify_webhook_secret'),
    getConfig('shopify_bridge_secret'),
    getConfig('shopify_storefront_access_token'),
    getConfig('shopify_app_name'),
  ]);

  return {
    shopifyShopDomain: shopifyShopDomain || null,
    shopifyAdminAccessToken: shopifyAdminAccessToken || null,
    shopifyApiKey: shopifyApiKey || null,
    shopifyApiSecret: shopifyApiSecret || null,
    shopifyWebhookSecret: shopifyWebhookSecret || null,
    shopifyBridgeSecret: shopifyBridgeSecret || null,
    shopifyStorefrontAccessToken: shopifyStorefrontAccessToken || null,
    shopifyAppName: shopifyAppName || null,
  } as const;
}