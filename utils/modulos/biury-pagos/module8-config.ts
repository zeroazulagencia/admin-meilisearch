import { randomUUID } from 'crypto';
import { query } from '@/utils/db';

export interface ProductRule {
  id: string;
  matcher: string | string[];
  account_code: string;
  description?: string | null;
  gateway_matcher?: string | null;
  active?: boolean;
}

const DEFAULT_PRODUCT_RULES: ProductRule[] = [];

const PRODUCT_RULES_CACHE_TTL = 60_000;
const CONFIG_CACHE_TTL = 30_000;
let cachedProductRules: { rules: ProductRule[]; updatedAt: number } | null = null;
let cachedConfig: { data: Record<string, string | null>; updatedAt: number } | null = null;

function cloneDefaultRules(): ProductRule[] {
  return DEFAULT_PRODUCT_RULES.map((rule) => ({ ...rule }));
}

const GATEWAY_EMPTY_SENTINEL = '__EMPTY__';
const PRODUCT_MATCH_ALL_SENTINEL = '*';
const FALLBACK_RULE_ERROR = 'Debe existir al menos una regla activa con gateway "Sin gateway".';

function sanitizeProductRule(input: any): ProductRule | null {
  const account = typeof input?.account_code === 'string' ? input.account_code.trim() : '';
  const matcherRaw = input?.matcher;
  let matcher: string | string[] = PRODUCT_MATCH_ALL_SENTINEL;

  if (Array.isArray(matcherRaw)) {
    const normalizedSet = new Set(
      matcherRaw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    );
    matcher = normalizedSet.size ? Array.from(normalizedSet) : PRODUCT_MATCH_ALL_SENTINEL;
  } else if (typeof matcherRaw === 'string') {
    const trimmed = matcherRaw.trim();
    matcher = trimmed || PRODUCT_MATCH_ALL_SENTINEL;
  }

  if (!account) {
    return null;
  }
  const id = typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : randomUUID();
  const rawGateway = typeof input?.gateway_matcher === 'string' ? input.gateway_matcher.trim() : '';
  const gatewayMatcher = rawGateway === GATEWAY_EMPTY_SENTINEL ? GATEWAY_EMPTY_SENTINEL : rawGateway;
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const active = input?.active === false ? false : true;
  return {
    id,
    matcher,
    account_code: account,
    gateway_matcher: gatewayMatcher ? gatewayMatcher : null,
    description: description || null,
    active,
  };
}

function normalizeProductRules(payload: any): ProductRule[] {
  if (!Array.isArray(payload)) {
    return cloneDefaultRules();
  }

  const sanitized = payload
    .map((rule) => sanitizeProductRule(rule))
    .filter((rule): rule is ProductRule => Boolean(rule));

  return sanitized.length ? sanitized : cloneDefaultRules();
}

export async function getProductRules(force = false): Promise<ProductRule[]> {
  if (!force && cachedProductRules && Date.now() - cachedProductRules.updatedAt < PRODUCT_RULES_CACHE_TTL) {
    return cachedProductRules.rules;
  }

  const raw = await getConfig('product_rules');
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  const normalized = normalizeProductRules(parsed);
  cachedProductRules = { rules: normalized, updatedAt: Date.now() };
  return normalized;
}

export async function setProductRules(rules: any[]): Promise<ProductRule[]> {
  const normalized = normalizeProductRules(rules);
  const fallbackRules = normalized.filter((rule) => rule.gateway_matcher === GATEWAY_EMPTY_SENTINEL);

  if (!fallbackRules.length) {
    const error = new Error(FALLBACK_RULE_ERROR) as Error & { code?: string };
    error.code = 'MISSING_FALLBACK_RULE';
    throw error;
  }

  let mutated = false;
  for (const fallbackRule of fallbackRules) {
    if (fallbackRule.active === false) {
      fallbackRule.active = true;
      mutated = true;
    }
  }

  if (mutated) {
    console.info('[MOD8-CONFIG] Se reactivó la regla fallback (Sin gateway) para cumplir la especificación.');
  }

  await setConfig('product_rules', JSON.stringify(normalized));
  cachedProductRules = { rules: normalized, updatedAt: Date.now() };
  return normalized;
}

export async function matchProductRule(productName: string, gateway?: string | null): Promise<ProductRule | null> {
  const rules = await getProductRules();
  const normalizedName = (productName || '').toLowerCase();
  const normalizedGateway = (gateway || '').toLowerCase();
  const gatewayIsMissing = !normalizedGateway || normalizedGateway === 'unknown';

  for (const rule of rules) {
    if (rule.active === false) continue;
    const matcherNeedle = rule.matcher;
    const matchesProduct = (() => {
      if (typeof matcherNeedle === 'string') {
        if (matcherNeedle === PRODUCT_MATCH_ALL_SENTINEL) {
          return true;
        }
        const needle = matcherNeedle.trim().toLowerCase();
        return needle ? normalizedName.includes(needle) : false;
      }
      if (Array.isArray(matcherNeedle)) {
        if (!matcherNeedle.length) {
          return true;
        }
        return matcherNeedle.some((needle) => normalizedName.includes(needle.trim().toLowerCase())) || matcherNeedle.includes(PRODUCT_MATCH_ALL_SENTINEL);
      }
      return false;
    })();
    if (!matchesProduct) continue;
    if (rule.gateway_matcher === GATEWAY_EMPTY_SENTINEL) {
      if (!gatewayIsMissing) continue;
    } else if (rule.gateway_matcher) {
      const gatewayNeedle = rule.gateway_matcher.toLowerCase();
      if (!normalizedGateway.includes(gatewayNeedle)) continue;
    }
    return rule;
  }

  return null;
}

export async function getDistinctProductNames(limit = 200): Promise<string[]> {
  const [rows] = await query<{ product_name: string | null }>(
    `SELECT DISTINCT product_name
     FROM modulos_biury_8_logs
     WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
     ORDER BY product_name ASC
     LIMIT ?`,
    [limit]
  );
  return rows
    .map((row) => (row.product_name || '').trim())
    .filter((name, index, arr) => name && arr.indexOf(name) === index);
}

export async function getDistinctGateways(limit = 200): Promise<string[]> {
  const [rows] = await query<{ gateway: string | null }>(
    `SELECT DISTINCT gateway
     FROM modulos_biury_8_logs
     WHERE gateway IS NOT NULL AND TRIM(gateway) <> '' AND LOWER(gateway) <> 'unknown'
     ORDER BY gateway ASC
     LIMIT ?`,
    [limit]
  );
  return rows
    .map((row) => (row.gateway || '').trim())
    .filter((gw, index, arr) => gw && arr.indexOf(gw) === index);
}

export { GATEWAY_EMPTY_SENTINEL, FALLBACK_RULE_ERROR, PRODUCT_MATCH_ALL_SENTINEL };

export async function getConfig(key: string): Promise<string | null> {
  try {
    if (cachedConfig && Date.now() - cachedConfig.updatedAt < CONFIG_CACHE_TTL) {
      return cachedConfig.data[key] ?? null;
    }
    const [rows] = await query<{ config_value: string | null }>(
      'SELECT config_value FROM modulos_biury_8_config WHERE config_key = ? LIMIT 1',
      [key]
    );
    return rows[0]?.config_value ?? null;
  } catch (e) {
    console.error('[MOD8-CONFIG] Error:', e);
    return null;
  }
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  try {
    await query(
      `INSERT INTO modulos_biury_8_config (config_key, config_value, is_encrypted) VALUES (?, ?, FALSE)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), is_encrypted = FALSE`,
      [key, value]
    );
    if (cachedConfig) {
      cachedConfig = {
        data: { ...cachedConfig.data, [key]: value },
        updatedAt: Date.now(),
      };
    }
  } catch (e) {
    console.error('[MOD8-CONFIG] Error:', e);
    throw e;
  }
}

export async function getAllConfig(): Promise<Record<string, string | null>> {
  try {
    if (cachedConfig && Date.now() - cachedConfig.updatedAt < CONFIG_CACHE_TTL) {
      return cachedConfig.data;
    }
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_biury_8_config'
    );
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.config_key] = row.config_value;
    }
    cachedConfig = { data: result, updatedAt: Date.now() };
    return result;
  } catch (e) {
    console.error('[MOD8-CONFIG] Error:', e);
    return {};
  }
}

export async function createLog(data: {
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  payload_raw?: string;
  siigo_response?: string;
  status: 'success' | 'error' | 'filtered';
}): Promise<number> {
  try {
    const [result] = await query(
      `INSERT INTO modulos_biury_8_logs 
       (payment_id, customer_document, product_name, gateway, total, payload_raw, siigo_response, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.payment_id,
        data.customer_document,
        data.product_name,
        data.gateway,
        data.total,
        data.payload_raw || null,
        data.siigo_response || null,
        data.status
      ]
    );
    return (result as any).insertId;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    throw e;
  }
}

export async function updateLogById(
  id: number,
  data: {
    customer_document: string;
    product_name: string;
    gateway: string;
    total: number;
    payload_raw?: string;
    siigo_response?: string;
    status: 'success' | 'error' | 'filtered';
  }
): Promise<boolean> {
  try {
    const [result] = await query(
      `UPDATE modulos_biury_8_logs
       SET customer_document = ?, product_name = ?, gateway = ?, total = ?, payload_raw = ?, siigo_response = ?, status = ?
       WHERE id = ?
       LIMIT 1`,
      [
        data.customer_document,
        data.product_name,
        data.gateway,
        data.total,
        data.payload_raw || null,
        data.siigo_response || null,
        data.status,
        id,
      ]
    );

    return (result as any).affectedRows > 0;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return false;
  }
}

export async function getSuccessLogByPaymentId(paymentId: string): Promise<any | null> {
  try {
    if (!paymentId) return null;
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       WHERE payment_id = ? AND status = 'success'
       ORDER BY id DESC
       LIMIT 1`,
      [paymentId]
    );
    return rows.length ? rows[0] : null;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return null;
  }
}

export async function upsertLogByPaymentId(data: {
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  payload_raw?: string;
  siigo_response?: string;
  status: 'success' | 'error' | 'filtered';
}): Promise<'updated' | 'created'> {
  try {
    const [result] = await query(
      `UPDATE modulos_biury_8_logs
       SET customer_document = ?, product_name = ?, gateway = ?, total = ?, payload_raw = ?, siigo_response = ?, status = ?
       WHERE payment_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [
        data.customer_document,
        data.product_name,
        data.gateway,
        data.total,
        data.payload_raw || null,
        data.siigo_response || null,
        data.status,
        data.payment_id,
      ]
    );

    if ((result as any).affectedRows > 0) {
      return 'updated';
    }

    await query(
      `INSERT INTO modulos_biury_8_logs
       (payment_id, customer_document, product_name, gateway, total, payload_raw, siigo_response, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.payment_id,
        data.customer_document,
        data.product_name,
        data.gateway,
        data.total,
        data.payload_raw || null,
        data.siigo_response || null,
        data.status,
      ]
    );

    return 'created';
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    throw e;
  }
}

export interface LogFilters {
  search?: string | null;
  status?: string | null;
}

export async function getLogs(limit = 50, offset = 0, filters?: LogFilters): Promise<any[]> {
  try {
    const search = filters?.search?.trim().toLowerCase();
    const status = filters?.status?.trim().toLowerCase();
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      conditions.push('(LOWER(payment_id) LIKE ? OR LOWER(product_name) LIKE ? OR LOWER(gateway) LIKE ?)');
    }

    if (status) {
      params.push(status);
      conditions.push('LOWER(status) = ?');
    }

    params.push(limit, offset);

    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getErrorLogs(limit = 50): Promise<any[]> {
  try {
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs WHERE status = 'error' ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getFilteredLogs(limit = 50): Promise<any[]> {
  try {
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs WHERE status = 'filtered' ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getErrorLogsSince(dateFrom: string, limit = 50): Promise<any[]> {
  try {
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       WHERE status = 'error' AND created_at >= ?
       ORDER BY created_at DESC LIMIT ?`,
      [dateFrom, limit]
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getErrorLogsBySku(sku: string, limit = 50): Promise<any[]> {
  try {
    const needle = `%\"product_invoicing_id\":\"${sku.replace(/"/g, '')}\"%`;
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       WHERE status = 'error' AND payload_raw LIKE ?
       ORDER BY created_at DESC LIMIT ?`,
      [needle, limit]
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getLogsByPaymentIds(paymentIds: string[]): Promise<any[]> {
  try {
    if (!paymentIds.length) return [];
    const placeholders = paymentIds.map(() => '?').join(',');
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       WHERE payment_id IN (${placeholders})
       ORDER BY created_at DESC`,
      paymentIds
    );
    return rows;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return [];
  }
}

export async function getLogById(id: number): Promise<any | null> {
  try {
    const [rows] = await query('SELECT * FROM modulos_biury_8_logs WHERE id = ?', [id]);
    return rows.length ? rows[0] : null;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return null;
  }
}

export async function hasSuccessLogByPaymentId(paymentId: string): Promise<boolean> {
  try {
    if (!paymentId) return false;
    const [rows] = await query(
      'SELECT id FROM modulos_biury_8_logs WHERE payment_id = ? AND status = \"success\" LIMIT 1',
      [paymentId]
    );
    return rows.length > 0;
  } catch (e) {
    console.error('[MOD8-LOG] Error:', e);
    return false;
  }
}

export async function getStats(): Promise<{ total: number; success: number; error: number; filtered: number }> {
  try {
    const [rows] = await query<{ total: number; success: number; error: number; filtered: number }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
         SUM(CASE WHEN status = 'filtered' THEN 1 ELSE 0 END) as filtered
       FROM modulos_biury_8_logs`
    );
    return rows[0] || { total: 0, success: 0, error: 0, filtered: 0 };
  } catch (e) {
    console.error('[MOD8-STATS] Error:', e);
    return { total: 0, success: 0, error: 0, filtered: 0 };
  }
}
