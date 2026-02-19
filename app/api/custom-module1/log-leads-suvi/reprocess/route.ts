/**
 * MÓDULO 1 - SUVI LEADS
 * API: Reprocesar lead completo usando orchestrator
 */
import { NextRequest, NextResponse } from 'next/server';
import { processLeadComplete } from '@/utils/modulos/suvi-leads/module1-orchestrator';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { ok: false, error: 'leadId es requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del lead
    const [rows]: any = await pool.query(
      'SELECT id, leadgen_id, form_id FROM modulos_suvi_12_leads WHERE id = ?',
      [leadId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    const lead = rows[0];

    // Resetear estado para reprocesar
    await pool.query(
      `UPDATE modulos_suvi_12_leads 
       SET processing_status = 'recibido', 
           current_step = 'Reprocesando lead',
           error_message = NULL,
           error_step = NULL
       WHERE id = ?`,
      [leadId]
    );

    // Procesar flujo completo con Salesforce
    processLeadComplete(lead.id, lead.leadgen_id, lead.form_id).catch((e) => {
      console.error('[REPROCESS] Error:', e);
    });

    return NextResponse.json({
      ok: true,
      message: `Lead ${leadId} enviado a reprocesar`,
      leadgen_id: lead.leadgen_id
    });
  } catch (error: any) {
    console.error('Error en reprocess:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
