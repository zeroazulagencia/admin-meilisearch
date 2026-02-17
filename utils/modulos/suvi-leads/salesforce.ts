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
      Telefono_Casa__c: enrichedData.phone,
      Telefono_Oficina__c: enrichedData.phone,
      // Correo_Electr_nico__c NO se incluye aquí porque se usa como External ID en la URL
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
    const wasCreated = response.status === 201;

    await updateLeadLog(leadId, {
      salesforce_account_id: result.id,
      salesforce_account_created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return { ...result, wasCreated };
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

// Buscar oportunidad existente para cuenta + proyecto + mes actual
export async function findExistingOpportunity(accountId: string, projectId: string, leadId: number) {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();
    
    // Buscar oportunidades de esta cuenta, este proyecto, creadas este mes
    const soql = `SELECT Id, Name, StageName FROM Opportunity 
                  WHERE AccountId = '${accountId}' 
                  AND Proyecto__c = '${projectId}' 
                  AND CreatedDate = THIS_MONTH 
                  LIMIT 1`;
    
    const response = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    
    if (result.totalSize > 0) {
      return result.records[0]; // Retorna la oportunidad existente
    }
    
    return null; // No hay oportunidad este mes para este proyecto
  } catch (e: any) {
    console.error('[SALESFORCE] Error buscando oportunidad:', e);
    return null; // En caso de error, asumimos que no existe
  }
}

// PASO 12: Crear o actualizar oportunidad en Salesforce
export async function upsertSalesforceOpportunity(
  accountId: string,
  accountName: string,
  enrichedData: any,
  ownerId: string,
  projectId: string,
  origen: string,
  opportunityTypeId: string,
  campaignInfo: string,
  leadId: number,
  existingOpportunityId: string | null = null  // Nuevo parámetro opcional
) {
  try {
    // Prioridad 1: Si el lead ya tiene un opportunity_id en BD, actualizar esa
    let opportunityIdToUpdate = existingOpportunityId;
    
    // Prioridad 2: Si no tiene ID en BD, buscar si existe otra oportunidad del mismo proyecto/mes
    if (!opportunityIdToUpdate) {
      const existingOpportunity = await findExistingOpportunity(accountId, projectId, leadId);
      if (existingOpportunity) {
        opportunityIdToUpdate = existingOpportunity.Id;
      }
    }
    
    const isUpdate = !!opportunityIdToUpdate;
    
    await updateLeadLog(leadId, {
      processing_status: 'creando_oportunidad',
      current_step: isUpdate ? 'Actualizando oportunidad en Salesforce' : 'Creando oportunidad en Salesforce',
    });

    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 30);
    const closeDateStr = closeDate.toISOString().split('T')[0] + 'T00:00:00';

    const opportunityData: any = {
      Name: accountName,
      AccountId: accountId,
      CloseDate: closeDateStr,
      StageName: 'Nuevo',
      OwnerId: ownerId,
      LeadSource: origen,
      Description: `${campaignInfo}, ${enrichedData.description}`,
      Proyecto__c: projectId,
    };

    // Solo incluir RecordTypeId si existe y no está vacío
    if (opportunityTypeId && opportunityTypeId.trim() !== '') {
      opportunityData.RecordTypeId = opportunityTypeId;
    }

    let response;
    
    if (isUpdate) {
      // Actualizar oportunidad existente
      response = await fetch(
        `${instanceUrl}/services/data/v60.0/sobjects/Opportunity/${opportunityIdToUpdate}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(opportunityData),
        }
      );
    } else {
      // Crear nueva oportunidad (Intento 1: con todos los campos)
      response = await fetch(
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
    }

    // Si falla por RecordTypeId inválido, reintentar sin ese campo
    if (!response.ok) {
      const error = await response.json();
      
      // Si el error es INVALID_CROSS_REFERENCE_KEY en RecordTypeId, reintentar sin ese campo
      if (!isUpdate && 
          error[0]?.errorCode === 'INVALID_CROSS_REFERENCE_KEY' && 
          error[0]?.fields?.includes('RecordTypeId')) {
        
        console.log('[SALESFORCE] RecordTypeId inválido, reintentando sin ese campo...');
        
        // Remover RecordTypeId
        delete opportunityData.RecordTypeId;
        
        // Actualizar descripción para indicar que se usó fallback
        opportunityData.Description += ' [RecordType omitido - se usará el default de Salesforce]';
        
        // Intento 2: Sin RecordTypeId
        response = await fetch(
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
          const retryError = await response.json();
          throw new Error(`Salesforce error (después de fallback): ${JSON.stringify(retryError)}`);
        }
      } else {
        // Otro tipo de error, lanzar inmediatamente
        throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
      }
    }

    let opportunityId;
    
    if (isUpdate) {
      // En PATCH, Salesforce retorna 204 sin body
      opportunityId = opportunityIdToUpdate;
    } else {
      // En POST, Salesforce retorna el objeto creado
      const result = await response.json();
      opportunityId = result.id;
    }

    const processingTime = Math.floor((Date.now() - new Date(leadId).getTime()) / 1000);

    await updateLeadLog(leadId, {
      salesforce_opportunity_id: opportunityId,
      salesforce_owner_id: ownerId,
      salesforce_project_id: projectId,
      processing_status: 'completado',
      current_step: isUpdate ? 'Oportunidad actualizada exitosamente' : 'Oportunidad creada exitosamente',
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      salesforce_opportunity_created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      processing_time_seconds: processingTime,
    });

    return {
      id: opportunityId,
      wasCreated: !isUpdate
    };
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Creando oportunidad Salesforce',
    });
    throw e;
  }
}
