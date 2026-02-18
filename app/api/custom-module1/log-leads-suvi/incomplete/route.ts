/**
 * MÓDULO 1 - SUVI LEADS
 * API: Obtener leads incompletos (menos de 4 pasos)
 */
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'bitnami',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'admin_dworkers',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function GET() {
  try {
    // Obtener leads que NO estén completados (4/4)
    // Un lead está completado si tiene: facebook_cleaned_data, ai_enriched_data, y salesforce_opportunity_id
    const [rows]: any = await pool.query(
      `SELECT 
        id, 
        leadgen_id, 
        form_id,
        facebook_cleaned_data,
        ai_enriched_data,
        salesforce_opportunity_id,
        processing_status,
        current_step,
        error_message
       FROM modulos_suvi_12_leads 
       WHERE processing_status != 'completado'
       OR salesforce_opportunity_id IS NULL
       OR salesforce_opportunity_id = ''
       ORDER BY received_at DESC
       LIMIT 100`
    );

    return NextResponse.json({
      ok: true,
      leads: rows,
      count: rows.length
    });
  } catch (error: any) {
    console.error('[INCOMPLETE LEADS] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
