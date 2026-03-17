import { query } from '@/utils/db';

export async function getConfig(key: string): Promise<string | null> {
  try {
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
  } catch (e) {
    console.error('[MOD8-CONFIG] Error:', e);
    throw e;
  }
}

export async function getAllConfig(): Promise<Record<string, string | null>> {
  try {
    const [rows] = await query<{ config_key: string; config_value: string | null }>(
      'SELECT config_key, config_value FROM modulos_biury_8_config'
    );
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.config_key] = row.config_value;
    }
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

export async function getLogs(limit = 50, offset = 0): Promise<any[]> {
  try {
    const [rows] = await query(
      `SELECT * FROM modulos_biury_8_logs
       WHERE LOWER(product_name) LIKE ? OR LOWER(payload_raw) LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      ['%biurybox trimestre%', '%biurybox trimestre%', limit, offset]
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

export async function getStats(): Promise<{ total: number; success: number; error: number; filtered: number }> {
  try {
    const [rows] = await query<{ total: number; success: number; error: number; filtered: number }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
         SUM(CASE WHEN status = 'filtered' THEN 1 ELSE 0 END) as filtered
       FROM modulos_biury_8_logs
       WHERE LOWER(product_name) LIKE ? OR LOWER(payload_raw) LIKE ?`,
      ['%biurybox trimestre%', '%biurybox trimestre%']
    );
    return rows[0] || { total: 0, success: 0, error: 0, filtered: 0 };
  } catch (e) {
    console.error('[MOD8-STATS] Error:', e);
    return { total: 0, success: 0, error: 0, filtered: 0 };
  }
}
