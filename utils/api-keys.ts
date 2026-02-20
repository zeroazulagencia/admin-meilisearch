/**
 * Utilidad centralizada para obtener API keys
 * Las API keys se almacenan en la tabla `api_keys`
 */
import { query } from '@/utils/db';

export async function getApiKey(serviceName: string): Promise<string | null> {
  try {
    const [rows] = await query<any>(
      'SELECT api_key FROM api_keys WHERE service_name = ? AND is_active = 1 LIMIT 1',
      [serviceName]
    );
    return rows[0]?.api_key || null;
  } catch (e) {
    console.error(`[API-KEYS] Error obteniendo key para ${serviceName}:`, e);
    return null;
  }
}

export async function setApiKey(serviceName: string, apiKey: string): Promise<void> {
  await query<any>(
    `INSERT INTO api_keys (service_name, api_key) 
     VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE api_key = ?, updated_at = NOW()`,
    [serviceName, apiKey, apiKey]
  );
}
