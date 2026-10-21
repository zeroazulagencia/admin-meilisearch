import { getRuntimeConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';

// ============================================================
//  Módulo 30 — Reglas de descuento por ubicación leídas de un
//  METAOBJETO de Shopify (Admin API GraphQL, scope read_metaobjects).
//
//  - Solo entradas ACTIVE (capabilities.publishable.status === 'ACTIVE').
//  - Caché en memoria con TTL 60 s; invalidable al instante con
//    clearRulesCache() (webhook metaobjects/update|create|delete).
//  - Si el token no tiene read_metaobjects o Shopify falla, se devuelve
//    ok=false y el endpoint público degrada a regla=null / descuento=0.
//  - En pm2 cluster cada worker tiene su propia caché: una invalidación
//    afecta al worker que atiende la petición y el resto refresca ≤60 s.
// ============================================================

export const SHOPIFY_API_VERSION = '2024-10';
export const METAOBJECT_TYPE = process.env.MOD30_METAOBJECT_TYPE || 'municipiosxdescuento';
export const RULES_TTL_MS = 60_000;

export type Rule = { municipio: string; departamento: string; descuento: number };
export type RulesFetch = { ok: boolean; rules: Rule[]; error?: string; accessDenied?: boolean };

let rulesCache: { at: number; rules: Rule[] } | null = null;
let lastAccessDenied = false;

export function clearRulesCache(): void {
  rulesCache = null;
  lastAccessDenied = false;
}

export function rulesCacheStatus() {
  return {
    cached: Boolean(rulesCache),
    age_ms: rulesCache ? Date.now() - rulesCache.at : null,
    count: rulesCache?.rules.length ?? 0,
    ttl_ms: RULES_TTL_MS,
    last_access_denied: lastAccessDenied,
    metaobject_type: METAOBJECT_TYPE,
  };
}

/** Normaliza texto: sin mayúsculas, sin tildes/diacríticos, sin espacios sobrantes. */
export function normalize(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const RULES_QUERY = `
  query ReglasMunicipios($type: String!, $cursor: String) {
    metaobjects(type: $type, first: 250, after: $cursor) {
      nodes {
        id
        handle
        capabilities { publishable { status } }
        fields { key value }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function pickField(fields: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = fields[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export async function fetchRulesFromShopify(): Promise<RulesFetch> {
  const config = await getRuntimeConfig();
  const domain = String(config.shopifyShopDomain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const adminToken = String(config.shopifyAdminAccessToken || '').trim();

  if (!domain || !adminToken) {
    return { ok: false, rules: [], error: 'Shopify no configurado (domain/token)' };
  }

  const rules: Rule[] = [];
  let cursor: string | null = null;
  let guard = 0;

  while (guard < 20) {
    guard += 1;

    const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
      body: JSON.stringify({ query: RULES_QUERY, variables: { type: METAOBJECT_TYPE, cursor } }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, rules: [], error: `Shopify HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json: any = await res.json().catch(() => ({}));

    if (json?.errors?.length) {
      const msg = json.errors.map((e: any) => e?.message || '').join('; ');
      const accessDenied =
        json.errors.some((e: any) => e?.extensions?.code === 'ACCESS_DENIED') ||
        /access denied/i.test(msg);
      return { ok: false, rules: [], error: msg.slice(0, 300), accessDenied };
    }

    const conn = json?.data?.metaobjects;
    for (const node of conn?.nodes || []) {
      const status = node?.capabilities?.publishable?.status;
      if (status && status !== 'ACTIVE') continue; // ignora borradores/archivados

      const fields: Record<string, string> = {};
      for (const f of node?.fields || []) {
        // keys en minúsculas: el metaobjeto puede definirlos como "Municipio" o "DESCUENTO"
        if (f?.key) fields[String(f.key).trim().toLowerCase()] = f.value ?? '';
      }

      const municipio = pickField(fields, ['municipio', 'ciudad', 'city']);
      const departamento = pickField(fields, ['departamento', 'region', 'estado', 'provincia', 'department']);
      const raw = pickField(fields, ['descuento', 'discount', 'porcentaje']);
      const descuento = Number(String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.'));

      if (!municipio && !departamento) continue;
      if (!Number.isFinite(descuento)) continue;

      rules.push({ municipio, departamento, descuento });
    }

    if (conn?.pageInfo?.hasNextPage && conn?.pageInfo?.endCursor) {
      cursor = conn.pageInfo.endCursor;
      continue;
    }
    break;
  }

  return { ok: true, rules };
}

export async function getRules(): Promise<RulesFetch> {
  const now = Date.now();
  if (rulesCache && now - rulesCache.at < RULES_TTL_MS) {
    return { ok: true, rules: rulesCache.rules };
  }

  try {
    const fresh = await fetchRulesFromShopify();
    if (fresh.ok) {
      rulesCache = { at: now, rules: fresh.rules };
      lastAccessDenied = false;
    } else {
      lastAccessDenied = Boolean(fresh.accessDenied);
      console.error('[mod30-rules] reglas de metaobjeto no disponibles:', fresh.error);
    }
    return fresh;
  } catch (err: any) {
    console.error('[mod30-rules] error leyendo metaobjetos:', err?.message || err);
    return { ok: false, rules: [], error: err?.message || 'error leyendo metaobjetos' };
  }
}

/** Cruza la ubicación con las reglas: primero municipio (ciudad), luego departamento (región). */
export function matchRule(rules: Rule[], ciudad: string | null, region: string | null) {
  const keyCiudad = normalize(ciudad);
  const keyRegion = normalize(region);

  if (keyCiudad) {
    const byCity = rules.find((r) => r.municipio && normalize(r.municipio) === keyCiudad);
    if (byCity) {
      return {
        regla: { municipio: byCity.municipio, descuento: byCity.descuento } as Record<string, unknown> | null,
        descuento: byCity.descuento,
      };
    }
  }

  if (keyRegion) {
    const byRegion = rules.find((r) => r.departamento && normalize(r.departamento) === keyRegion);
    if (byRegion) {
      return {
        regla: { departamento: byRegion.departamento, descuento: byRegion.descuento } as Record<string, unknown> | null,
        descuento: byRegion.descuento,
      };
    }
  }

  return { regla: null as Record<string, unknown> | null, descuento: 0 };
}