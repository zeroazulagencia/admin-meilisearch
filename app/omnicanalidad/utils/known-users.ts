import { MEILISEARCH_CONFIG } from '@/utils/constants';

const INDEX_UID = 'bd_conversations_dworkers';
const MAX_DOCS = 10000;
type UserMap = Record<string, string>; // iduser → first_seen_date

// En Next.js serverless, el archivo se almacena en /tmp (efímero entre reinicios)
// Para persistencia real se usaría DB, pero /tmp funciona para el server dev
let cache: Record<string, { users: UserMap; updatedAt: string }> = {};

function getUserId(doc: any): string {
  const candidates = [
    doc.user_id, doc.iduser, doc.userid, doc.i_user,
    doc.id_user, doc.userId, doc.userID, doc.IDuser, doc.ID_user
  ];
  for (const val of candidates) {
    if (val && val !== 'unknown' && String(val).trim().length > 0) return String(val).trim();
  }
  return '';
}

async function searchMeilisearch(filter: string, limit: number, offset: number) {
  const url = `${MEILISEARCH_CONFIG.url}indexes/${INDEX_UID}/search`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: '',
      limit,
      offset,
      filter,
      attributesToRetrieve: ['iduser', 'user_id', 'userid', 'datetime'],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meilisearch error ${response.status}: ${text}`);
  }
  return response.json();
}

/**
 * Escanea TODO el histórico de un agente y construye un mapa de usuarios conocidos.
 * Se ejecuta una vez y se cachea en memoria (se pierde al reiniciar el server).
 */
export async function buildKnownUsers(agentName: string): Promise<UserMap> {
  const users: UserMap = {};
  let offset = 0;
  const batchLimit = 1000;

  while (Object.keys(users).length < MAX_DOCS) {
    const filter = `agent = "${agentName}"`;
    const results = await searchMeilisearch(filter, batchLimit, offset);
    const hits = results.hits || [];
    if (hits.length === 0) break;

    for (const doc of hits) {
      const uid = getUserId(doc);
      if (!uid) continue;
      // Guardar solo la primera fecha en que se vio este usuario
      if (!users[uid]) {
        const dateStr = doc.datetime ? doc.datetime.split('T')[0] : 'unknown';
        users[uid] = dateStr;
      }
    }

    if (hits.length < batchLimit) break;
    offset += batchLimit;
  }

  // Cachear en memoria
  cache[agentName] = {
    users,
    updatedAt: new Date().toISOString(),
  };

  return users;
}

/**
 * Obtiene usuarios conocidos del cache, o los construye si no existen.
 */
export async function getKnownUsers(agentName: string): Promise<UserMap> {
  if (cache[agentName]) {
    return cache[agentName].users;
  }
  return buildKnownUsers(agentName);
}

/**
 * Dado un set de user IDs del período actual, separa entre nuevos y conocidos.
 */
export function classifyUsers(
  currentUserIds: string[],
  knownUsers: UserMap,
): { newUsers: string[]; returningUsers: string[] } {
  const newUsers: string[] = [];
  const returningUsers: string[] = [];

  for (const uid of currentUserIds) {
    if (knownUsers[uid]) {
      returningUsers.push(uid);
    } else {
      newUsers.push(uid);
    }
  }

  return { newUsers, returningUsers };
}

/**
 * Actualiza la BD de usuarios conocidos con los nuevos usuarios del período actual.
 */
export function addKnownUsers(agentName: string, newUserIds: string[]): void {
  if (!cache[agentName]) {
    cache[agentName] = { users: {}, updatedAt: new Date().toISOString() };
  }
  const now = new Date().toISOString().split('T')[0];
  for (const uid of newUserIds) {
    if (!cache[agentName].users[uid]) {
      cache[agentName].users[uid] = now;
    }
  }
  cache[agentName].updatedAt = new Date().toISOString();
}

/**
 * Fuerza la recarga de usuarios conocidos desde Meilisearch.
 */
export function clearCache(agentName?: string): void {
  if (agentName) {
    delete cache[agentName];
  } else {
    cache = {};
  }
}
