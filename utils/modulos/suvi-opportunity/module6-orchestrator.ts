/**
 * MÓDULO 6 - SUVI OPPORTUNITY
 * Orquestador: Account → Proyecto (por nombre) → Ruleta → Opportunity
 */
import { query } from '@/utils/db';
import { getConfig, updateOpportunityLog } from './module6-config';
import {
  getProjectIdByName,
  selectValidProjectFallback,
  getGroupMembers,
  selectRandomOwner,
  getExistingOwnerForAccount,
  resolveAccount,
  getAccount,
  createOpportunity,
  type AccountPayload,
} from './module6-salesforce';

export type TipoOpportunity = 'ventas' | 'credito';

export async function processOpportunity(recordId: number): Promise<{ ok: boolean; error?: string }> {
  const [rows] = await query<any>(
    'SELECT id, email, nombre, apellido, telefono, pais, indicativo, ciudad, nombre_proyecto, tipo FROM modulos_suvi_6_opportunities WHERE id = ? LIMIT 1',
    [recordId]
  );
  if (!rows || rows.length === 0) return { ok: false, error: 'Registro no encontrado' };
  const row = rows[0];

  try {
    await updateOpportunityLog(recordId, {
      processing_status: 'creando_cuenta',
      current_step: 'Creando/actualizando cuenta en Salesforce',
    });

    const accountPayload: AccountPayload = {
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      pais: row.pais ?? undefined,
      indicativo: row.indicativo ?? undefined,
      ciudad: row.ciudad ?? undefined,
    };

    const accountResult = await resolveAccount(accountPayload);
    const accountId = accountResult.id;
    const account = await getAccount(accountId);

    let projectId: string | null = await getProjectIdByName(row.nombre_proyecto);
    if (!projectId) {
      projectId = await selectValidProjectFallback();
    }

    const recordTypeKey = row.tipo === 'credito' ? 'record_type_credito' : 'record_type_ventas';
    const recordTypeId = await getConfig(recordTypeKey);
    if (!recordTypeId) throw new Error(`Config ${recordTypeKey} no definido`);

    let ownerId = await getExistingOwnerForAccount(accountId, recordTypeId);
    if (!ownerId) {
      const groupKey = row.tipo === 'credito' ? 'salesforce_group_id_credito' : 'salesforce_group_id_ventas';
      const groupId = await getConfig(groupKey);
      if (!groupId) throw new Error(`Config ${groupKey} no definido`);
      const members = await getGroupMembers(groupId);
      ownerId = selectRandomOwner(members);
    }

    await updateOpportunityLog(recordId, {
      processing_status: 'creando_oportunidad',
      current_step: 'Creando oportunidad en Salesforce',
    });

    const opportunityId = await createOpportunity({
      accountId: account.Id,
      accountName: account.Name,
      ownerId,
      projectId,
      recordTypeId,
      leadSource: 'Web Form',
    });

    await updateOpportunityLog(recordId, {
      processing_status: 'completado',
      current_step: 'Oportunidad creada',
      error_message: null,
      error_step: null,
      salesforce_account_id: accountId,
      salesforce_opportunity_id: opportunityId,
      salesforce_owner_id: ownerId,
      proyecto_id: projectId,
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return { ok: true };
  } catch (e: any) {
    await updateOpportunityLog(recordId, {
      processing_status: 'error',
      current_step: null,
      error_message: e?.message || String(e),
      error_step: 'Proceso oportunidad',
    });
    return { ok: false, error: e?.message };
  }
}
