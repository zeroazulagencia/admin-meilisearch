/**
 * Módulo 28 - Analizador GAP SEO + GEO
 * POST /recompute/: Recalcula clasificación e informe desde el último resultado
 * guardado. No consulta DataForSEO ni consume créditos.
 */
import { NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/analizador-gap-seo-geo/config';
import { rebuildReport } from '@/utils/modulos/analizador-gap-seo-geo/dataforseo';
import { buildOfferCatalog } from '@/utils/modulos/analizador-gap-seo-geo/offer-catalog';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  try {
    const raw = await getConfig('last_analysis_result');
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: 'No hay análisis previo guardado' },
        { status: 400 }
      );
    }

    const stored = JSON.parse(raw);

    // Catalogo de oferta real (rastreo del propio sitio; sin costo de API).
    let catalog = null;
    try {
      catalog = await buildOfferCatalog(stored?.client?.domain || '');
    } catch {
      catalog = null;
    }

    const updated = rebuildReport(stored, catalog);

    await query(
      `INSERT INTO modulos_luis_28_config (config_key, config_value) VALUES ('last_analysis_result', ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [JSON.stringify(updated)]
    );

    const items: any[] = updated.gapItems || [];
    const count = (c: string) => items.filter((i) => i.classification === c).length;

    return NextResponse.json({
      ok: true,
      result: updated,
      summary: {
        total: items.length,
        fortalezas: count('fortaleza'),
        brechas: count('brecha_competitiva'),
        oportunidades: count('oportunidad_mejora'),
        sinPresencia: count('sin_presencia_detectada'),
        descartadas: count('descartada_validar'),
      },
      note: 'Informe recalculado desde el análisis guardado. No se consumieron créditos de DataForSEO.',
    });
  } catch (e: any) {
    console.error('Recompute error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error interno del recálculo' },
      { status: 500 }
    );
  }
}