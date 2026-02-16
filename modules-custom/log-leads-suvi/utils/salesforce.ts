import { getConfig, updateLeadLog } from './config';
import { getSalesforceTokens } from './salesforce-oauth';

// PASO 6: Crear o actualizar cuenta en Salesforce
export async function upsertSalesforceAccount(enrichedData: any, origen: string, leadId: number) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'creando_cuenta',
      current_step: 'Creando/actualizando cuenta en Salesforce',
    });

    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const accountData = {
      Name: enrichedData.fullname,
      AccountSource: origen,
      Phone: enrichedData.phone,
      Prefijo_M_vil__c: `${enrichedData.pais_salesforce}(${enrichedData.prefijo})`,
      Prefijo_Telefono__c: `${enrichedData.pais_salesforce}(${enrichedData.prefijo})`,
      Correo_Electr_nico__c: enrichedData.email,
      Telefono_Casa__c: enrichedData.phone,
      Telefono_Oficina__c: enrichedData.phone,
    };

    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/sobjects/Account/Correo_Electr_nico__c/${enrichedData.email}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(accountData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();

    await updateLeadLog(leadId, {
      salesforce_account_id: result.id,
      salesforce_account_created_at: new Date(),
    });

    return result;
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Creando cuenta Salesforce',
    });
    throw e;
  }
}

// PASO 7: Obtener cuenta de Salesforce
export async function getSalesforceAccount(accountId: string, leadId: number) {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/sobjects/Account/${accountId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Salesforce error: ${response.statusText}`);
    }

    const account = await response.json();

    await updateLeadLog(leadId, {
      salesforce_account_name: account.Name,
    });

    return account;
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Obteniendo cuenta Salesforce',
    });
    throw e;
  }
}

// PASO 8: Obtener grupo de usuarios de Salesforce
export async function getSalesforceGroup(leadId: number) {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();
    const groupId = await getConfig('salesforce_group_id');

    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=SELECT+UserOrGroupId+FROM+GroupMember+WHERE+GroupId='${groupId}'`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Salesforce error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.records || [];
  } catch (e: any) {
    console.error('[SALESFORCE] Error obteniendo grupo:', e);
    throw e;
  }
}

// PASO 9: Seleccionar owner aleatorio
export function selectRandomOwner(groupMembers: any[]) {
  if (groupMembers.length === 0) {
    throw new Error('No hay usuarios disponibles en el grupo');
  }
  const randomIndex = Math.floor(Math.random() * groupMembers.length);
  return groupMembers[randomIndex].UserOrGroupId;
}

// PASO 10: Obtener proyectos de Salesforce
export async function getSalesforceProjects(leadId: number) {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=SELECT+Id,Name+FROM+Proyecto__c`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Salesforce error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.records || [];
  } catch (e: any) {
    console.error('[SALESFORCE] Error obteniendo proyectos:', e);
    return [];
  }
}

// PASO 11: Seleccionar proyecto aleatorio válido
export async function selectValidProject(projects: any[]) {
  const validIds = JSON.parse(await getConfig('valid_project_ids') || '[]');
  
  if (projects.length === 0) {
    // Si no hay proyectos, usar uno válido aleatorio
    const randomIndex = Math.floor(Math.random() * validIds.length);
    return validIds[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * projects.length);
  let selectedId = projects[randomIndex].Id;

  // Verificar si está en la lista válida
  if (!validIds.includes(selectedId)) {
    const fallbackIndex = Math.floor(Math.random() * validIds.length);
    selectedId = validIds[fallbackIndex];
  }

  return selectedId;
}

// PASO 12: Crear oportunidad en Salesforce
export async function createSalesforceOpportunity(
  accountId: string,
  accountName: string,
  enrichedData: any,
  ownerId: string,
  projectId: string,
  origen: string,
  opportunityTypeId: string,
  campaignInfo: string,
  leadId: number
) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'creando_oportunidad',
      current_step: 'Creando oportunidad en Salesforce',
    });

    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 30);
    const closeDateStr = closeDate.toISOString().split('T')[0] + 'T00:00:00';

    const opportunityData = {
      Name: accountName,
      AccountId: accountId,
      CloseDate: closeDateStr,
      StageName: 'Nuevo',
      OwnerId: ownerId,
      LeadSource: origen,
      Description: `${campaignInfo}, ${enrichedData.description}`,
      Proyecto__c: projectId,
      RecordTypeId: opportunityTypeId,
    };

    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/sobjects/Opportunity`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(opportunityData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();

    const processingTime = Math.floor((Date.now() - new Date(leadId).getTime()) / 1000);

    await updateLeadLog(leadId, {
      salesforce_opportunity_id: result.id,
      salesforce_owner_id: ownerId,
      salesforce_project_id: projectId,
      processing_status: 'completado',
      current_step: 'Oportunidad creada exitosamente',
      completed_at: new Date(),
      salesforce_opportunity_created_at: new Date(),
      processing_time_seconds: processingTime,
    });

    return result;
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Creando oportunidad Salesforce',
    });
    throw e;
  }
}
