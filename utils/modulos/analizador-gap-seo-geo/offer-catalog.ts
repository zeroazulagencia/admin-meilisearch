/**
 * Catálogo de oferta real del cliente.
 *
 * Rastrea el propio sitio (sitemap + páginas publicadas) para saber QUÉ vende el
 * cliente: productos, servicios, modelos, sedes. Con eso se decide si una
 * búsqueda del competidor merece monitoreo: solo si el cliente realmente ofrece
 * eso. Crawling propio = sin costo de API.
 */

export interface OfferCatalog {
  /** Tokens normalizados presentes en el sitio (títulos, H1-H3, meta). */
  tokens: string[];
  /** Tema -> cantidad de menciones encontradas en el sitio. */
  topics: Record<string, number>;
  /** Páginas rastreadas / total descubierto. */
  pageCount: number;
  totalUrls: number;
  fetchedAt: string;
  source: string;
}

/** Temas de oferta. El token debe existir en el sitio para contar. */
export const OFFER_TOPICS: Record<string, string[]> = {
  Marca: ['kenworth', 'daf', 'kw', 'trp'],
  Merchandising: ['merchandising', 'gorra', 'gorro', 'chaqueta', 'chaleco', 'ropa', 'accesorio', 'accesorios', 'medalla', 'camiseta', 'souvenir', 'buzo'],
  'Taller y servicio': ['taller', 'talleres', 'mantenimiento', 'mantenimientos', 'pintura', 'lubriexpress', 'mecanica', 'diagnostico', 'reparacion', 'soldadura', 'alineacion', 'balanceo', 'servicio', 'servicios', 'posventa', 'lubricacion', 'revision'],
  Repuestos: ['repuesto', 'repuestos', 'filtro', 'filtros', 'lubricante', 'lubricantes', 'aceite', 'autoparte', 'autopartes', 'refaccion', 'refacciones', 'pastilla', 'pastillas', 'llanta', 'llantas', 'rin', 'rines'],
  Vehiculos: ['camion', 'camiones', 'tractomula', 'tractomulas', 'tractocamion', 'tractocamiones', 'volqueta', 'volquetas', 'minimula', 'minimulas', 'mixer', 'mixers', 'compactador', 'chasis', 'cabezal', 'mula', 'mulas', 'usado', 'usados', 'vehiculo', 'vehiculos', 'furgon', 'estaca', 'platon'],
  Modelos: ['t880', 't680', 't380', 't480', 't370', 't600', 't800', 'w900', 'w990', 'next', 'gen', 'xf', 'cf', 'lf', 'xfc', 'ngd', 'premium'],
};

const STOP = new Set(
  'de del en la el los las un una y o para con por al colombia com co www http https index html precio precios cuanto vale cuesta cuánto nueva nuevo nuevas nuevos mas mas-mejor mejor que es son donde cual cuales como cuando tiene hay esta estan están 2024 2025 2026 2027 2028 km km2 sedes sede menu menú politica politicas políticas contacto cuenta carrito archivos categoria categoría tipo combustible marca marcas modelo modelos pagina página home inicio'.split(
    ' ',
  ),
);

export function stripAccents(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stem(t: string): string {
  if (t.length > 4 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
  return t;
}

/** Tokens significativos de un texto (sin acentos, sin stopwords). */
function tokenize(s: string): string[] {
  return stripAccents((s || '').toLowerCase())
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map(stem);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const UA = 'Mozilla/5.0 (compatible; KenworthOfertaBot/1.0)';
const SKIP_SITEMAP = /(jet-menu|jet-popup|jet-woo|author|post_tag|product_tag|category-sitemap)/i;

async function get(url: string, timeoutMs = 20000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xml,*/*' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

function locs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => m[1]);
}

export interface OfferMatch {
  topics: string[];
  tokens: string[];
}

/**
 * ¿El cliente ofrece realmente lo que pide esta búsqueda?
 * Regla estricta: TODOS los tokens significativos deben existir en el sitio y al
 * menos uno debe pertenecer a un tema de oferta. Así "camion de bomberos" no
 * cuenta (no publicas bomberos) y "taller kenworth" sí (publicas taller).
 */
export function matchOffer(keyword: string, catalog: OfferCatalog | null | undefined): OfferMatch | null {
  if (!catalog || !catalog.tokens || !catalog.tokens.length) return null;
  const known = new Set(catalog.tokens);
  const tokens = tokenize(keyword);
  if (!tokens.length) return null;
  if (tokens.some((t) => !known.has(t))) return null;
  const topics: string[] = [];
  for (const [topic, words] of Object.entries(OFFER_TOPICS)) {
    const mapped = words.map(stem);
    if (tokens.some((t) => mapped.includes(t))) topics.push(topic);
  }
  if (!topics.length) return null;
  return { topics, tokens };
}

/** ¿El token representa un tema de oferta (aunque no esté en el sitio)? */
export function topicTokens(): Set<string> {
  const s = new Set<string>();
  for (const words of Object.values(OFFER_TOPICS)) for (const w of words) s.add(stem(w));
  return s;
}

/**
 * Rastrea el sitio del cliente y devuelve su catálogo de oferta.
 * Cachea en disco 7 días (crawling propio: gratis).
 */
export async function buildOfferCatalog(clientDomain: string, force = false): Promise<OfferCatalog> {
  const domain = (clientDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const cacheDir = `${process.cwd()}/storage/analizador-gap-seo-geo`;
  const cacheFile = `${cacheDir}/offer-catalog-${domain}.json`;
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;

  if (!force) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(cacheFile)) {
        const cached: OfferCatalog = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        const age = Date.now() - new Date(cached.fetchedAt).getTime();
        if (cached.tokens?.length && age < TTL_MS) return cached;
      }
    } catch {
      /* cache ilegible: se reconstruye */
    }
  }

  const base = `https://${domain}`;
  let indexXml = await get(`${base}/sitemap_index.xml`);
  if (!locs(indexXml).length) indexXml = await get(`${base}/sitemap.xml`);

  let sitemaps = locs(indexXml).filter((u) => /\.xml/i.test(u) && !SKIP_SITEMAP.test(u));
  if (!sitemaps.length) sitemaps = [`${base}/sitemap.xml`];

  const urlSet = new Set<string>();
  for (const sm of sitemaps.slice(0, 12)) {
    const xml = await get(sm);
    for (const u of locs(xml)) {
      if (!/\.xml/i.test(u) && u.startsWith('http')) urlSet.add(u.replace(/\/$/, ''));
    }
  }
  const urls = Array.from(urlSet).slice(0, 140);

  const tokens = new Set<string>();
  const topics: Record<string, number> = {};
  let pageCount = 0;

  const consume = (text: string, weight: number) => {
    for (const t of tokenize(text)) {
      tokens.add(t);
      for (const [topic, words] of Object.entries(OFFER_TOPICS)) {
        if (words.map(stem).includes(t)) topics[topic] = (topics[topic] || 0) + weight;
      }
    }
  };

  const CONCURRENCY = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const html = await get(url, 15000);
      if (!html || html.length < 200) continue;
      pageCount++;
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || '';
      const heads = Array.from(html.matchAll(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi))
        .map((m) => htmlToText(m[1]))
        .filter((h) => h && h.length < 120)
        .slice(0, 24);
      consume(htmlToText(title), 3);
      consume(heads.join(' . '), 2);
      consume(desc, 1);
      const slug = url.replace(base, '').replace(/[/-]/g, ' ');
      consume(slug, 2);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const catalog: OfferCatalog = {
    tokens: Array.from(tokens).sort(),
    topics,
    pageCount,
    totalUrls: urls.length,
    fetchedAt: new Date().toISOString(),
    source: `${base}/sitemap_index.xml`,
  };
  try {
    const fs = await import('fs');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(catalog), 'utf8');
  } catch {
    /* sin cache: se recalcula */
  }
  return catalog;
}