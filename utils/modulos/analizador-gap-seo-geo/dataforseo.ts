/**
 * DataForSEO v3 API client
 * Modulo 28 - Analizador GAP SEO + GEO
 *
 * Cambios en esta version:
 * - Clasificacion GAP: fortalezas, brechas, oportunidades, sin presencia, descartadas
 * - Deteccion de marca propia/competidora/sin marca
 * - Evaluacion de relevancia segun portafolio real
 * - Prioridad explicable (alta/media/baja) con justificacion
 * - Reporte narrativo: diagnostico, hallazgos, acciones prioritarias
 * - GEO: estado pendiente de evaluacion (sin integracion real)
 * - Datos faltantes/cero/null diferenciados correctamente
 * - Competencia PPC etiquetada como publicitaria (no SEO)
 * - Perdida de palanca: CPC y competition removido de vista principal
 */

import { buildOfferCatalog, matchOffer, type OfferCatalog } from './offer-catalog';

const DATA_FOR_SEO_BASE = 'https://api.dataforseo.com/v3';

// ──────────────────────── SDK INTERNO ────────────────────────

interface DfResponse<T> {
  version: string;
  status_code: number;
  status_message: string;
  cost: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    result: T[];
    error?: any;
  }>;
}

async function dfPost<T>(
  endpoint: string,
  payload: any[],
  authBase64: string
): Promise<DfResponse<T>> {
  const url = `${DATA_FOR_SEO_BASE}/${endpoint.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authBase64}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`DataForSEO HTTP ${res.status}: ${res.statusText}`);
  }
  const data: DfResponse<T> = await res.json();
  if (!data.tasks || data.tasks.length === 0) {
    throw new Error(`DataForSEO returned no tasks: ${data.status_message}`);
  }
  const task = data.tasks[0];
  if (task.status_code >= 40000 && task.status_code < 50000) {
    throw new Error(
      `DataForSEO error: ${task.status_message} (code ${task.status_code})${
        task.error ? ' - ' + JSON.stringify(task.error) : ''
      }`
    );
  }
  return data;
}

async function getDomainOverview(domain: string, authBase64: string): Promise<any> {
  const blData = await dfPost('backlinks/summary/live', [
    { target: domain },
  ], authBase64);
  const bl: any = blData.tasks[0]?.result?.[0] || null;
  return {
    backlinks: bl?.backlinks ?? null,
    referring_domains: bl?.referring_domains ?? null,
    rank: bl?.rank ?? null,
  };
}

async function getRankedKeywords(
  domain: string,
  authBase64: string,
  limit: number = 100
): Promise<any> {
  const data = await dfPost('dataforseo_labs/google/ranked_keywords/live', [
    {
      target: domain,
      location_name: 'Colombia',
      language_name: 'Spanish',
      limit,
    },
  ], authBase64);
  return (data.tasks[0]?.result?.[0] as any) || null;
}

async function getDomainIntersection(
  target1: string,
  target2: string,
  authBase64: string,
  limit: number = 200
): Promise<any> {
  const data = await dfPost(
    'dataforseo_labs/google/domain_intersection/live',
    [
      {
        target1,
        target2,
        location_name: 'Colombia',
        language_name: 'Spanish',
        limit,
      },
    ],
    authBase64
  );
  return (data.tasks[0]?.result?.[0] as any) || null;
}

// ──────────────────────── TIPOS PUBLICOS ────────────────────────

export interface DomainMetrics {
  domain: string;
  organicKeywords: number | null;
  totalBacklinks: number | null;
  referringDomains: number | null;
  estimatedMonthlyTraffic: number | null;
  /** DataForSEO Backlinks rank (escala ~1-1000, mas bajo = mejor). No es 0-100. */
  domainAuthority: number | null;
}

export interface DomainKeywordItem {
  keyword: string;
  searchVolume: number | null;
  rankAbsolute: number | null;
  /** Trafico estimado por keyword. DataForSEO solo asigna etv a keywords top.
   *  null = no disponible, 0 = genuinamente cero. */
  estimatedTraffic: number | null;
}

// ─── CLASIFICACION GAP ───

export type GapClassification =
  | 'fortaleza'
  | 'brecha_competitiva'
  | 'oportunidad_mejora'
  | 'sin_presencia_detectada'
  | 'descartada_validar';

export type BrandType = 'marca_propia' | 'sin_marca' | 'marca_competidora';

export type Relevance = 'alta' | 'media' | 'baja' | 'pendiente_validacion';

export type Priority = 'alta' | 'media' | 'baja';

export interface ClassifiedGapItem {
  keyword: string;
  searchVolume: number | null;
  /** Competencia publicitaria (PPC), no SEO. Escala 0-1. */
  ppcCompetition: number | null;
  ppcCompetitionLevel: string;
  /** Costo por clic en publicidad (USD), no relevante para SEO directo. */
  cpc: number;
  clientRank: number | null; // null = no aparece en top 100
  competitorRank: number | null;
  clientUrl: string | null;
  competitorUrl: string;
  competitorName: string; // dominio del competidor especifico
  // ─── CLASIFICACION ───
  classification: GapClassification;
  brandType: BrandType;
  relevance: Relevance;
  priority: Priority;
  priorityReason: string;
  /** Accion sugerida para la tabla */
  suggestedAction: string;
}

// ─── HALLAZGOS Y ACCIONES ───

export interface Finding {
  title: string;
  description: string;
  evidence: string;
}

export interface PrioritizedAction {
  action: string;
  affectedPage: string | null;
  keywords: string[];
  evidence: string;
  businessBenefit: string;
  priority: Priority;
  priorityReason: string;
  trackingIndicator: string;
}

// ─── GEO ───

export interface GeoStatus {
  status: 'sin_integracion';
  note: string;
  suggestedQueries: string[];
}

// ─── REPORTE COMPLETO ───

export interface AnalysisReport {
  executiveDiagnosis: string;
  findings: Finding[];
  prioritizedActions: PrioritizedAction[];
  gapCategories: {
    fortalezas: ClassifiedGapItem[];
    brechasCompetitivas: ClassifiedGapItem[];
    oportunidadesMejora: ClassifiedGapItem[];
    sinPresencia: ClassifiedGapItem[];
    descartadasValidar: ClassifiedGapItem[];
  };
  geo: GeoStatus;
  competitiveSummary: string;
  dataQualityNotes: string[];
}

/** Keyword organica de un competidor (top 100 consultado) */
export interface CompetitorKeywordItem extends DomainKeywordItem {
  domain: string;
}

/** Busqueda donde un competidor aparece y el cliente no. */
export interface VisibilityGap {
  competitor: string;
  keyword: string;
  rank: number | null;
  volume: number | null;
  /** temas de TU oferta que cubre esta busqueda */
  topics?: string[];
}

/** Busqueda que el cliente SI ofrece y un competidor ya cubre: lista a monitorear. */
export interface MonitoredKeyword {
  keyword: string;
  domain: string;
  topics: string[];
  volume: number | null;
  /** puesto del competidor en Google Colombia */
  rivalRank: number | null;
  /** puesto del cliente; null = no aparece en el top 100 */
  clientRank: number | null;
}

/** Comparacion de cobertura entre el cliente y cada competidor. */
export interface CompetitorOverlap {
  domain: string;
  /** keywords organicas del competidor en el top 100 consultado */
  ranked: number;
  /** busquedas en las que ambos aparecen */
  shared: number;
  /** busquedas donde aparece el competidor y el cliente no (sin su propia marca) */
  absent: number;
  /** busquedas del competidor omitidas por llevar su propia marca */
  brandOmitted: number;
  /** busquedas del competidor fuera del foco del cliente (otras lineas de negocio) */
  offTopic: number;
}

export interface AnalyzeResult {
  client: DomainMetrics;
  competitors: DomainMetrics[];
  gapItems: ClassifiedGapItem[];
  clientKeywords: DomainKeywordItem[];
  competitorKeywords: CompetitorKeywordItem[];
  visibilityGaps: VisibilityGap[];
  /** palabras de tu oferta que el competidor cubre (monitoreo) */
  monitoredKeywords: MonitoredKeyword[];
  /** catalogo de oferta detectado al rastrear el sitio del cliente */
  offerCatalog: OfferCatalog | null;
  competitorOverlap: CompetitorOverlap[];
  totalCost: number;
  analyzedAt: string;
  report: AnalysisReport;
}

// ──────────────────────── UTILIDADES ────────────────────────

function cleanDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/** Extrae la marca (brand name) a partir del dominio */
function extractBrand(domain: string): string {
  // kenworthcolombia.com -> kenworth
  // casainglesa.co -> casa inglesa
  // foton.com.co -> foton
  let name = domain.replace(/\.(com|co|com\.co|net|org)\..*$/, '').replace(/\.(com|co|com\.co|net|org)$/, '');
  // casainglesa -> casa inglesa
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim();
  // Casos especiales
  const special: Record<string, string> = {
    'casainglesa': 'casa inglesa',
    'kenworthcolombia': 'kenworth',
  };
  return special[name] || name;
}

/** Marcas que el sitio del cliente comercializa ademas de su marca principal.
 *  KenworthColombia.com vende Kenworth y DAF. DAF NO es una marca rival:
 *  el rival de DAF es foton.com.co; el rival directo del cliente es casainglesa.co */
const SOLD_BRANDS = ['daf'];

/** Busca una marca como palabra completa (evita falsos positivos tipo "daf" en "daflo") */
function hasWord(text: string, word: string): boolean {
  if (!word) return false;
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

/** Nombres de dominio competidores normalizados para deteccion */
function competitorBrandNames(competitorDomains: string[]): string[] {
  return competitorDomains.map(d => {
    const b = extractBrand(d);
    // Para busqueda en keywords, necesitamos fragmentos
    return b;
  });
}

/** Detecta tipo de marca en una keyword */
function detectBrandType(
  keyword: string,
  clientDomain: string,
  competitorDomains: string[]
): BrandType {
  const kw = keyword.toLowerCase();
  const clientBrand = extractBrand(clientDomain);
  const compBrands = competitorBrandNames(competitorDomains);

  // Marcas propias = marca del dominio + marcas que el cliente comercializa (Kenworth, DAF)
  const ownBrands = Array.from(new Set([clientBrand, ...SOLD_BRANDS].filter(Boolean)));
  const hasClientBrand = ownBrands.some(b => hasWord(kw, b));
  const hasCompBrand = compBrands.some(b => kw.includes(b));

  if (hasClientBrand && hasCompBrand) return 'marca_competidora'; // mixed intent
  if (hasCompBrand) return 'marca_competidora';
  if (hasClientBrand) return 'marca_propia';
  return 'sin_marca';
}

/** Evalua relevancia segun portafolio de camiones Kenworth */
function evaluateRelevance(
  keyword: string,
  brandType: BrandType,
  clientDomain: string
): Relevance {
  const kw = keyword.toLowerCase();

  // Marcas que NO comercializa el cliente (DAF no va aqui: el cliente SI vende DAF)
  const otherBrands = ['sinotruk', 'yutong', 'iveco', 'scania', 'volvo', 'mercedes benz', 'mack', 'navistar', 'international', 'isuzu', 'hino', 'mitsubishi', 'fuso'];
  for (const b of otherBrands) {
    // Si la keyword es SOLO otra marca (sin kenworth)
    if (kw === b || kw.startsWith(b + ' ') || kw.endsWith(' ' + b) || kw.includes(` ${b} `)) {
      // Pero si contiene una marca propia, es relevante
      if (![extractBrand(clientDomain), ...SOLD_BRANDS].some(own => kw.includes(own))) {
        return 'baja';
      }
    }
  }

  // Productos que Kenworth NO fabrica
  // Kenworth hace camiones, tractomulas, volquetas -- NO camionetas (SUVs)
  if (kw.includes('camioneta') && !kw.includes('camioneta kenworth')) {
    // "kenworth camioneta" necesita validacion
    if (kw.includes('kenworth')) return 'pendiente_validacion';
    return 'baja';
  }

  // Terminos muy genericos sin marca
  if (brandType === 'sin_marca') {
    const genericTerms = ['camiones', 'tractomula', 'tractocamion', 'camion', 'volqueta', 'mula', 'camiones nuevos', 'camiones usados'];
    const isProductTerm = genericTerms.some(t => kw.includes(t));
    if (!isProductTerm) return 'media'; // generico no identificado
  }

  return 'alta';
}

/** Clasifica un GAP item */
function classifyGapItem(
  clientRank: number | null,
  competitorRank: number | null,
  keyword: string,
  clientDomain: string,
  competitorDomains: string[],
  relevance: Relevance,
  brandType: BrandType
): {
  classification: GapClassification;
  priority: Priority;
  priorityReason: string;
  suggestedAction: string;
} {
  // ── Solo los terminos ajenos a la oferta se descartan ──
  if (relevance === 'baja') {
    return {
      classification: 'descartada_validar',
      priority: 'baja',
      priorityReason: 'Termino no relacionado con la oferta del cliente.',
      suggestedAction: 'Descartar',
    };
  }

  // ── Sin presencia detectada ──
  if (clientRank === null) {
    const prio = relevance === 'alta' ? 'alta' : 'media';
    return {
      classification: 'sin_presencia_detectada',
      priority: prio,
      priorityReason: prio === 'alta'
        ? 'Keyword relevante donde el cliente no aparece en los primeros 100 resultados.'
        : 'Keyword de relevancia media sin presencia registrada.',
      suggestedAction: 'Evaluar oportunidad de contenido',
    };
  }

  // ── Fortaleza: cliente rankea mejor que el competidor Y bien posicionado ──
  if (competitorRank !== null && clientRank < competitorRank) {
    // Cliente esta ganando
    if (clientRank <= 5) {
      return {
        classification: 'fortaleza',
        priority: relevance === 'pendiente_validacion' ? 'media' as Priority : 'alta' as Priority,
        priorityReason: relevance === 'pendiente_validacion'
          ? `Lideras (#${clientRank} vs #${competitorRank}), pero confirma si comercializas este tipo de vehiculo.`
          : `Posicion destacada (#${clientRank}) superando al competidor (#${competitorRank}). Mantener y defender.`,
        suggestedAction: relevance === 'pendiente_validacion' ? 'Validar oferta' : 'Defender posicion',
      };
    }
    // Cliente esta mejor que competidor pero posicion media
    return {
      classification: 'fortaleza',
      priority: 'media' as Priority,
      priorityReason: `Cliente supera al competidor (#${clientRank} vs #${competitorRank}) pero posicion es mejorable.`,
      suggestedAction: 'Consolidar',
    };
  }

  // ── Brecha competitiva: competidor rankea mejor ──
  if (competitorRank !== null && competitorRank < clientRank) {
    const diff = clientRank - competitorRank;
    const prio: Priority = diff >= 10 && relevance === 'alta' ? 'alta' : diff >= 3 ? 'media' : 'baja';
    const reasons: Record<Priority, string> = {
      'alta': `El competidor supera al cliente por ${diff} posiciones en una busqueda clave. Prioridad alta.`,
      'media': `El competidor esta mejor posicionado (${diff} posiciones de diferencia). Oportunidad de mejora.`,
      'baja': `Diferencia marginal frente al competidor.`,
    };
    return {
      classification: 'brecha_competitiva',
      priority: prio,
      priorityReason: brandType === 'marca_competidora'
        ? `Busqueda con marca del competidor: hoy te supera (#${competitorRank} vs #${clientRank}).`
        : reasons[prio],
      suggestedAction: brandType === 'marca_competidora' ? 'Monitorear' : 'Recuperar posicion',
    };
  }

  // ── Empate o cliente sin competidor directo en esta keyword ──
  // Oportunidad de mejora: cliente rankea pero no de forma optima
  if (clientRank <= 5) {
    return {
      classification: 'fortaleza',
      priority: 'media' as Priority,
      priorityReason: `Buena posicion (#${clientRank}), pero con oportunidad de escalar a top 3.`,
      suggestedAction: 'Optimizar para top 3',
    };
  }

  // Posicion media (6-20) -> oportunidad de mejora
  if (clientRank <= 20) {
    return {
      classification: 'oportunidad_mejora',
      priority: 'media' as Priority,
      priorityReason: `Posicion #${clientRank}. Mejorar contenido on-page y senales de autoridad para escalar.`,
      suggestedAction: 'Mejorar posicion',
    };
  }

  // Posicion baja (21+) -> oportunidad de mejora con prioridad baja
  return {
    classification: 'oportunidad_mejora',
    priority: 'baja' as Priority,
    priorityReason: `Posicion #${clientRank}. Se requiere esfuerzo significativo para escalar.`,
    suggestedAction: 'Evaluar esfuerzo vs beneficio',
  };
}

/** Quita tildes para comparar keywords equivalentes */
function stripAccents(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Calcula cuantas keywords con marca competidora existen */
function countCompetitorBrandKeywords(items: ClassifiedGapItem[]): number {
  return items.filter(i => i.brandType === 'marca_competidora').length;
}

/**
 * Genera el reporte narrativo a partir de los datos del analisis
 */
/**
 * Compara la cobertura organica del cliente con la de cada competidor:
 *  - busquedas donde el competidor aparece y el cliente no (visibilityGaps)
 *  - cuantas busquedas comparten y cuantas son de marca ajena (competitorOverlap)
 * Las busquedas que llevan la marca del competidor no son una brecha real
 * (gana por su propio nombre), asi que se cuentan aparte.
 */
function computeVisibility(
  competitorKeywords: CompetitorKeywordItem[],
  clientKeywords: DomainKeywordItem[],
  gapItems: ClassifiedGapItem[],
  clientDomain: string,
  competitorDomains: string[],
  offerCatalog?: OfferCatalog | null
): { visibilityGaps: VisibilityGap[]; competitorOverlap: CompetitorOverlap[]; monitoredKeywords: MonitoredKeyword[] } {
  const clientKwSet = new Set(
    (clientKeywords || []).map((k) => (k.keyword || '').toLowerCase())
  );

  const byDomain = new Map<string, CompetitorOverlap>();
  for (const d of competitorDomains) byDomain.set(d, { domain: d, ranked: 0, shared: 0, absent: 0, brandOmitted: 0, offTopic: 0 });
  for (const ck of competitorKeywords) {
    const slot = byDomain.get(ck.domain);
    if (slot) slot.ranked++;
  }
  for (const g of gapItems) {
    const slot = byDomain.get(g.competitorName);
    if (slot) slot.shared++;
  }

  // Huella tematica del cliente: tokens presentes en al menos 3 de sus keywords.
  // Evita recomendar busquedas de otras lineas de negocio del competidor.
  const STOP_TOKENS = new Set([
    'de','del','en','la','el','los','las','un','una','y','o','para','con','por','al',
    'colombia','precio','precios','cuanto','vale','mejor','mas','nueva','nuevo','usado',
    'usados','que','es','son','the','para',
  ]);
  // Stem muy simple (singular/plural) para que "camiones" y "camion" cuenten igual
  const stem = (t: string) => {
    if (t.length > 4 && t.endsWith('es')) return t.slice(0, -2);
    if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
    return t;
  };
  const tokenize = (s: string) =>
    stripAccents((s || '').toLowerCase())
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(stem)
      .filter((t) => t.length > 2 && !STOP_TOKENS.has(t));
  const tokenFreq = new Map<string, number>();
  for (const kw of clientKeywords || []) {
    for (const t of Array.from(new Set(tokenize(kw.keyword)))) {
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
    }
  }
  // Nombres de marca de cada competidor: una busqueda que los menciona no es una brecha
  // (el competidor gana por su propio nombre, no por posicionamiento).
  const COMPETITOR_BRAND_WORDS: Record<string, string[]> = {
    'casainglesa.co': ['casa inglesa', 'casainglesa', 'inglesa'],
    'foton.com.co': ['foton'],
  };
  const brandWordsFor = (domain: string): string[] => {
    const explicit = COMPETITOR_BRAND_WORDS[domain];
    if (explicit) return explicit;
    const label = stripAccents(domain.replace(/\.[a-z.]+$/, '').toLowerCase());
    return label.length > 3 ? [label] : [];
  };
  const mentionsCompetitorBrand = (keyword: string, domain: string): boolean => {
    const norm = stripAccents(keyword.toLowerCase()).replace(/[^a-z0-9 ]/g, ' ');
    return brandWordsFor(domain).some((w) => norm.includes(w));
  };

  // Oferta REAL del cliente: la busqueda solo cuenta si tu sitio ofrece eso
  // (ej. "taller kenworth" si, "camion de bomberos" no si no publicas bomberos).
  const offerFor = (keyword: string) => matchOffer(keyword, offerCatalog || null);

  const visibilityGaps: VisibilityGap[] = [];
  const seenKeywords = new Map<string, VisibilityGap>();
  for (const ck of competitorKeywords) {
    const kwLower = (ck.keyword || '').toLowerCase();
    if (!kwLower || clientKwSet.has(kwLower)) continue; // el cliente ya aparece en esa busqueda
    const brandType = detectBrandType(ck.keyword, clientDomain, competitorDomains);
    const slot = byDomain.get(ck.domain);
    if (brandType === 'marca_competidora') {
      if (slot) slot.brandOmitted++;
      continue;
    }
    if (evaluateRelevance(ck.keyword, brandType, clientDomain) === 'baja') continue;
    if (mentionsCompetitorBrand(ck.keyword, ck.domain)) {
      if (slot) slot.brandOmitted++;
      continue;
    }
    const offer = offerFor(ck.keyword);
    if (!offer) {
      if (slot) slot.offTopic++;
      continue;
    }
    // Clave de dedupe: tokens normalizados y ordenados (une singular/plural y variantes)
    const key = Array.from(new Set(tokenize(ck.keyword))).sort().join(' ') || stripAccents(kwLower).trim();
    const candidate: VisibilityGap = {
      competitor: ck.domain,
      keyword: ck.keyword,
      rank: ck.rankAbsolute,
      volume: ck.searchVolume,
      topics: offer.topics,
    };
    const prev = seenKeywords.get(key);
    if (!prev) {
      seenKeywords.set(key, candidate);
      if (slot) slot.absent++;
    } else if ((candidate.volume || 0) > (prev.volume || 0)) {
      seenKeywords.set(key, candidate);
    }
  }
  visibilityGaps.push(...Array.from(seenKeywords.values()));
  visibilityGaps.sort((a, b) => (b.volume || 0) - (a.volume || 0));

  // ── Palabras de TU oferta que el competidor ya cubre (lista a monitorear) ──
  const clientRankByKw = new Map<string, number | null>();
  for (const g of gapItems) clientRankByKw.set((g.keyword || '').toLowerCase(), g.clientRank);
  const monitoredMap = new Map<string, MonitoredKeyword>();
  for (const ck of competitorKeywords) {
    if (detectBrandType(ck.keyword, clientDomain, competitorDomains) === 'marca_competidora') continue;
    if (mentionsCompetitorBrand(ck.keyword, ck.domain)) continue;
    const offer = offerFor(ck.keyword);
    if (!offer) continue;
    const kwLower = (ck.keyword || '').toLowerCase();
    const key = `${ck.domain}|${Array.from(new Set(tokenize(ck.keyword))).sort().join(' ')}`;
    const candidate: MonitoredKeyword = {
      keyword: ck.keyword,
      domain: ck.domain,
      topics: offer.topics,
      volume: ck.searchVolume,
      rivalRank: ck.rankAbsolute,
      clientRank: clientRankByKw.has(kwLower) ? (clientRankByKw.get(kwLower) as number | null) : null,
    };
    const prev = monitoredMap.get(key);
    if (!prev) monitoredMap.set(key, candidate);
    else if ((candidate.volume || 0) > (prev.volume || 0)) monitoredMap.set(key, candidate);
  }
  const monitoredKeywords = Array.from(monitoredMap.values()).sort((a, b) => (b.volume || 0) - (a.volume || 0));

  return { visibilityGaps, competitorOverlap: Array.from(byDomain.values()), monitoredKeywords };
}

function generateReport(
  client: DomainMetrics,
  competitors: DomainMetrics[],
  gapItems: ClassifiedGapItem[],
  clientKeywords: DomainKeywordItem[],
  clientDomain: string,
  competitorDomains: string[],
  competitorKeywords: CompetitorKeywordItem[] = [],
  offerCatalog: OfferCatalog | null = null
): AnalysisReport {
  const dataQualityNotes: string[] = [];
  const totalShared = gapItems.length;

  const { visibilityGaps, competitorOverlap, monitoredKeywords } = computeVisibility(
    competitorKeywords,
    clientKeywords,
    gapItems,
    clientDomain,
    competitorDomains,
    offerCatalog
  );
  const oferta = new Set<string>();
  for (const m of monitoredKeywords) for (const t of m.topics) oferta.add(t);
  const ganamosOferta = monitoredKeywords.filter((m) => m.clientRank != null && m.rivalRank != null && m.clientRank < m.rivalRank).length;
  const conDato = monitoredKeywords.filter((m) => m.clientRank != null && m.rivalRank != null).length;

  // ── Calidad de datos ──
  const kwsWithTraffic = clientKeywords.filter(k => k.estimatedTraffic !== null && k.estimatedTraffic > 0);
  if (kwsWithTraffic.length === 0 && client.estimatedMonthlyTraffic !== null) {
    dataQualityNotes.push(
      'El trafico estimado total proviene del agregado de DataForSEO, pero el desglose por keyword no esta disponible para este dominio. Los valores individuales aparecen como "--".'
    );
  }
  if (kwsWithTraffic.length > 0 && kwsWithTraffic.length < clientKeywords.length) {
    dataQualityNotes.push(
      `Solo ${kwsWithTraffic.length} de ${clientKeywords.length} keywords tienen trafico estimado individual. DataForSEO asigna etv solo a posiciones top.`
    );
  }

  // ── Contar clasificaciones ──
  const fortalezas = gapItems.filter(i => i.classification === 'fortaleza');
  const brechas = gapItems.filter(i => i.classification === 'brecha_competitiva');
  const oportunidades = gapItems.filter(i => i.classification === 'oportunidad_mejora');
  const sinPresencia = gapItems.filter(i => i.classification === 'sin_presencia_detectada');
  const descartadas = gapItems.filter(i => i.classification === 'descartada_validar');

  for (const o of competitorOverlap) {
    if (o.shared === 0 && o.ranked > 0) {
      dataQualityNotes.push(
        `${o.domain} no comparte ninguna busqueda contigo: sus ${o.ranked} keywords organicas son propias de su marca o de su portafolio` +
        (o.brandOmitted > 0 ? ` (${o.brandOmitted} llevan su propio nombre)` : '') +
        `. No compite por las mismas busquedas que tu, aunque si capture trafico en las suyas.` +
        (o.offTopic > 0 ? ` Las ${o.offTopic} busquedas restantes no coinciden con lo que tu sitio ofrece (otras lineas de negocio del competidor) y no se cuentan como brecha.` : '')
      );
    }
  }

  if (brechas.length === 0 && sinPresencia.length === 0 && totalShared > 0) {
    dataQualityNotes.push(
      `Muestra pequena: solo ${totalShared} busquedas compartidas. No detectar brechas no equivale a no tener competencia; ampliar competidores o keywords da un diagnostico mas completo.`
    );
  }

  // ── Hallazgos principales ──
  const findings: Finding[] = [];

  // Hallazgo 1: Visibilidad general
  const bestCompetitor = competitors.reduce((best, c) => {
    const bestScore = (best.organicKeywords || 0) + (best.estimatedMonthlyTraffic || 0);
    const cScore = (c.organicKeywords || 0) + (c.estimatedMonthlyTraffic || 0);
    return cScore > bestScore ? c : best;
  }, competitors[0]);

  if (client.estimatedMonthlyTraffic !== null && bestCompetitor) {
    const ratio = bestCompetitor.estimatedMonthlyTraffic && bestCompetitor.estimatedMonthlyTraffic > 0
      ? ((client.estimatedMonthlyTraffic / bestCompetitor.estimatedMonthlyTraffic) * 100).toFixed(0)
      : null;
    findings.push({
      title: 'Visibilidad organica consolidada',
      description: `El sitio tiene ${(client.organicKeywords || 0).toLocaleString()} keywords en los primeros 100 resultados de Google Colombia y un trafico estimado de ${Math.round(client.estimatedMonthlyTraffic).toLocaleString()} visitas mensuales.`,
      evidence: `Fuente: DataForSEO Labs - Ranked Keywords (top 100). Fecha: ${new Date().toISOString().split('T')[0]}. Pais: Colombia.`,
    });
  }

  // Hallazgo 2: Fortalezas
  if (fortalezas.length > 0) {
    const sinMarcaCompartidas = gapItems.filter(i => i.brandType === 'sin_marca');
    const sinMarcaLidera = sinMarcaCompartidas.filter(i => i.classification === 'fortaleza').length;
    findings.push({
      title: `${fortalezas.length} busquedas donde el cliente lidera`,
      description: `De ${totalShared} busquedas compartidas con tus competidores, ${clientDomain} aparece mejor posicionado en ${fortalezas.length} y peor en ${brechas.length}. En busquedas sin marca de ninguno de los dos: gana ${sinMarcaLidera} de ${sinMarcaCompartidas.length}.`,
      evidence: `Comparacion por dominio (DataForSEO Labs) contra ${competitors.map(c => c.domain).join(', ')}.`,
    });
  }

  // Hallazgo 3: Brechas
  if (brechas.length > 0) {
    const topBrechas = brechas.slice(0, 3).map(b => `"${b.keyword}" (${b.competitorName} #${b.competitorRank})`).join(', ');
    findings.push({
      title: `${brechas.length} busquedas donde el competidor lidera`,
      description: `El competidor esta mejor posicionado en: ${topBrechas}.`,
      evidence: `Datos de interseccion de dominio (DataForSEO Labs).`,
    });
  }

  // Hallazgo 3b: oferta propia que el competidor ya cubre (monitoreo)
  if (monitoredKeywords.length > 0) {
    const topMon = monitoredKeywords
      .slice(0, 5)
      .map(m => `"${m.keyword}" (${m.domain}${m.rivalRank != null ? ` #${m.rivalRank}` : ''}${m.clientRank != null ? ` vs tu #${m.clientRank}` : ', tu no apareces'})`)
      .join(', ');
    findings.push({
      title: `${monitoredKeywords.length} busquedas de tu oferta que el competidor ya cubre`,
      description: `Se rastreo tu sitio y se detecto que ofreces: ${Array.from(oferta).join(', ')}. En ${monitoredKeywords.length} de esas busquedas tu competidor ya aparece (${topMon}). En ${ganamosOferta} de las ${conDato} comparables vas por encima de el.`,
      evidence: `Catalogo de oferta construido rastreando tu propio sitemap y paginas publicadas (sin costo de API). Posiciones via DataForSEO Labs, top 100 Colombia. No se cuentan busquedas con la marca del competidor.`,
    });
  } else if (visibilityGaps.length > 0) {
    const topVis = visibilityGaps
      .slice(0, 5)
      .map(v => `"${v.keyword}" (${v.competitor}${v.rank != null ? ` puesto ${v.rank}` : ''})`)
      .join(', ');
    findings.push({
      title: `${visibilityGaps.length} busquedas donde tus competidores aparecen y tu no`,
      description: `En ${visibilityGaps.length} busquedas tus competidores estan presentes y tu sitio no figura en el top 100: ${topVis}.`,
      evidence: `Comparacion de las keywords organicas de cada dominio (DataForSEO Labs, top 100 Colombia), limitada a lo que tu sitio realmente ofrece.`,
    });
  }

  // Hallazgo 4: Oportunidades
  if (oportunidades.length > 0) {
    findings.push({
      title: `${oportunidades.length} oportunidades de mejora en posiciones medias`,
      description: `El cliente aparece en ${oportunidades.length} busquedas con posiciones mejorables (tipicamente fuera del top 3). Optimizar estas paginas puede incrementar el trafico sin depender de contenido nuevo.`,
      evidence: `Keywords donde el cliente rankea pero no en posicion optima. Mejoras on-page y contenido adicional pueden escalar posiciones.`,
    });
  }

  // Hallazgo 5: Presencia no detectada
  if (sinPresencia.length > 0) {
    const relevantSinPresencia = sinPresencia.filter(s => s.relevance === 'alta');
    if (relevantSinPresencia.length > 0) {
      findings.push({
        title: `${relevantSinPresencia.length} busquedas relevantes sin presencia del cliente`,
        description: `Hay ${relevantSinPresencia.length} busquedas de alta relevancia donde el cliente no aparece en los primeros 100 resultados, pero sus competidores si. Estas representan la oportunidad de crecimiento mas clara.`,
        evidence: `Interseccion de dominio: el competidor aparece en estas busquedas y el cliente no se detecta en el rango consultado (top 100).`,
      });
    }
  }

  // ── Acciones prioritarias (max 5) ──
  const prioritizedActions: PrioritizedAction[] = [];

  // Accion 1: Brechas de alta prioridad
  const highBrechas = brechas
    .filter(b => b.priority === 'alta' && b.brandType !== 'marca_competidora')
    .slice(0, 3);
  for (const b of highBrechas) {
    prioritizedActions.push({
      action: `Mejorar posicionamiento para "${b.keyword}"`,
      affectedPage: b.clientUrl || 'Pagina por identificar',
      keywords: [b.keyword],
      evidence: `Competidor ${b.competitorName} en posicion #${b.competitorRank} vs cliente #${b.clientRank}. Volumen estimado: ${b.searchVolume?.toLocaleString() || 'no disponible'} busquedas/mes.`,
      businessBenefit: `Capturar trafico de una busqueda con demanda verificada donde el competidor actualmente lidera.`,
      priority: 'alta',
      priorityReason: b.priorityReason,
      trackingIndicator: `Posicion en Google Colombia para "${b.keyword}" - objetivo: superar al competidor.`,
    });
  }

  // Accion 2: Sin presencia de alta relevancia
  const highSinPresencia = sinPresencia
    .filter(s => s.priority === 'alta' && s.brandType !== 'marca_competidora')
    .slice(0, 3);
  for (const s of highSinPresencia) {
    prioritizedActions.push({
      action: `Crear contenido para "${s.keyword}"`,
      affectedPage: null, // no existe pagina actual
      keywords: [s.keyword],
      evidence: `El competidor ${s.competitorName} aparece en posicion #${s.competitorRank}. Cliente no detectado en top 100. Volumen: ${s.searchVolume?.toLocaleString() || 'no disponible'} busquedas/mes.`,
      businessBenefit: `Abrir un nuevo frente de trafico en una busqueda donde el cliente hoy no tiene presencia organica.`,
      priority: 'alta',
      priorityReason: s.priorityReason,
      trackingIndicator: `Posicion en Google Colombia para "${s.keyword}" - objetivo: aparecer en top 20.`,
    });
  }

  // Accion 2b: brechas de visibilidad (el competidor aparece y el cliente no compite)
  for (const v of visibilityGaps.slice(0, 3)) {
    prioritizedActions.push({
      action: `Abrir contenido para "${v.keyword}"`,
      affectedPage: null,
      keywords: [v.keyword],
      evidence: `${v.competitor} aparece${v.rank != null ? ` en el puesto ${v.rank}` : ''} y ${clientDomain} no figura en el top 100. Volumen estimado: ${v.volume != null ? v.volume.toLocaleString('es-CO') : 'no disponible'} busquedas/mes.`,
      businessBenefit: `Sumar trafico en una busqueda donde hoy no compites y el competidor si aparece.`,
      priority: 'alta',
      priorityReason: `Brecha de visibilidad: el competidor aparece en esta busqueda y el cliente no.`,
      trackingIndicator: `Posicion en Google Colombia para "${v.keyword}" - objetivo: aparecer en el top 20.`,
    });
  }

  // Accion 3: Oportunidades de mejora
  const mejoraPrioritarias = oportunidades.filter(o => o.priority === 'alta' || o.priority === 'media').slice(0, 3);
  for (const o of mejoraPrioritarias) {
    prioritizedActions.push({
      action: `Optimizar pagina actual para "${o.keyword}"`,
      affectedPage: o.clientUrl || 'Pagina por identificar',
      keywords: [o.keyword],
      evidence: `Posicion actual: #${o.clientRank}. Competidor: #${o.competitorRank}. Volumen: ${o.searchVolume?.toLocaleString() || 'no disponible'} busquedas/mes.`,
      businessBenefit: `Escalar de posicion #${o.clientRank} a top 3 incrementaria significativamente el trafico de esta busqueda.`,
      priority: o.priority,
      priorityReason: o.priorityReason,
      trackingIndicator: `Posicion en Google Colombia para "${o.keyword}" - objetivo: subir al menos 3 posiciones.`,
    });
  }

  // ── Diagnostico ejecutivo: corto y con el nombre de cada competidor ──
  const execParts: string[] = [];

  // Posiciones frente a cada competidor con busquedas compartidas.
  // (Las visitas ya se muestran en el titular del tablero: no se repiten aqui.)
  const perCompetitor = new Map<string, { lead: number; lose: number; total: number }>();
  for (const it of gapItems) {
    const slot = perCompetitor.get(it.competitorName) || { lead: 0, lose: 0, total: 0 };
    slot.total++;
    if (it.classification === 'fortaleza') slot.lead++;
    else if (it.classification === 'brecha_competitiva') slot.lose++;
    perCompetitor.set(it.competitorName, slot);
  }
  perCompetitor.forEach((s, dom) => {
    if (s.total > 0) {
      execParts.push(`Frente a ${dom}: lideras ${s.lead} de ${s.total} busquedas compartidas, pierdes ${s.lose}.`);
    }
  });

  if (visibilityGaps.length > 0) {
    execParts.push(
      `Ademas, tus competidores aparecen en ${visibilityGaps.length} busquedas donde tu no figuras en el top 100.`
    );
  } else if (competitorKeywords.length > 0) {
    execParts.push('No se detectaron busquedas relevantes donde un competidor aparezca y tu no.');
  }

  if (highSinPresencia.length > 0) {
    execParts.push(`${highSinPresencia.length} busquedas relevantes donde no apareces en el top 100.`);
  }

  if (monitoredKeywords.length > 0) {
    const comp = monitoredKeywords.filter((m) => m.clientRank != null && m.rivalRank != null);
    const above = comp.filter((m) => (m.clientRank as number) < (m.rivalRank as number)).length;
    const ausentes = monitoredKeywords.filter((m) => m.clientRank == null).length;
    execParts.push(
      `Se rastreo tu sitio y se identificaron ${monitoredKeywords.length} busquedas que corresponden a lo que ofreces y que tus competidores ya cubren: vas por encima de ellos en ${above} de ${comp.length} comparables` +
      (ausentes > 0 ? ` y no apareces en ${ausentes}.` : '.')
    );
  }

  execParts.push('Presencia en IA: ver la tarjeta "Presencia en IA".');

  // ── Resumen competitivo ──
  let compSummary = '';
  if (competitors.length > 0) {
    const parts = competitors.map(c => {
      const traffic = c.estimatedMonthlyTraffic !== null
        ? `${Math.round(c.estimatedMonthlyTraffic).toLocaleString()} visitas/mes`
        : 'trafico no disponible';
      const kws = c.organicKeywords !== null
        ? `${c.organicKeywords.toLocaleString()} keywords`
        : 'keywords no disponibles';
      const auth = c.domainAuthority !== null
        ? `Domain Rank ${c.domainAuthority}/1000`
        : '';
      const ref = c.referringDomains !== null
        ? `${c.referringDomains.toLocaleString('es-CO')} dominios de referencia`
        : '';
      return `${c.domain}: ${traffic}, ${kws}${auth ? ', ' + auth : ''}${ref ? ', ' + ref : ''}`;
    });
    const overlapParts = competitorOverlap
      .filter(o => o.ranked > 0)
      .map(o =>
        o.shared > 0
          ? `${o.domain} compite contigo en ${o.shared} busquedas${o.absent > 0 ? ` y aparece en ${o.absent} mas donde tu no` : ''}`
          : `${o.domain} no compite por tus mismas busquedas (${o.brandOmitted} de sus ${o.ranked} keywords son de su propia marca)`
      );
    compSummary =
      `Competidores analizados: ${parts.join('; ')}.` +
      (overlapParts.length > 0 ? ` Cobertura: ${overlapParts.join('; ')}.` : '');
  }

  // ── Acciones sobre busquedas de TU oferta donde aun no estas #1 ──
  const escalables = monitoredKeywords
    .filter((m) => m.clientRank != null && m.clientRank > 1)
    .slice(0, 3);
  for (const m of escalables) {
    if (prioritizedActions.length >= 5) break;
    prioritizedActions.push({
      action: `Escalar "${m.keyword}" del puesto #${m.clientRank} al #1`,
      affectedPage: 'Pagina por identificar',
      keywords: [m.keyword],
      evidence: `Busqueda de tu propia oferta con demanda comprobada: hoy estas en #${m.clientRank}, ${m.domain} en #${m.rivalRank}. Volumen estimado: ${m.volume != null ? m.volume.toLocaleString() : 'no disponible'} busquedas/mes.`,
      businessBenefit: 'Subir posiciones en una busqueda que ya trabajas captura trafico que hoy se reparte entre varios resultados.',
      priority: 'media',
      priorityReason: 'Ya apareces en el top 100: es mejora incremental, sin depender de contenido nuevo.',
      trackingIndicator: `Posicion en Google Colombia para "${m.keyword}" - objetivo: primer lugar.`,
    });
  }

  return {
    executiveDiagnosis: execParts.join(' '),
    findings: findings.slice(0, 6),
    prioritizedActions: prioritizedActions.slice(0, 5),
    gapCategories: {
      fortalezas,
      brechasCompetitivas: brechas,
      oportunidadesMejora: oportunidades,
      sinPresencia,
      descartadasValidar: descartadas,
    },
    geo: {
      status: 'sin_integracion',
      note: 'La presencia en asistentes de IA se mide aparte en la tarjeta "Presencia en IA". Los datos de esta seccion son posicionamiento organico en Google.',
      suggestedQueries: [
        'camiones kenworth colombia precio',
        'mejor tractomula en colombia 2026',
        'kenworth t880 ficha tecnica',
        'donde comprar camiones kenworth en colombia',
      ],
    },
    competitiveSummary: compSummary,
    dataQualityNotes,
  };
}

// ──────────────────────── ANALISIS PRINCIPAL ────────────────────────

export async function runAnalysis(
  authBase64: string,
  clientUrl: string,
  competitorUrls: string[]
): Promise<AnalyzeResult> {
  const clientDomain = cleanDomain(clientUrl);
  const compDomains = competitorUrls.map((u) => cleanDomain(u));

  let totalCost = 0;
  const startTime = new Date().toISOString();

  // 1. Domain Overview for client (backlinks)
  const clientOverview: any = await getDomainOverview(clientDomain, authBase64);
  totalCost += 0.025;

  // 2. Ranked Keywords for client (top 100)
  const clientRanked: any = await getRankedKeywords(clientDomain, authBase64, 100);
  totalCost += 0.0126;

  // 3. Domain Overview + Ranked Keywords for each competitor
  const compOverviewResults: any[] = [];
  const compRankedResults: any[] = [];
  for (const cd of compDomains) {
    const [ov, rk] = await Promise.all([
      getDomainOverview(cd, authBase64),
      getRankedKeywords(cd, authBase64, 100),
    ]);
    compOverviewResults.push(ov);
    compRankedResults.push(rk);
    totalCost += 0.025 + 0.0126;
  }

  // 4. Domain Intersection for each competitor
  const intersectionResults: any[] = [];
  for (const cd of compDomains) {
    const inter: any = await getDomainIntersection(
      clientDomain,
      cd,
      authBase64,
      200
    );
    intersectionResults.push(inter);
    totalCost += 0.0126;
  }

  // ── Build client metrics ──
  const clientOrganicKeywords = clientRanked?.total_count != null ? clientRanked.total_count : null;
  const clientTraffic = clientRanked?.metrics?.organic?.etv != null
    ? clientRanked.metrics.organic.etv
    : null;

  const clientMetrics: DomainMetrics = {
    domain: clientDomain,
    organicKeywords: clientOrganicKeywords,
    totalBacklinks: clientOverview?.backlinks ?? null,
    referringDomains: clientOverview?.referring_domains ?? null,
    estimatedMonthlyTraffic: clientTraffic,
    domainAuthority: clientOverview?.rank ?? null,
  };

  // ── Build competitor metrics ──
  const compMetricsArray: DomainMetrics[] = [];
  for (let i = 0; i < compDomains.length; i++) {
    const cd = compDomains[i];
    const ov = compOverviewResults[i];
    const rk = compRankedResults[i];
    const m: DomainMetrics = {
      domain: cd,
      organicKeywords: rk?.total_count != null ? rk.total_count : null,
      totalBacklinks: ov?.backlinks ?? null,
      referringDomains: ov?.referring_domains ?? null,
      estimatedMonthlyTraffic: rk?.metrics?.organic?.etv != null
        ? rk.metrics.organic.etv
        : null,
      domainAuthority: ov?.rank ?? null,
    };
    compMetricsArray.push(m);
  }

  // ── Build raw GAP items from intersection ──
  const seenKeywords = new Map<string, ClassifiedGapItem>();

  for (let ci = 0; ci < intersectionResults.length; ci++) {
    const inter = intersectionResults[ci];
    if (!inter?.items) continue;

    const compDomain = compDomains[ci];

    for (const item of inter.items) {
      const kw = item.keyword_data?.keyword;
      if (!kw) continue;

      const kwInfo = item.keyword_data?.keyword_info || {};
      const firstSerp = item.first_domain_serp_element || {};
      const secondSerp = item.second_domain_serp_element || {};

      // Determinar cual SERP corresponde al cliente y cual al competidor
      let clientRank: number | null = null;
      let clientUrlVal: string | null = null;
      let compRank: number | null = null;
      let compUrlVal: string = '';

      // first_domain_serp_element corresponde a target1 (clientDomain)
      // second_domain_serp_element corresponde a target2 (compDomain)
      // Pero no es garantizado, verificamos por dominio

      if (firstSerp.domain?.includes(clientDomain) || firstSerp.domain?.includes(compDomain)) {
        // first SERP es para target1
        if (firstSerp.domain?.includes(clientDomain)) {
          clientRank = firstSerp.rank_absolute || null;
          clientUrlVal = firstSerp.url || null;
        }
        if (secondSerp.domain?.includes(compDomain) || secondSerp.domain?.includes(clientDomain)) {
          if (secondSerp.domain?.includes(compDomain)) {
            compRank = secondSerp.rank_absolute || null;
            compUrlVal = secondSerp.url || '';
          }
          if (secondSerp.domain?.includes(clientDomain) && clientRank === null) {
            clientRank = secondSerp.rank_absolute || null;
            clientUrlVal = secondSerp.url || null;
          }
        }
      } else {
        // Fallback: first=target1(client), second=target2(comp)
        clientRank = firstSerp.rank_absolute || null;
        if (firstSerp.url) clientUrlVal = firstSerp.url;
        compRank = secondSerp.rank_absolute || null;
        compUrlVal = secondSerp.url || '';
      }

      // Asegurar que tenemos el rank del competidor
      if (compRank === null) {
        compRank = secondSerp.rank_absolute || null;
        if (!compUrlVal) compUrlVal = secondSerp.url || '';
      }

      // Si no detectamos cliente pero firstSerp es null, el cliente no esta en top N
      // (el endpoint intersection ya devuelve keywords donde ambos aparecen, pero uno puede estar fuera del rango)

      // ---- CLASIFICACION ----
      const volume = kwInfo.search_volume != null ? kwInfo.search_volume : null;
      const competition = kwInfo.competition != null ? kwInfo.competition : null;
      const competitionLevel = kwInfo.competition_level || 'N/A';
      const cpc = kwInfo.cpc || 0;

      const brandType = detectBrandType(kw, clientDomain, compDomains);
      const relevance = evaluateRelevance(kw, brandType, clientDomain);
      const {
        classification,
        priority,
        priorityReason,
        suggestedAction,
      } = classifyGapItem(clientRank, compRank, kw, clientDomain, compDomains, relevance, brandType);

      const classified: ClassifiedGapItem = {
        keyword: kw,
        searchVolume: volume,
        ppcCompetition: competition,
        ppcCompetitionLevel: competitionLevel,
        cpc,
        clientRank,
        competitorRank: compRank,
        clientUrl: clientUrlVal,
        competitorUrl: compUrlVal,
        competitorName: compDomain,
        classification,
        brandType,
        relevance,
        priority,
        priorityReason,
        suggestedAction,
      };

      // Si ya vimos esta keyword de otro competidor, mantener clasificacion
      // mas desfavorable (brecha > oportunidad > fortaleza)
      if (seenKeywords.has(kw)) {
        const existing = seenKeywords.get(kw)!;
        const rankOrder: Record<string, number> = {
          'brecha_competitiva': 4,
          'sin_presencia_detectada': 3,
          'oportunidad_mejora': 2,
          'fortaleza': 1,
          'descartada_validar': 0,
        };
        if ((rankOrder[classification] || 0) > (rankOrder[existing.classification] || 0)) {
          seenKeywords.set(kw, classified);
        }
      } else {
        seenKeywords.set(kw, classified);
      }
    }
  }

  // Ordenar Gap items
  const gapItems = Array.from(seenKeywords.values()).sort((a, b) => {
    // Primero por prioridad (alta > media > baja)
    const prioOrder: Record<string, number> = { 'alta': 3, 'media': 2, 'baja': 1 };
    const pDiff = (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    // Luego por volumen
    return (b.searchVolume || 0) - (a.searchVolume || 0);
  });

  // ── Build client keyword list ──
  const clientKeywords: DomainKeywordItem[] = [];
  if (clientRanked?.items) {
    for (const item of clientRanked.items) {
      const kd = item.keyword_data || {};
      const metrics = item.metrics || {};
      const perKwTraffic = metrics.organic?.etv != null ? metrics.organic.etv : null;
      clientKeywords.push({
        keyword: kd.keyword || '?',
        searchVolume: kd.keyword_info?.search_volume != null ? kd.keyword_info.search_volume : null,
        rankAbsolute: kd.ranked_serp_element?.serp_item?.rank_absolute ||
          item.ranked_serp_element?.serp_item?.rank_absolute ||
          null,
        estimatedTraffic: perKwTraffic,
      });
    }
  }

  // ── Build competitor keyword list (se usa para detectar busquedas que el cliente no cubre) ──
  const competitorKeywords: CompetitorKeywordItem[] = [];
  for (let i = 0; i < compDomains.length; i++) {
    const rk = compRankedResults[i];
    if (!rk?.items) continue;
    for (const item of rk.items) {
      const kd = item.keyword_data || {};
      competitorKeywords.push({
        domain: compDomains[i],
        keyword: kd.keyword || '?',
        searchVolume: kd.keyword_info?.search_volume != null ? kd.keyword_info.search_volume : null,
        rankAbsolute: kd.ranked_serp_element?.serp_item?.rank_absolute ||
          item.ranked_serp_element?.serp_item?.rank_absolute ||
          null,
        estimatedTraffic: item.metrics?.organic?.etv != null ? item.metrics.organic.etv : null,
      });
    }
  }

  // ── Catalogo de oferta real: rastreo del propio sitio del cliente (gratis) ──
  let offerCatalog: OfferCatalog | null = null;
  try {
    offerCatalog = await buildOfferCatalog(clientDomain);
  } catch {
    offerCatalog = null;
  }

  // ── Generate analysis report ──
  const report = generateReport(
    clientMetrics,
    compMetricsArray,
    gapItems,
    clientKeywords,
    clientDomain,
    compDomains,
    competitorKeywords,
    offerCatalog
  );

  const { visibilityGaps, competitorOverlap, monitoredKeywords } = computeVisibility(
    competitorKeywords,
    clientKeywords,
    gapItems,
    clientDomain,
    compDomains,
    offerCatalog
  );

  return {
    client: clientMetrics,
    competitors: compMetricsArray,
    gapItems,
    clientKeywords,
    competitorKeywords,
    visibilityGaps,
    monitoredKeywords,
    offerCatalog,
    competitorOverlap,
    totalCost,
    analyzedAt: startTime,
    report,
  };
}

/**
 * Recalcula la clasificacion y el informe a partir de un resultado ya guardado,
 * sin volver a consultar DataForSEO ni gastar creditos.
 */
export function rebuildReport(stored: any, catalogIn?: OfferCatalog | null): any {
  const clientDomain: string = stored?.client?.domain;
  const offerCatalog: OfferCatalog | null = catalogIn || stored?.offerCatalog || null;
  const competitors: DomainMetrics[] = stored?.competitors || [];
  const compDomains = competitors.map((c) => c.domain);
  const rawItems: ClassifiedGapItem[] = stored?.gapItems || [];

  const rankOrder: Record<string, number> = {
    'brecha_competitiva': 4,
    'sin_presencia_detectada': 3,
    'oportunidad_mejora': 2,
    'fortaleza': 1,
    'descartada_validar': 0,
  };

  const seenKeywords = new Map<string, ClassifiedGapItem>();
  for (const it of rawItems) {
    const brandType = detectBrandType(it.keyword, clientDomain, compDomains);
    const relevance = evaluateRelevance(it.keyword, brandType, clientDomain);
    const { classification, priority, priorityReason, suggestedAction } = classifyGapItem(
      it.clientRank,
      it.competitorRank,
      it.keyword,
      clientDomain,
      compDomains,
      relevance,
      brandType
    );
    const classified: ClassifiedGapItem = {
      ...it,
      brandType,
      relevance,
      classification,
      priority,
      priorityReason,
      suggestedAction,
    };
    const prev = seenKeywords.get(it.keyword);
    if (!prev || (rankOrder[classification] || 0) > (rankOrder[prev.classification] || 0)) {
      seenKeywords.set(it.keyword, classified);
    }
  }

  const prioOrder: Record<string, number> = { 'alta': 3, 'media': 2, 'baja': 1 };
  const gapItems = Array.from(seenKeywords.values()).sort((a, b) => {
    const pDiff = (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return (b.searchVolume || 0) - (a.searchVolume || 0);
  });

  const competitorKeywords: CompetitorKeywordItem[] = stored.competitorKeywords || [];
  const report = generateReport(
    stored.client,
    competitors,
    gapItems,
    stored.clientKeywords || [],
    clientDomain,
    compDomains,
    competitorKeywords,
    offerCatalog
  );

  const { visibilityGaps, competitorOverlap, monitoredKeywords } = computeVisibility(
    competitorKeywords,
    stored.clientKeywords || [],
    gapItems,
    clientDomain,
    compDomains,
    offerCatalog
  );

  return { ...stored, gapItems, visibilityGaps, monitoredKeywords, offerCatalog, competitorOverlap, report };
}

export default {
  runAnalysis,
  rebuildReport,
  getDomainOverview,
  getRankedKeywords,
  getDomainIntersection,
};
