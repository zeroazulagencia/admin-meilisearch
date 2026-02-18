/**
 * MÓDULO 1 - SUVI LEADS
 * API: Consultar y limpiar datos de Facebook/META
 */
import { NextRequest, NextResponse } from 'next/server';
import { consultFacebookLead, cleanFacebookData } from '@/utils/modulos/suvi-leads/module1-processors';
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
      'SELECT leadgen_id FROM modulos_suvi_12_leads WHERE id = ?',
      [leadId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    const lead = rows[0];

    // Paso 1: Consultar Facebook
    const rawData = await consultFacebookLead(lead.leadgen_id, leadId);
    
    // Paso 2: Limpiar datos
    const cleanedData = await cleanFacebookData(rawData, leadId);

    return NextResponse.json({
      ok: true,
      message: 'Datos de META consultados y limpiados',
      cleanedData
    });
  } catch (error: any) {
    console.error('[PROCESS-META] Error:', error);
    
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
