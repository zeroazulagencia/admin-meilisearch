/**
 * MÓDULO 1 - SUVI LEADS
 * Orquestador del flujo completo de procesamiento de leads
 */
import { consultFacebookLead, cleanFacebookData, processWithAI, classifyCampaign } from './module1-processors';
import {
  upsertSalesforceAccount,
  getSalesforceAccount,
  getSalesforceGroup,
  selectRandomOwner,
  getSalesforceProjects,
  selectValidProject,
  upsertSalesforceOpportunity,
} from './module1-salesforce';

/**
 * Procesa un lead completamente desde Facebook hasta Salesforce
 * Pasos: META → Limpieza → IA → Salesforce (cuenta + oportunidad)
 */
export async function processLeadComplete(leadId: number, leadgenId: string, formId: string) {
  try {
    console.log(`[ORCHESTRATOR] Iniciando proceso completo para lead ${leadId}`);

    // PASO 2: Consultar Facebook Graph API
    const facebookData = await consultFacebookLead(leadgenId, leadId);
    console.log(`[ORCHESTRATOR] Datos de Facebook obtenidos`);

    // PASO 3: Limpiar datos
    const cleanedData = await cleanFacebookData(facebookData, leadId);
    console.log(`[ORCHESTRATOR] Datos limpiados`);

    // PASO 4: Procesar con IA
    const enrichedData = await processWithAI(cleanedData, leadId);
    console.log(`[ORCHESTRATOR] Datos enriquecidos con IA`);

    // PASO 5: Clasificar campaña
    const campaignName = cleanedData['Nombre de la Campaña'] || '';
    const classification = await classifyCampaign(campaignName, formId, leadId);
    console.log(`[ORCHESTRATOR] Campaña clasificada:`, classification);

    // PASO 6: Crear/actualizar cuenta en Salesforce
    const accountResult = await upsertSalesforceAccount(enrichedData, classification.origen, leadId);
    console.log(`[ORCHESTRATOR] Cuenta Salesforce creada/actualizada:`, accountResult.id);

    // PASO 7: Obtener cuenta completa
    const account = await getSalesforceAccount(accountResult.id, leadId);
    console.log(`[ORCHESTRATOR] Cuenta obtenida:`, account.Name);

    // PASO 8: Obtener grupo de usuarios
    const groupMembers = await getSalesforceGroup(leadId);
    console.log(`[ORCHESTRATOR] ${groupMembers.length} usuarios encontrados en el grupo`);

    // PASO 9: Seleccionar owner aleatorio
    const ownerId = selectRandomOwner(groupMembers);
    console.log(`[ORCHESTRATOR] Owner seleccionado:`, ownerId);

    // PASO 10: Obtener proyectos
    const projects = await getSalesforceProjects(leadId);
    console.log(`[ORCHESTRATOR] ${projects.length} proyectos encontrados`);

    // PASO 11: Seleccionar proyecto válido
    const projectId = await selectValidProject(projects);
    console.log(`[ORCHESTRATOR] Proyecto seleccionado:`, projectId);

    // PASO 12: Crear oportunidad
    const campaignInfo = `Campaña: ${campaignName}, Anuncio: ${facebookData.ad_name || 'N/A'}`;
    const opportunity = await upsertSalesforceOpportunity(
      account.Id,
      account.Name,
      enrichedData,
      ownerId,
      projectId,
      classification.origen,
      classification.tipo_oportunidad || '',
      campaignInfo,
      leadId
    );

    console.log(`[ORCHESTRATOR] ✅ Proceso completado. Oportunidad creada:`, opportunity.id);

    return {
      success: true,
      leadId,
      accountId: account.Id,
      opportunityId: opportunity.id,
    };
  } catch (error: any) {
    console.error(`[ORCHESTRATOR] ❌ Error en proceso de lead ${leadId}:`, error);
    throw error;
  }
}

// Mantener función antigua por compatibilidad (sin Salesforce)
export async function processLeadFlow(leadId: number, leadgenId: string, formId: string) {
  try {
    console.log(`[ORCHESTRATOR] Iniciando proceso para lead ${leadId}`);

    // PASO 2: Consultar Facebook Graph API
    const facebookData = await consultFacebookLead(leadgenId, leadId);
    console.log(`[ORCHESTRATOR] Datos de Facebook obtenidos`);

    // PASO 3: Limpiar datos
    const cleanedData = await cleanFacebookData(facebookData, leadId);
    console.log(`[ORCHESTRATOR] Datos limpiados`);

    // PASO 4: Procesar con IA
    const enrichedData = await processWithAI(cleanedData, leadId);
    console.log(`[ORCHESTRATOR] Datos enriquecidos con IA`);

    // PASO 5: Clasificar campaña
    const campaignName = cleanedData['Nombre de la Campaña'] || '';
    const classification = await classifyCampaign(campaignName, formId, leadId);
    console.log(`[ORCHESTRATOR] Campaña clasificada:`, classification);

    console.log(`[ORCHESTRATOR] ✅ Proceso completado (sin Salesforce)`);

    return {
      success: true,
      leadId,
      accountId: null,
      opportunityId: null,
    };
  } catch (error: any) {
    console.error(`[ORCHESTRATOR] ❌ Error en proceso de lead ${leadId}:`, error);
    throw error;
  }
}
