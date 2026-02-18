/**
 * MÓDULO 1 - SUVI LEADS
 * Configuración y utilidades de base de datos para el módulo
 */
import { query } from '@/utils/db';

// Obtener configuración del módulo
export async function getConfig(key: string): Promise<string | null> {
  try {
    const [rows] = await query<any>(
      'SELECT config_value FROM modulos_suvi_12_config WHERE config_key = ? LIMIT 1',
      [key]
    );
    return rows[0]?.config_value || null;
  } catch (e) {
    console.error(`[CONFIG] Error obteniendo ${key}:`, e);
    return null;
  }
}

// Actualizar o insertar configuración
export async function setConfig(key: string, value: string): Promise<void> {
  try {
    await query<any>(
      `INSERT INTO modulos_suvi_12_config (config_key, config_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE config_value = ?`,
      [key, value, value]
    );
  } catch (e) {
    console.error(`[CONFIG] Error actualizando ${key}:`, e);
    throw e;
  }
}

// Obtener todas las configuraciones
export async function getAllConfig(): Promise<Record<string, string>> {
  try {
    const [rows] = await query<any>(
      'SELECT config_key, config_value FROM modulos_suvi_12_config'
    );
    const config: Record<string, string> = {};
    rows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });
    return config;
  } catch (e) {
    console.error('[CONFIG] Error obteniendo configuraciones:', e);
    return {};
  }
}

// Actualizar log de lead
export async function updateLeadLog(
  leadId: number,
  updates: {
    processing_status?: string;
    current_step?: string;
    error_message?: string;
    error_step?: string;
    [key: string]: any;
  }
) {
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    if (typeof value === 'object' && value !== null) {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  values.push(leadId);

  await query<any>(
    `UPDATE modulos_suvi_12_leads SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

// Crear lead inicial
export async function createLeadLog(data: {
  leadgen_id: string;
  page_id?: string;
  form_id?: string;
  campaign_name?: string;
  ad_name?: string;
  facebook_raw_data?: any;
}): Promise<number> {
  try {
    const [result] = await query<any>(
      `INSERT INTO modulos_suvi_12_leads (
        leadgen_id, page_id, form_id, campaign_name, ad_name,
        facebook_raw_data, processing_status, current_step
      ) VALUES (?, ?, ?, ?, ?, ?, 'recibido', 'Lead recibido desde Facebook')`,
      [
        data.leadgen_id,
        data.page_id || null,
        data.form_id || null,
        data.campaign_name || null,
        data.ad_name || null,
        JSON.stringify(data.facebook_raw_data || {}),
      ]
    );

    return (result as any).insertId;
  } catch (error: any) {
    // Si es error de duplicado (ER_DUP_ENTRY), buscar el ID existente
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`[CONFIG] Lead ${data.leadgen_id} ya existe, buscando ID...`);
      const [rows] = await query<any>(
        `SELECT id FROM modulos_suvi_12_leads WHERE leadgen_id = ? LIMIT 1`,
        [data.leadgen_id]
      );
      
      if (rows && rows.length > 0) {
        const existingId = rows[0].id;
        console.log(`[CONFIG] Lead duplicado encontrado con ID: ${existingId}`);
        return existingId;
      }
    }
    
    // Si es otro error, lanzarlo
    throw error;
  }
}
