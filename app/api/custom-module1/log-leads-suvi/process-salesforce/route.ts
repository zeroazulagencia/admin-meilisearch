/**
 * MÓDULO 1 - SUVI LEADS
 * API: Procesar y enviar lead a Salesforce
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateLeadLog } from '@/utils/modulos/suvi-leads/module1-config';
import {
  upsertSalesforceAccount,
  getSalesforceAccount,
  getSalesforceGroup,
  selectRandomOwner,
  getSalesforceProjects,
  selectValidProject,
  upsertSalesforceOpportunity,
} from '@/utils/modulos/suvi-leads/module1-salesforce';
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
      `SELECT id, leadgen_id, form_id, campaign_name, ad_name, 
              ai_enriched_data, campaign_type, opportunity_type_id,
              salesforce_opportunity_id, salesforce_account_id
       FROM modulos_suvi_12_leads WHERE id = ?`,
      [leadId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    const lead = rows[0];

    // Verificar que tenga datos enriquecidos
    if (!lead.ai_enriched_data) {
      return NextResponse.json(
        { ok: false, error: 'El lead debe ser enriquecido con IA primero' },
        { status: 400 }
      );
    }

    const enrichedData = typeof lead.ai_enriched_data === 'string' 
      ? JSON.parse(lead.ai_enriched_data) 
      : lead.ai_enriched_data;

    console.log(`[PROCESS-SALESFORCE] Iniciando proceso para lead ${leadId}`);

    // PASO 6: Crear/actualizar cuenta en Salesforce
    await updateLeadLog(leadId, {
      processing_status: 'creando_cuenta',
      current_step: 'Creando cuenta en Salesforce',
    });

    const accountResult = await upsertSalesforceAccount(
      enrichedData, 
      lead.campaign_type || 'Pauta Agencia', 
      leadId
    );
    console.log(`[PROCESS-SALESFORCE] Cuenta creada/actualizada:`, accountResult.id);

    // PASO 7: Obtener cuenta completa
    const account = await getSalesforceAccount(accountResult.id, leadId);
    console.log(`[PROCESS-SALESFORCE] Cuenta obtenida:`, account.Name);

    // PASO 8: Obtener grupo de usuarios
    const groupMembers = await getSalesforceGroup(leadId);
    console.log(`[PROCESS-SALESFORCE] ${groupMembers.length} usuarios en grupo`);

    // PASO 9: Seleccionar owner aleatorio
    const ownerId = selectRandomOwner(groupMembers);
    console.log(`[PROCESS-SALESFORCE] Owner seleccionado:`, ownerId);

    // PASO 10: Obtener proyectos
    const projects = await getSalesforceProjects(leadId);
    console.log(`[PROCESS-SALESFORCE] ${projects.length} proyectos encontrados`);

    // PASO 11: Seleccionar proyecto válido
    const projectId = await selectValidProject(projects);
    console.log(`[PROCESS-SALESFORCE] Proyecto seleccionado:`, projectId);

    // PASO 12: Crear oportunidad
    await updateLeadLog(leadId, {
      processing_status: 'creando_oportunidad',
      current_step: 'Creando oportunidad en Salesforce',
    });

    const campaignInfo = `Campaña: ${lead.campaign_name || 'N/A'}, Anuncio: ${lead.ad_name || 'N/A'}`;
    const opportunity = await upsertSalesforceOpportunity(
      account.Id,
      account.Name,
      enrichedData,
      ownerId,
      projectId,
      lead.campaign_type || 'Pauta Agencia',
      lead.opportunity_type_id || '',
      campaignInfo,
      leadId,
      lead.salesforce_opportunity_id || null  // Pasar el ID existente si hay
    );

    console.log(`[PROCESS-SALESFORCE] Oportunidad procesada:`, opportunity.id, 'wasCreated:', opportunity.wasCreated);

    // Marcar como completado
    await updateLeadLog(leadId, {
      processing_status: 'completado',
      current_step: 'Lead procesado completamente',
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return NextResponse.json({
      ok: true,
      message: 'Lead procesado exitosamente en Salesforce',
      accountId: account.Id,
      accountName: account.Name,
      opportunityId: opportunity.id,
      accountAction: accountResult.wasCreated ? 'created' : 'updated',
      opportunityAction: opportunity.wasCreated ? 'created' : 'updated',
    });
  } catch (error: any) {
    console.error('[PROCESS-SALESFORCE] Error:', error);
    
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
