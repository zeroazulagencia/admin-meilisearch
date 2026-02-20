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
  findExistingOwnerForAccount,
} from './module1-salesforce';
import { updateLeadLog } from './module1-config';

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

    // Verificar si el formulario contiene "Pauta interna" - omitir Salesforce
    const formName = enrichedData.form_name || '';
    if (formName.toLowerCase().includes('pauta interna')) {
      console.log(`[ORCHESTRATOR] Lead ${leadId} omitido: formulario "${formName}" contiene "Pauta interna"`);
      await updateLeadLog(leadId, {
        processing_status: 'omitido_interno',
        current_step: 'Omitido - Formulario de Pauta Interna',
        completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
      return {
        success: true,
        leadId,
        accountId: null,
        opportunityId: null,
        omitted: true,
      };
    }

    // PASO 6: Crear/actualizar cuenta en Salesforce
    const accountResult = await upsertSalesforceAccount(enrichedData, classification.origen, leadId);
    console.log(`[ORCHESTRATOR] Cuenta Salesforce creada/actualizada:`, accountResult.id);

    // PASO 7: Obtener cuenta completa
    const account = await getSalesforceAccount(accountResult.id, leadId);
    console.log(`[ORCHESTRATOR] Cuenta obtenida:`, account.Name);

    // PASO 8: Obtener grupo de usuarios
    const groupMembers = await getSalesforceGroup(leadId);
    console.log(`[ORCHESTRATOR] ${groupMembers.length} usuarios encontrados en el grupo`);

    // PASO 9: Seleccionar owner - priorizar owner existente de leads anteriores
    let ownerId: string;
    const existingOwnerId = await findExistingOwnerForAccount(accountResult.id, leadId);
    if (existingOwnerId) {
      ownerId = existingOwnerId;
      console.log(`[ORCHESTRATOR] Owner reutilizado de lead anterior:`, ownerId);
    } else {
      ownerId = selectRandomOwner(groupMembers);
      console.log(`[ORCHESTRATOR] Owner seleccionado aleatoriamente:`, ownerId);
    }

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
