/**
 * Módulo 28 - Analizador GAP SEO + GEO
 * POST /analyze/: Ejecuta análisis completo contra DataForSEO
 * GET  /analyze/: Devuelve último resultado almacenado
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/analizador-gap-seo-geo/config';
import { runAnalysis } from '@/utils/modulos/analizador-gap-seo-geo/dataforseo';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // up to 60s for API calls

/**
 * POST: Execute analysis
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read config from DB
    const [authBase64, clientUrl, competitorUrlsRaw] = await Promise.all([
      getConfig('api_key_base64'),
      getConfig('client_url'),
      getConfig('competitor_urls'),
    ]);

    if (!authBase64) {
      return NextResponse.json(
        { ok: false, error: 'Credenciales API For SEO no configuradas' },
        { status: 400 }
      );
    }
    if (!clientUrl) {
      return NextResponse.json(
        { ok: false, error: 'URL del cliente no configurada' },
        { status: 400 }
      );
    }

    let competitorUrls: string[] = [];
    if (competitorUrlsRaw) {
      try {
        competitorUrls = JSON.parse(competitorUrlsRaw);
      } catch {
        competitorUrls = competitorUrlsRaw
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    if (competitorUrls.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Al menos un competidor debe estar configurado' },
        { status: 400 }
      );
    }

    // 2. Run analysis
    const result = await runAnalysis(authBase64, clientUrl, competitorUrls);

    // 3. Store result in DB (JSON)
    const resultJson = JSON.stringify(result);
    await query(
      `INSERT INTO modulos_luis_28_config (config_key, config_value) VALUES ('last_analysis_result', ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [resultJson]
    );

    // 4. Estimate cost summary for return
    const estimatedCost = result.totalCost.toFixed(4);

    return NextResponse.json({
      ok: true,
      result,
      costs: {
        estimated: estimatedCost,
        tasks_count: 2 + competitorUrls.length * 3, // overview + ranked + intersection per competitor
      },
      note: 'Costos estimados basados en promedios de DataForSEO. Los costos reales pueden variar ±20%.',
    });
  } catch (e: any) {
    console.error('Analyze error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error interno del análisis' },
      { status: 500 }
    );
  }
}

/**
 * GET: Return last stored analysis result
 */
export async function GET() {
  try {
    const raw = await getConfig('last_analysis_result');
    if (!raw) {
      return NextResponse.json({
        ok: true,
        hasResult: false,
        result: null,
      });
    }
    const result = JSON.parse(raw);
    return NextResponse.json({
      ok: true,
      hasResult: true,
      result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message },
      { status: 500 }
    );
  }
}