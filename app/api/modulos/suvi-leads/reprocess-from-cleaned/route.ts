import { NextRequest, NextResponse } from 'next/server';
import { processWithAI } from '@/utils/modulos/suvi-leads/processors';
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
      'SELECT id, leadgen_id, form_id, facebook_cleaned_data FROM modulos_suvi_12_leads WHERE id = ?',
      [leadId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    const lead = rows[0];

    if (!lead.facebook_cleaned_data) {
      return NextResponse.json(
        { ok: false, error: 'No hay datos limpios disponibles para reprocesar' },
        { status: 400 }
      );
    }

    const cleanedData = typeof lead.facebook_cleaned_data === 'string' 
      ? JSON.parse(lead.facebook_cleaned_data) 
      : lead.facebook_cleaned_data;

    // PASO 4: Procesar con IA
    const enrichedData = await processWithAI(cleanedData, lead.id);
    console.log(`[REPROCESS-CLEANED] Datos enriquecidos con IA para lead ${lead.id}`);

    // processWithAI ya actualiza el estado a 'enriqueciendo_ia' y guarda los datos
    console.log(`[REPROCESS-CLEANED] Lead ${lead.id} reprocesado exitosamente`);

    return NextResponse.json({
      ok: true,
      message: `Lead ${leadId} reprocesado exitosamente desde datos limpios`,
      enrichedData
    });
  } catch (error: any) {
    console.error('[REPROCESS-CLEANED] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
