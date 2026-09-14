/**
 * Módulo 28 - Analizador GAP SEO + GEO
 * POST /ai-presence/: Consulta asistentes de IA vía OpenRouter para evaluar presencia del cliente.
 * GET  /ai-presence/: Devuelve último resultado almacenado.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/analizador-gap-seo-geo/config';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // up to 2 min for multiple AI calls

/** Asociación cron <-> módulo, guardada en modulos_luis_28_config.ai_presence_cron */
interface CronAssociation {
  enabled: boolean;
  every_days: number;
  schedule: string;
  schedule_human?: string;
  job_id: string;
  endpoint?: string;
  last_run_at?: string;
  last_score?: number;
  last_mentions?: number;
  last_models_ok?: number;
  next_run_at?: string;
}

const MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
];

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

// Alias con los que los asistentes nombran al cliente cuando lo recomiendan
// sin citar la URL: marca comercial vs. dominio. En minusculas para comparar.
const BRAND_ALIASES = [
  'kenworth de la montaña',
  'kenworth de la montana',
  'kenworthcolombia',
  'kenworth colombia',
];

interface AiQueryResult {
  model: string;
  modelName: string;
  mentionsClient: boolean;
  mentionsBrand: boolean;
  snippet: string;
  status: 'ok' | 'error';
  error?: string;
}

interface AiPresenceResult {
  lastEvaluated: string;
  clientDomain: string;
  queries: {
    query: string;
    models: AiQueryResult[];
  }[];
  summary: {
    totalQueries: number;
    totalMentions: number;
    totalBrandMentions: number;
    modelsEvaluated: number;
    modelsOk: number;
    modelsErrored: number;
    score: number;
    brandScore: number;
  };
}

function extractDomain(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
}

async function queryAiModel(
  apiKey: string,
  modelId: string,
  modelName: string,
  queryText: string,
  clientDomain: string
): Promise<AiQueryResult> {
  const systemPrompt = `Eres un asistente de IA que responde preguntas sobre camiones y maquinaria pesada en Colombia. Responde de forma natural y útil.`;

  const userPrompt = queryText;

  try {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://workers.zeroazul.com',
        'X-Title': 'Analizador GAP SEO + GEO',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        // temperature 0: la medición debe ser reproducible. Con 0.3 el mismo
        // test daba 7% y luego 13%, lo que hacía parecer el dato inestable.
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        model: modelId,
        modelName,
        mentionsClient: false,
        mentionsBrand: false,
        snippet: '',
        status: 'error',
        error: `HTTP ${res.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || '';
    const snippet = content.slice(0, 500);

    // Mención válida = el dominio aparece en un contexto informativo.
    // Antes bastaba con que la URL saliera en el texto, así que una respuesta
    // tipo "no puedo confirmar la legitimidad de ese sitio" contaba como
    // mención y ensuciaba el porcentaje.
    const low = content.toLowerCase();
    const dom = clientDomain.toLowerCase();
    const idx = Math.max(low.indexOf(dom), low.indexOf(dom.replace(/^www\./, '')));
    let mentionsClient = false;
    if (idx >= 0) {
      const ctx = low.slice(Math.max(0, idx - 400), idx + 400);
      const NEGATIONS = [
        'no puedo confirmar',
        'no puedo verificar',
        'no es posible verificar',
        'no tengo informacion',
        'no tengo información',
        'no cuento con informacion',
        'no cuento con información',
        'no conozco',
        'no me consta',
        'sitio desconocido',
      ];
      mentionsClient = !NEGATIONS.some((n) => ctx.includes(n));
    }

    // Mencion de marca: el asistente nombra al cliente (por marca o dominio)
    // aunque no enlace la URL. Es la senal comercial relevante.
    const mentionsBrand = mentionsClient || BRAND_ALIASES.some((b) => low.includes(b));

    return {
      model: modelId,
      modelName,
      mentionsClient,
      mentionsBrand,
      snippet,
      status: 'ok',
    };
  } catch (e: any) {
    return {
      model: modelId,
      modelName,
      mentionsClient: false,
      mentionsBrand: false,
      snippet: '',
      status: 'error',
      error: e?.message || 'Error de conexión',
    };
  }
}

/**
 * Preguntas reales mas comunes de un comprador / usuario de camion en Colombia.
 * Es el set fijo que se evalua en cada corrida (intencion comercial: compra de
 * vehiculo nuevo, marca propia DAF, servicio tecnico, repuestos, usados y
 * merchandising). No incluye el dominio del cliente para no forzar la mencion.
 */
const USER_QUESTIONS: string[] = [
  '¿Dónde puedo comprar un camión Kenworth en Colombia?',
  '¿Dónde compro una DAF en Colombia?',
  '¿Dónde llevo mi camión Kenworth a servicio técnico en Colombia?',
  '¿Dónde consigo repuestos originales Kenworth en Colombia?',
  '¿Dónde compro un camión Kenworth usado en Colombia?',
  '¿Dónde venden gorras o merchandising de Kenworth en Colombia?',
];

function extractQueriesFromResult(lastResultRaw: string | null): string[] {
  if (!lastResultRaw) return [];
  try {
    const parsed = JSON.parse(lastResultRaw);
    const report = parsed?.report;
    const geo = report?.geo;
    if (geo?.suggestedQueries?.length > 0) {
      return geo.suggestedQueries.slice(0, 5);
    }
    // Fallback: use top client keywords
    const clientKeywords = parsed?.clientKeywords || [];
    if (clientKeywords.length > 0) {
      return clientKeywords
        .filter((k: any) => k.keyword)
        .slice(0, 5)
        .map((k: any) => k.keyword);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * POST: Execute AI presence evaluation
 */
export async function POST() {
  try {
    const [apiKey, clientUrl, lastResult] = await Promise.all([
      getConfig('openrouter_api_key'),
      getConfig('client_url'),
      getConfig('last_analysis_result'),
    ]);

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Clave API de OpenRouter no configurada. Ve a la pestaña Configuración.' },
        { status: 400 }
      );
    }
    if (!clientUrl) {
      return NextResponse.json(
        { ok: false, error: 'URL del cliente no configurada.' },
        { status: 400 }
      );
    }

    const clientDomain = extractDomain(clientUrl);

    // Set fijo: las preguntas reales mas comunes. Si por alguna razon quedara
    // vacio, se usa lo que haya en el analisis guardado como respaldo.
    let queriesToRun: string[] = [...USER_QUESTIONS];
    if (queriesToRun.length === 0) {
      queriesToRun = extractQueriesFromResult(lastResult);
    }

    // Se consultan SOLO búsquedas reales de usuarios.
    // Antes se anteponía una pregunta que incluía el dominio del cliente
    // ("¿Recomiendas <dominio>?"), lo que forzaba la mención y inflaba el
    // resultado: la primera fila siempre daba 3/3 y el % quedaba artificial.
    queriesToRun = queriesToRun.slice(0, 6);

    // Query each model for each query
    const results: AiPresenceResult['queries'] = [];
    let totalMentions = 0;
    let totalBrandMentions = 0;

    for (const q of queriesToRun) {
      const modelResults = await Promise.all(
        MODELS.map((m) => queryAiModel(apiKey, m.id, m.name, q, clientDomain))
      );
      totalMentions += modelResults.filter((r) => r.mentionsClient).length;
      totalBrandMentions += modelResults.filter((r) => r.mentionsBrand).length;
      results.push({ query: q, models: modelResults });
    }

    const totalQueries = queriesToRun.length;
    const modelsEvaluated = MODELS.length;
    const totalCalls = totalQueries * modelsEvaluated;
    const modelsOk = results.reduce(
      (acc, r) => acc + r.models.filter((m) => m.status === 'ok').length,
      0
    );
    const modelsErrored = totalCalls - modelsOk;
    // El score se calcula SOLO sobre llamadas exitosas, para no penalizar
    // al cliente por modelos que fallaron (timeout, 404, etc.).
    const score = modelsOk > 0 ? Math.round((totalMentions / modelsOk) * 100) : 0;
    // brandScore = veces que la marca o el dominio salen en las respuestas.
    // Es el indicador principal del tablero; el dominio citado (score) va aparte.
    const brandScore = modelsOk > 0 ? Math.round((totalBrandMentions / modelsOk) * 100) : 0;

    const result: AiPresenceResult = {
      lastEvaluated: new Date().toISOString(),
      clientDomain,
      queries: results,
      summary: {
        totalQueries,
        totalMentions,
        totalBrandMentions,
        modelsEvaluated,
        modelsOk,
        modelsErrored,
        score,
        brandScore,
      },
    };

    // Store in DB
    await setConfig('ai_presence_result', JSON.stringify(result));

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error('AI Presence error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * GET: Return last stored AI presence result
 */
export async function GET() {
  try {
    const [raw, rawCron] = await Promise.all([
      getConfig('ai_presence_result'),
      getConfig('ai_presence_cron'),
    ]);
    // Asociación del cron automático a este módulo (lo registra el job
    // Hermes 'Mod28 · Presencia en IA' cada vez que corre). Se devuelve junto
    // al resultado para que el tablero muestre cuándo es la próxima corrida.
    let cron: CronAssociation | null = null;
    if (rawCron) {
      try {
        cron = JSON.parse(rawCron) as CronAssociation;
      } catch {
        cron = null;
      }
    }
    if (!raw) {
      return NextResponse.json({
        ok: true,
        hasResult: false,
        result: null,
        cron,
      });
    }
    const result = JSON.parse(raw);
    return NextResponse.json({
      ok: true,
      hasResult: true,
      result,
      cron,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message },
      { status: 500 }
    );
  }
}