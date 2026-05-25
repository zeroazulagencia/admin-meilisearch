import { query } from '@/utils/db';

const TABLE = 'modulos_monitor_web_cfa_18_logs';

export interface CheckLogInput {
  statusCode: number | null;
  responseTimeMs: number | null;
  contentValid: boolean;
  contentLength: number | null;
  errorMessage: string | null;
  wafDetected: boolean;
}

export async function insertCheckLog(input: CheckLogInput): Promise<void> {
  await query(
    `INSERT INTO ${TABLE} (
      status_code, response_time_ms, content_valid,
      content_length, error_message, waf_detected
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.statusCode,
      input.responseTimeMs,
      input.contentValid ? 1 : 0,
      input.contentLength,
      input.errorMessage || null,
      input.wafDetected ? 1 : 0,
    ]
  );
}

export async function clearLogs(): Promise<void> {
  await query(`DELETE FROM ${TABLE}`);
}

export async function listLogs(limit: number = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));

  const [rows] = await query<any>(
    `SELECT
      id, status_code, response_time_ms, content_valid,
      content_length, error_message, waf_detected, checked_at
     FROM ${TABLE}
     ORDER BY checked_at DESC
     LIMIT ?`,
    [safeLimit]
  );

  return (rows || []).map((row: any) => ({
    ...row,
    content_valid: !!row.content_valid,
    waf_detected: !!row.waf_detected,
  }));
}

export async function getStats() {
  const [totalRow] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM ${TABLE}`
  );
  const total = totalRow[0]?.total || 0;

  const [okRow] = await query<{ ok_count: number }>(
    `SELECT COUNT(*) as ok_count FROM ${TABLE}
     WHERE status_code = 200 AND content_valid = 1 AND waf_detected = 0`
  );
  const okCount = okRow[0]?.ok_count || 0;

  const [downRow] = await query<{ down_count: number }>(
    `SELECT COUNT(*) as down_count FROM ${TABLE}
     WHERE status_code != 200 OR content_valid = 0 OR waf_detected = 1`
  );
  const downCount = downRow[0]?.down_count || 0;

  const [wafRow] = await query<{ waf_count: number }>(
    `SELECT COUNT(*) as waf_count FROM ${TABLE} WHERE waf_detected = 1`
  );
  const wafCount = wafRow[0]?.waf_count || 0;

  const [lastRow] = await query<any>(
    `SELECT status_code, content_valid, waf_detected, checked_at
     FROM ${TABLE}
     ORDER BY checked_at DESC
     LIMIT 1`
  );
  const lastCheck = lastRow[0] || null;

  // Últimas 24h de checks para mini-gráfica
  const [recent] = await query<any>(
    `SELECT status_code, content_valid, waf_detected, checked_at, response_time_ms
     FROM ${TABLE}
     WHERE checked_at >= NOW() - INTERVAL 24 HOUR
     ORDER BY checked_at DESC`
  );

  return {
    total,
    okCount,
    downCount,
    wafCount,
    uptimePercent: total > 0 ? Math.round((okCount / total) * 10000) / 100 : 100,
    lastCheck,
    recentHistory: recent || [],
  };
}