import { query } from '@/utils/db';

const TABLE = 'modulos_precios_condicionales_17_logs';

export interface PricingDecisionLogInput {
  eventType: string;
  ipAddress?: string | null;
  resolvedState?: string | null;
  resolvedCountryCode?: string | null;
  shippingState?: string | null;
  shippingCountryCode?: string | null;
  targetState?: string | null;
  requireShippingMatch?: boolean;
  discountType?: string | null;
  discountValue?: number | null;
  applied?: boolean;
  reason?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

function toJson(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export async function insertDecisionLog(input: PricingDecisionLogInput): Promise<void> {
  await query(
    `INSERT INTO ${TABLE} (
      event_type,
      ip_address,
      resolved_state,
      resolved_country_code,
      shipping_state,
      shipping_country_code,
      target_state,
      require_shipping_match,
      discount_type,
      discount_value,
      applied,
      reason,
      request_payload,
      response_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.eventType,
      input.ipAddress || null,
      input.resolvedState || null,
      input.resolvedCountryCode || null,
      input.shippingState || null,
      input.shippingCountryCode || null,
      input.targetState || null,
      input.requireShippingMatch ? 1 : 0,
      input.discountType || null,
      input.discountValue ?? null,
      input.applied ? 1 : 0,
      input.reason || null,
      toJson(input.requestPayload),
      toJson(input.responsePayload),
    ]
  );
}

export async function clearDecisionLogs(): Promise<void> {
  await query(`DELETE FROM ${TABLE}`);
}

export async function listDecisionLogs(limit: number = 100) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 100));

  const [rows] = await query<any>(
    `SELECT
      id,
      event_type,
      ip_address,
      resolved_state,
      resolved_country_code,
      shipping_state,
      shipping_country_code,
      target_state,
      require_shipping_match,
      discount_type,
      discount_value,
      applied,
      reason,
      request_payload,
      response_payload,
      created_at
     FROM ${TABLE}
     ORDER BY created_at DESC
     LIMIT ?`,
    [safeLimit]
  );

  return (rows || []).map((row: any) => ({
    ...row,
    require_shipping_match: !!row.require_shipping_match,
    applied: !!row.applied,
  }));
}
