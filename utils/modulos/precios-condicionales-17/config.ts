import { randomUUID } from 'crypto';
import { query } from '@/utils/db';
import { decrypt, encrypt, isEncrypted, maskSensitiveValue } from '@/utils/encryption';

const TABLE = 'modulos_precios_condicionales_17_config';

const SENSITIVE_KEYS = new Set([
  'shopify_admin_access_token',
  'shopify_api_key',
  'shopify_api_secret',
  'shopify_webhook_secret',
  'shopify_bridge_secret',
  'shopify_storefront_access_token',
]);

export type DiscountType = 'percentage' | 'fixed_per_item';
export type ProductScopeMode = 'all_products' | 'selected_only' | 'selected_with_base_fallback';
export type ProductOverrideMode = 'percentage' | 'final_price';

export interface StateDiscount {
  state: string;
  discount: number;
}

export interface ProductDiscountOverride {
  id: string;
  product_id: string;
  product_title?: string | null;
  mode: ProductOverrideMode;
  value: number;
  active: boolean;
}

function normalizeDiscountType(value: string | null | undefined): DiscountType {
  return value === 'fixed_per_item' ? 'fixed_per_item' : 'percentage';
}

function normalizeProductScopeMode(value: string | null | undefined): ProductScopeMode {
  if (value === 'selected_only') return 'selected_only';
  if (value === 'selected_with_base_fallback') return 'selected_with_base_fallback';
  return 'all_products';
}

function sanitizeProductOverride(input: any): ProductDiscountOverride | null {
  const productId = typeof input?.product_id === 'string' ? input.product_id.trim() : '';
  if (!productId) return null;

  const numericValue = Number(input?.value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;

  return {
    id: typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : randomUUID(),
    product_id: productId,
    product_title: typeof input?.product_title === 'string' ? input.product_title.trim() || null : null,
    mode: input?.mode === 'final_price' ? 'final_price' : 'percentage',
    value: numericValue,
    active: input?.active === false ? false : true,
  };
}

function normalizeProductOverrides(payload: any): ProductDiscountOverride[] {
  if (!Array.isArray(payload)) return [];

  const seen = new Set<string>();

  return payload
    .map((item) => sanitizeProductOverride(item))
    .filter((item): item is ProductDiscountOverride => Boolean(item))
    .filter((item) => {
      const key = `${item.product_id}::${item.mode}::${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

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

export async function getProductOverrides(force = false): Promise<ProductDiscountOverride[]> {
  const raw = await getConfig('product_overrides');

  if (!raw && !force) return [];

  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeProductOverrides(parsed);
  } catch {
    return [];
  }
}

export async function setProductOverrides(overrides: any[]): Promise<ProductDiscountOverride[]> {
  const normalized = normalizeProductOverrides(overrides);
  await setConfig('product_overrides', JSON.stringify(normalized));
  return normalized;
}

export async function getRuntimeConfig() {
  const [
    enabled,
    targetCountryCode,
    targetState,
    discountType,
    discountValue,
    requireShippingMatch,
    stateAliases,
    ipwhoisBaseUrl,
    shopifyShopDomain,
    shopifyAdminAccessToken,
    shopifyApiKey,
    shopifyApiSecret,
    shopifyWebhookSecret,
    shopifyBridgeSecret,
    shopifyStorefrontAccessToken,
    productScopeMode,
    productOverrides,
    stateDiscounts,
  ] = await Promise.all([
    getConfig('enabled'),
    getConfig('target_country_code'),
    getConfig('target_state'),
    getConfig('discount_type'),
    getConfig('discount_value'),
    getConfig('require_shipping_match'),
    getConfig('state_aliases'),
    getConfig('ipwhois_base_url'),
    getConfig('shopify_shop_domain'),
    getConfig('shopify_admin_access_token'),
    getConfig('shopify_api_key'),
    getConfig('shopify_api_secret'),
    getConfig('shopify_webhook_secret'),
    getConfig('shopify_bridge_secret'),
    getConfig('shopify_storefront_access_token'),
    getConfig('product_scope_mode'),
    getProductOverrides(),
    getConfig('state_discounts'),
  ]);

  let aliases: string[] = [];

  if (stateAliases) {
    try {
      const parsed = JSON.parse(stateAliases);
      if (Array.isArray(parsed)) {
        aliases = parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      aliases = [];
    }
  }

  let parsedStateDiscounts: StateDiscount[] = [];
  if (stateDiscounts) {
    try {
      const parsed = JSON.parse(stateDiscounts);
      if (Array.isArray(parsed)) {
        parsedStateDiscounts = parsed
          .map((item: any) => ({
            state: String(item?.state || '').trim(),
            discount: Number(item?.discount || 0),
          }))
          .filter((item) => item.state && Number.isFinite(item.discount) && item.discount >= 0);
      }
    } catch {
      parsedStateDiscounts = [];
    }
  }

  return {
    enabled: enabled === '1' || enabled === 'true',
    targetCountryCode: (targetCountryCode || 'CO').toUpperCase(),
    targetState: (targetState || 'Norte de Santander').trim(),
    discountType: normalizeDiscountType(discountType),
    discountValue: Number(discountValue || 0),
    requireShippingMatch: requireShippingMatch !== '0' && requireShippingMatch !== 'false',
    stateAliases: aliases,
    ipwhoisBaseUrl: (ipwhoisBaseUrl || 'https://ipwho.is').trim(),
    shopifyShopDomain: shopifyShopDomain || null,
    shopifyAdminAccessToken: shopifyAdminAccessToken || null,
    shopifyApiKey: shopifyApiKey || null,
    shopifyApiSecret: shopifyApiSecret || null,
    shopifyWebhookSecret: shopifyWebhookSecret || null,
    shopifyBridgeSecret: shopifyBridgeSecret || null,
    shopifyStorefrontAccessToken: shopifyStorefrontAccessToken || null,
    productScopeMode: normalizeProductScopeMode(productScopeMode),
    productOverrides,
    stateDiscounts: parsedStateDiscounts,
  } as const;
}
