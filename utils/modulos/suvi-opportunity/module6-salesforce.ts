/**
 * MÓDULO 6 - SUVI OPPORTUNITY
 * Salesforce: cuenta, proyecto por nombre, ruleta por grupo, oportunidad
 * Reutiliza OAuth del módulo 1 (getSalesforceTokens)
 */
import { getSalesforceTokens } from '@/utils/modulos/suvi-leads/module1-salesforce-oauth';
import { getConfig } from './module6-config';

export async function getProjectIdByName(nombreProyecto: string | null | undefined): Promise<string | null> {
  if (!nombreProyecto || String(nombreProyecto).trim() === '') return null;
  const val = String(nombreProyecto).trim();
  const validIds: string[] = JSON.parse(await getConfig('valid_project_ids') || '[]');

  const looksLikeId = /^a0[0-9A-Za-z]{13,16}$/.test(val);
  if (looksLikeId) {
    if (validIds.includes(val)) return val;
    const match15 = validIds.find((v) => v.startsWith(val) || val.startsWith(v));
    if (match15) return match15;
  }

  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();
    const field = looksLikeId ? 'Id' : 'Name';
    const escaped = val.replace(/'/g, "\\'");
    const soql = `SELECT Id, Name FROM Proyecto__c WHERE ${field} = '${escaped}' LIMIT 1`;
    const res = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const records = json.records || [];
    if (records.length === 0) return null;
    const id = records[0].Id;
    return validIds.includes(id) ? id : id;
  } catch (e) {
    console.error('[MOD6-SF] getProjectIdByName:', e);
    return null;
  }
}

export async function getSalesforceProjects(): Promise<{ Id: string; Name: string }[]> {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();
    const res = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=SELECT+Id,Name+FROM+Proyecto__c`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.records || [];
  } catch (e) {
    console.error('[MOD6-SF] getSalesforceProjects:', e);
    return [];
  }
}

export async function selectValidProjectFallback(): Promise<string> {
  const validIds = JSON.parse(await getConfig('valid_project_ids') || '[]');
  if (validIds.length === 0) throw new Error('valid_project_ids vacío en config módulo 6');
  const idx = Math.floor(Math.random() * validIds.length);
  return validIds[idx];
}

export async function getGroupMembers(groupId: string): Promise<{ UserOrGroupId: string }[]> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();
  const soql = `SELECT UserOrGroupId FROM GroupMember WHERE GroupId = '${groupId}'`;
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Error obteniendo grupo Salesforce');
  const json = await res.json();
  return json.records || [];
}

export function selectRandomOwner(members: { UserOrGroupId: string }[]): string {
  if (members.length === 0) throw new Error('No hay usuarios en el grupo');
  return members[Math.floor(Math.random() * members.length)].UserOrGroupId;
}

export async function getExistingOwnerForAccount(accountId: string, recordTypeId: string): Promise<string | null> {
  try {
    const { accessToken, instanceUrl } = await getSalesforceTokens();
    const soql = `SELECT OwnerId FROM Opportunity WHERE AccountId = '${accountId}' AND RecordTypeId = '${recordTypeId}' ORDER BY CreatedDate DESC LIMIT 1`;
    const res = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const records = json.records || [];
    return records[0]?.OwnerId ?? null;
  } catch (e) {
    console.error('[MOD6-SF] getExistingOwnerForAccount:', e);
    return null;
  }
}

export interface AccountPayload {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  pais?: string;
  indicativo?: string;
  ciudad?: string;
}

function normalizePrefijo(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  const compact = key.replace(/\s+/g, '');
  const map: Record<string, string> = {
    'colombia(+57)': 'Colombia(+57)',
    'estadosunidos(+1)': 'Estados Unidos(+1)',
    'usa(+1)': 'Estados Unidos(+1)',
    'mexico(+52)': 'Mexico(+52)',
    'méxico(+52)': 'Mexico(+52)',
    'espana(+34)': 'España(+34)',
    'españa(+34)': 'España(+34)',
    'chile(+56)': 'Chile(+56)',
    'peru(+51)': 'Peru(+51)',
    'perú(+51)': 'Peru(+51)',
    'argentina(+54)': 'Argentina(+54)',
    'ecuador(+593)': 'Ecuador(+593)',
    'panama(+507)': 'Panamá(+507)',
    'panamá(+507)': 'Panamá(+507)',
    'venezuela(+58)': 'Venezuela(+58)',
    'brasil(+55)': 'Brasil(+55)',
    'canada(+1)': 'Canadá(+1)',
    'canadá(+1)': 'Canadá(+1)',
    'colombia': 'Colombia(+57)',
    'estados unidos': 'Estados Unidos(+1)',
    'usa': 'Estados Unidos(+1)',
    'mexico': 'Mexico(+52)',
    'méxico': 'Mexico(+52)',
    'espana': 'España(+34)',
    'españa': 'España(+34)',
    'chile': 'Chile(+56)',
    'peru': 'Peru(+51)',
    'perú': 'Peru(+51)',
    'argentina': 'Argentina(+54)',
    'ecuador': 'Ecuador(+593)',
    'panama': 'Panamá(+507)',
    'panamá': 'Panamá(+507)',
    'venezuela': 'Venezuela(+58)',
    'brasil': 'Brasil(+55)',
    'canada': 'Canadá(+1)',
    'canadá': 'Canadá(+1)',
    'australia(+61)': 'Australia(+61)',
    'australia': 'Australia(+61)',
    'reino-unido(+44)': 'Reino Unido(+44)',
    'reino unido(+44)': 'Reino Unido(+44)',
  };
  return map[compact] || map[key] || trimmed;
}

function buildAccountBody(data: AccountPayload): Record<string, any> {
  const name = `${(data.nombre || '').trim()} ${(data.apellido || '').trim()}`.trim() || data.email;
  const body: Record<string, any> = {
    Name: name,
    AccountSource: 'Website',
    Phone: data.telefono,
    Ciudad_de_Residencia__c: data.ciudad || null,
    Nombre_para_creacion_de_contacto__c: data.nombre || null,
    Apellido_para_creacion_de_contacto__c: data.apellido || null,
  };
  if (data.pais && String(data.pais).trim()) {
    const prefijo = normalizePrefijo(data.pais);
    if (prefijo) {
      body.Prefijo_Telefono__c = prefijo;
      body.Prefijo_M_vil__c = prefijo;
    }
  }
  delete body.Correo_Electr_nico__c;
  return body;
}

interface AccountCandidate {
  Id: string;
  CreatedDate: string;
  Phone: string | null;
  Correo_Electr_nico__c: string | null;
  oppCount: number;
  matchedByEmail: boolean;
  matchedByPhone: boolean;
}

async function searchAccountsByField(
  field: string,
  value: string,
  accessToken: string,
  instanceUrl: string
): Promise<{ Id: string; CreatedDate: string; Phone: string | null; Correo_Electr_nico__c: string | null }[]> {
  const escaped = value.replace(/'/g, "\\'");
  const soql = `SELECT Id, CreatedDate, Phone, Correo_Electr_nico__c FROM Account WHERE ${field} = '${escaped}' ORDER BY CreatedDate ASC`;
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.records || [];
}

async function countOpportunitiesForAccounts(
  accountIds: string[],
  accessToken: string,
  instanceUrl: string
): Promise<Record<string, number>> {
  if (accountIds.length === 0) return {};
  const inClause = accountIds.map((id) => `'${id}'`).join(',');
  const soql = `SELECT AccountId, COUNT(Id) cnt FROM Opportunity WHERE AccountId IN (${inClause}) GROUP BY AccountId`;
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return {};
  const json = await res.json();
  const counts: Record<string, number> = {};
  for (const r of json.records || []) {
    counts[r.AccountId] = r.cnt;
  }
  return counts;
}

async function updateAccountById(
  accountId: string,
  body: Record<string, any>,
  accessToken: string,
  instanceUrl: string
): Promise<void> {
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/sobjects/Account/${accountId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[MOD6-SF] updateAccountById error:', err);
  }
}

export async function resolveAccount(data: AccountPayload): Promise<{ id: string }> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();

  const [byEmail, byPhone] = await Promise.all([
    searchAccountsByField('Correo_Electr_nico__c', data.email, accessToken, instanceUrl),
    data.telefono && data.telefono !== '-'
      ? searchAccountsByField('Phone', data.telefono, accessToken, instanceUrl)
      : Promise.resolve([]),
  ]);

  const candidateMap = new Map<string, AccountCandidate>();

  for (const a of byEmail) {
    candidateMap.set(a.Id, {
      ...a,
      oppCount: 0,
      matchedByEmail: true,
      matchedByPhone: false,
    });
  }
  for (const a of byPhone) {
    const existing = candidateMap.get(a.Id);
    if (existing) {
      existing.matchedByPhone = true;
    } else {
      candidateMap.set(a.Id, {
        ...a,
        oppCount: 0,
        matchedByEmail: false,
        matchedByPhone: true,
      });
    }
  }

  const candidates = Array.from(candidateMap.values());

  if (candidates.length > 0) {
    const oppCounts = await countOpportunitiesForAccounts(
      candidates.map((c) => c.Id),
      accessToken,
      instanceUrl
    );
    for (const c of candidates) {
      c.oppCount = oppCounts[c.Id] || 0;
    }

    candidates.sort((a, b) => {
      if (a.oppCount > 0 && b.oppCount === 0) return -1;
      if (a.oppCount === 0 && b.oppCount > 0) return 1;
      const dateA = new Date(a.CreatedDate).getTime();
      const dateB = new Date(b.CreatedDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.matchedByEmail && !b.matchedByEmail) return -1;
      if (!a.matchedByEmail && b.matchedByEmail) return 1;
      return 0;
    });

    const winner = candidates[0];
    console.log(`[MOD6-SF] resolveAccount: winner=${winner.Id} (opps=${winner.oppCount}, email=${winner.matchedByEmail}, phone=${winner.matchedByPhone})`);

    const body = buildAccountBody(data);
    await updateAccountById(winner.Id, body, accessToken, instanceUrl);
    return { id: winner.Id };
  }

  return upsertAccountByEmail(data);
}

async function upsertAccountByEmail(data: AccountPayload): Promise<{ id: string }> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();
  const body = buildAccountBody(data);
  const emailEnc = encodeURIComponent(data.email);
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/sobjects/Account/Correo_Electr_nico__c/${emailEnc}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  const result = res.status !== 204 ? await res.json().catch(() => ({})) : {};
  const id = result.id || result.Id;
  if (id) return { id };
  const byEmail = await getAccountIdByEmail(data.email);
  if (byEmail) return { id: byEmail };
  throw new Error('No se pudo obtener Id de cuenta después del upsert');
}

export async function getAccountIdByEmail(email: string): Promise<string | null> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();
  const soql = `SELECT Id FROM Account WHERE Correo_Electr_nico__c = '${email.replace(/'/g, "\\'")}' LIMIT 1`;
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const records = json.records || [];
  return records[0]?.Id ?? null;
}

export async function getAccount(accountId: string): Promise<{ Id: string; Name: string }> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/sobjects/Account/${accountId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Error obteniendo cuenta');
  return res.json();
}

export async function createOpportunity(params: {
  accountId: string;
  accountName: string;
  ownerId: string;
  projectId: string;
  recordTypeId: string;
  leadSource?: string;
}): Promise<string> {
  const { accessToken, instanceUrl } = await getSalesforceTokens();
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 30);
  const closeDateStr = closeDate.toISOString().split('T')[0] + 'T00:00:00';
  const body = {
    Name: params.accountName,
    AccountId: params.accountId,
    CloseDate: closeDateStr,
    StageName: 'Nuevo',
    OwnerId: params.ownerId,
    Proyecto__c: params.projectId,
    RecordTypeId: params.recordTypeId,
    LeadSource: params.leadSource || 'Web Form',
  };
  const res = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Opportunity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  const result = await res.json();
  const opportunityId = result.id || result.Id;
  if (!opportunityId) {
    throw new Error('No se pudo obtener Id de oportunidad');
  }

  await ensureOpportunityFollowUpTask(opportunityId, params.ownerId, accessToken, instanceUrl);
  return opportunityId;
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
    console.error('[MOD6-SF] Error creando tarea seguimiento:', err);
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
