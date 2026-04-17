/**
 * MÓDULO 1 - SUVI LEADS
 * Integración con Salesforce: cuentas y oportunidades
 */
import { getConfig, updateLeadLog } from './module1-config';
import { getSalesforceTokens } from './module1-salesforce-oauth';
import { query } from '@/utils/db';

// Buscar owner existente de leads anteriores para la misma cuenta
export async function findExistingOwnerForAccount(accountId: string, currentLeadId: number): Promise<string | null> {
  try {
    const [rows] = await query<any>(
      `SELECT salesforce_owner_id FROM modulos_suvi_12_leads 
       WHERE salesforce_account_id = ? 
       AND salesforce_owner_id IS NOT NULL 
       AND salesforce_owner_id != '' 
       AND id != ?
       ORDER BY completed_at DESC LIMIT 1`,
      [accountId, currentLeadId]
    );
    
    if (rows && rows.length > 0 && rows[0].salesforce_owner_id) {
      console.log(`[SALESFORCE] Owner existente encontrado para cuenta ${accountId}: ${rows[0].salesforce_owner_id}`);
      return rows[0].salesforce_owner_id;
    }
    
    return null;
  } catch (e: any) {
    console.error('[SALESFORCE] Error buscando owner existente:', e?.message);
    return null;
  }
}

async function updateAccountById(
  accountId: string,
  body: Record<string, any>,
  accessToken: string,
  instanceUrl: string
): Promise<boolean> {
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/sobjects/Account/${accountId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    }
  );
  return res.ok || res.status === 204;
}

async function resolveMultipleAccounts(
  urls: string[],
  accountData: Record<string, any>,
  accessToken: string,
  instanceUrl: string,
  leadId: number
): Promise<{ id: string; wasCreated: boolean }> {
  const accountIds = urls
    .map((u) => { const m = u.match(/Account\/([A-Za-z0-9]+)/); return m ? m[1] : null; })
    .filter(Boolean) as string[];

  if (accountIds.length === 0) throw new Error('No se pudieron extraer IDs de las cuentas duplicadas');

  const idList = accountIds.map((id) => `'${id}'`).join(',');
  const soql = `SELECT AccountId, COUNT(Id) cnt FROM Opportunity WHERE AccountId IN (${idList}) GROUP BY AccountId`;
  const qUrl = `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`;
  const qRes = await fetch(qUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const oppCounts: Record<string, number> = {};
  if (qRes.ok) {
    const qData = await qRes.json();
    for (const rec of qData.records || []) oppCounts[rec.AccountId] = rec.cnt;
  }

  const detailSoql = `SELECT Id, CreatedDate FROM Account WHERE Id IN (${idList}) ORDER BY CreatedDate ASC`;
  const dUrl = `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(detailSoql)}`;
  const dRes = await fetch(dUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  let sorted = accountIds;
  if (dRes.ok) {
    const dData = await dRes.json();
    const records: any[] = dData.records || [];
    records.sort((a, b) => {
      const aOpp = oppCounts[a.Id] || 0;
      const bOpp = oppCounts[b.Id] || 0;
      if (aOpp !== bOpp) return bOpp - aOpp;
      return new Date(a.CreatedDate).getTime() - new Date(b.CreatedDate).getTime();
    });
    sorted = records.map((r) => r.Id);
  }

  const winnerId = sorted[0];
  const losers = sorted.filter((id) => id !== winnerId);
  console.log(`[SALESFORCE] Cuenta ganadora de ${accountIds.length} duplicadas: ${winnerId} (opps: ${oppCounts[winnerId] || 0}). Limpiando email de ${losers.length} perdedoras.`);

  for (const loserId of losers) {
    try {
      await updateAccountById(loserId, { Correo_Electr_nico__c: `merged-${loserId}@suvivienda.com` }, accessToken, instanceUrl);
      console.log(`[SALESFORCE] Email limpiado de cuenta perdedora: ${loserId}`);
    } catch (e: any) {
      console.error(`[SALESFORCE] No se pudo limpiar email de ${loserId}:`, e?.message);
    }
  }

  await updateAccountById(winnerId, accountData, accessToken, instanceUrl);
  await updateLeadLog(leadId, {
    salesforce_account_id: winnerId,
    salesforce_account_created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
  return { id: winnerId, wasCreated: false };
}

async function resolveByPhone(
  phone: string,
  accountData: Record<string, any>,
  accessToken: string,
  instanceUrl: string,
  leadId: number
): Promise<{ id: string; wasCreated: boolean } | null> {
  const searchQuery = `SELECT Id FROM Account WHERE Phone = '${phone}' LIMIT 1`;
  const searchUrl = `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(searchQuery)}`;
  const searchResponse = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.records && searchResult.records.length > 0) {
      const existingAccountId = searchResult.records[0].Id;
      console.log('[SALESFORCE] Cuenta encontrada por teléfono:', existingAccountId);

      const ok = await updateAccountById(existingAccountId, accountData, accessToken, instanceUrl);
      if (ok) {
        await updateLeadLog(leadId, {
          salesforce_account_id: existingAccountId,
          salesforce_account_created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
        return { id: existingAccountId, wasCreated: false };
      }
    }
  }
  return null;
}

// Normalizar prefijo de teléfono para Salesforce
function normalizePrefijoColombia(pais: string, prefijo: string): { paisCorregido: string; prefijoCorregido: string } {
  const p = (pais || '').toLowerCase().trim();
  const c = (prefijo || '').replace(/\s+/g, '').toLowerCase().trim();

  const mapa: Record<string, string> = {
    'colombia(+1)': 'Colombia(+57)',
    'colombia +1': 'Colombia(+57)',
    'colombia(+57)': 'Colombia(+57)',
    'colombia': 'Colombia(+57)',
    'colombia +57': 'Colombia(+57)',
    'méxico(+1)': 'Mexico(+52)',
    'mexico(+1)': 'Mexico(+52)',
    'méxico': 'Mexico(+52)',
    'mexico': 'Mexico(+52)',
    'méxico +52': 'Mexico(+52)',
    'mexico +52': 'Mexico(+52)',
    'españa(+1)': 'España(+34)',
    'espana(+1)': 'España(+34)',
    'españa': 'España(+34)',
    'espana': 'España(+34)',
    'españa +34': 'España(+34)',
    'espana +34': 'España(+34)',
    'argentina(+1)': 'Argentina(+54)',
    'argentina': 'Argentina(+54)',
    'chile(+1)': 'Chile(+56)',
    'chile': 'Chile(+56)',
    'perú(+1)': 'Peru(+51)',
    'peru(+1)': 'Peru(+51)',
    'perú': 'Peru(+51)',
    'peru': 'Peru(+51)',
    'ecuador(+1)': 'Ecuador(+593)',
    'ecuador': 'Ecuador(+593)',
    'venezuela(+1)': 'Venezuela(+58)',
    'venezuela': 'Venezuela(+58)',
    'brasil(+1)': 'Brasil(+55)',
    'brasil': 'Brasil(+55)',
    'canadá(+1)': 'Canadá(+1)',
    'canada(+1)': 'Canadá(+1)',
    'usa(+1)': 'Estados Unidos(+1)',
    'estados unidos(+1)': 'Estados Unidos(+1)',
    'usa': 'Estados Unidos(+1)',
    'estados unidos': 'Estados Unidos(+1)',
    'australia(+61)': 'Australia(+61)',
    'australia': 'Australia(+61)',
    'reino-unido(+44)': 'Reino Unido(+44)',
    'reino Unido(+44)': 'Reino Unido(+44)',
    'reino unido': 'Reino Unido(+44)',
    'alemania(+49)': 'Alemania(+49)',
    'alemania (+49)': 'Alemania(+49)',
    'alemania': 'Alemania(+49)',
    'germany': 'Alemania(+49)',
    'germany (+49)': 'Alemania(+49)',
    'israel(+972)': 'Israel(+972)',
    'israel (+972)': 'Israel(+972)',
    'israel': 'Israel(+972)',
  };

  const key = `${p}(${c.replace(/^\+/, '')})`;
  if (mapa[key]) {
    const [paisCorregido, prefijoCorregido] = mapa[key].replace('(+', '|').replace(')', '').split('|');
    return { paisCorregido, prefijoCorregido };
  }

  if (c === '+1' || c === '+57') {
    return { paisCorregido: p === 'colombia' ? 'Colombia' : pais, prefijoCorregido: c.replace('+', '') };
  }

  return { paisCorregido: pais, prefijoCorregido: prefijo.replace(/^\+/, '') };
}

// PASO 6: Crear o actualizar cuenta en Salesforce
export async function upsertSalesforceAccount(enrichedData: any, origen: string, leadId: number) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'creando_cuenta',
      current_step: 'Creando/actualizando cuenta en Salesforce',
    });

    const { accessToken, instanceUrl } = await getSalesforceTokens();

    const { paisCorregido, prefijoCorregido } = normalizePrefijoColombia(enrichedData.pais_salesforce, enrichedData.prefijo);

    const accountData = {
      Name: enrichedData.fullname,
      AccountSource: origen,
      Phone: enrichedData.phone,
      Prefijo_M_vil__c: `${paisCorregido}(${prefijoCorregido})`,
      Prefijo_Telefono__c: `${paisCorregido}(${prefijoCorregido})`,
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

    if (response.status === 300) {
      const multipleUrls: string[] = await response.json();
      console.log('[SALESFORCE] MULTIPLE_CHOICES: email duplicado en varias cuentas', multipleUrls);
      const resolved = await resolveMultipleAccounts(multipleUrls, accountData, accessToken, instanceUrl, leadId);
      return resolved;
    }

    if (!response.ok) {
      const error = await response.json();

      const isDuplicatePhone = Array.isArray(error) && error.some((e: any) =>
        e.errorCode === 'FIELD_CUSTOM_VALIDATION_EXCEPTION' &&
        e.message?.includes('Ya existe una cuenta con el mismo número de teléfono')
      );

      if (isDuplicatePhone) {
        console.log('[SALESFORCE] Cuenta duplicada por teléfono, buscando cuenta existente...');
        const resolved = await resolveByPhone(enrichedData.phone, accountData, accessToken, instanceUrl, leadId);
        if (resolved) return resolved;
      }

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

    if (!response.ok) {
      const error = await response.json();

      // Trigger duplicado de email: "Ya existe una cuenta con el correo. Id: 001..."
      const dupEmailErr = Array.isArray(error) && error.find((e: any) =>
        e.errorCode === 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY' &&
        e.message?.includes('Ya existe una cuenta con el correo')
      );
      if (dupEmailErr) {
        const dupMatch = dupEmailErr.message.match(/Id:\s*([A-Za-z0-9]{15,18})/);
        if (dupMatch) {
          const dupAccountId = dupMatch[1];
          console.log(`[SALESFORCE] Trigger detectó cuenta duplicada ${dupAccountId}, limpiando email...`);
          try {
            await updateAccountById(dupAccountId, { Correo_Electr_nico__c: `merged-${dupAccountId}@suvivienda.com` }, accessToken, instanceUrl);
            console.log(`[SALESFORCE] Email limpiado de ${dupAccountId}, reintentando Opportunity...`);

            const retryRes = await fetch(
              isUpdate
                ? `${instanceUrl}/services/data/v60.0/sobjects/Opportunity/${opportunityIdToUpdate}`
                : `${instanceUrl}/services/data/v60.0/sobjects/Opportunity`,
              {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(opportunityData),
              }
            );
            if (retryRes.ok || retryRes.status === 204) {
              response = retryRes;
            } else {
              const retryErr = await retryRes.json();
              throw new Error(`Salesforce error (después de limpiar duplicado): ${JSON.stringify(retryErr)}`);
            }
          } catch (cleanErr: any) {
            if (cleanErr.message?.includes('después de limpiar')) throw cleanErr;
            throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
          }
        } else {
          throw new Error(`Salesforce error: ${JSON.stringify(error)}`);
        }
      }
      // RecordTypeId inválido
      else if (!isUpdate &&
          error[0]?.errorCode === 'INVALID_CROSS_REFERENCE_KEY' &&
          error[0]?.fields?.includes('RecordTypeId')) {

        console.log('[SALESFORCE] RecordTypeId inválido, reintentando sin ese campo...');
        delete opportunityData.RecordTypeId;
        opportunityData.Description += ' [RecordType omitido - se usará el default de Salesforce]';

        response = await fetch(
          `${instanceUrl}/services/data/v60.0/sobjects/Opportunity`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(opportunityData),
          }
        );

        if (!response.ok) {
          const retryError = await response.json();
          throw new Error(`Salesforce error (después de fallback): ${JSON.stringify(retryError)}`);
        }
      } else {
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

     if (opportunityId) {
       await ensureOpportunityFollowUpTask(opportunityId, ownerId, accessToken, instanceUrl);
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

async function ensureOpportunityFollowUpTask(
  opportunityId: string,
  ownerId: string,
  accessToken: string,
  instanceUrl: string
) {
  const count = await getTaskCountForOpportunity(opportunityId, accessToken, instanceUrl);
  if (count > 0) return;

  const activityDate = new Date().toISOString().split('T')[0];
  const body = {
    Subject: 'Contactar cliente',
    Status: 'No Iniciada',
    ActivityDate: activityDate,
    WhatId: opportunityId,
    OwnerId: ownerId,
  };

  const res = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[SALESFORCE] Error creando tarea seguimiento:', err);
  }
}

async function getTaskCountForOpportunity(
  opportunityId: string,
  accessToken: string,
  instanceUrl: string
): Promise<number> {
  const soql = `SELECT COUNT() FROM Task WHERE WhatId = '${opportunityId}'`;
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return 0;
  const json = await res.json().catch(() => ({}));
  return json.totalSize || 0;
}
