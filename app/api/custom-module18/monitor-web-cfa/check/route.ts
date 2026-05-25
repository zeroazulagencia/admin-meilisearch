import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/monitor-web-cfa-18/config';
import { insertCheckLog } from '@/utils/modulos/monitor-web-cfa-18/logs';
import { checkAndAlert } from '@/utils/modulos/monitor-web-cfa-18/alert';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Patrones que indican una página de bloqueo WAF
const WAF_INDICATORS = [
  'cloudflare',
  'attention required',
  'just a moment...',
  'checking your browser',
  'cf-browser-verification',
  '403 forbidden',
  'access denied',
  'please enable javascript',
  'challenge-platform',
  'cdn-cgi',
  'you have been blocked',
  'blocked due to',
  'security check',
  'detected unusual traffic',
  'under attack',
  'ddos protection',
];

// Headers que simulan un navegador real
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function detectWAF(body: string, statusCode: number): boolean {
  if (statusCode === 403 || statusCode === 429) return true;
  const lower = body.toLowerCase();
  return WAF_INDICATORS.some((indicator) => lower.includes(indicator));
}

function isContentValid(body: string, statusCode: number): boolean {
  if (statusCode !== 200) return false;
  if (!body || body.trim().length < 100) return false;
  // Debe contener HTML real
  if (!body.includes('<') || !body.includes('>')) return false;
  // No debe ser solo un JSON vacío o error
  if (body.trim().startsWith('{') && body.includes('"error"')) return false;
  return true;
}

async function performCheck(targetUrl: string) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startTime;
    const body = await response.text();
    const statusCode = response.status;
    const contentLength = body.length;

    const wafDetected = detectWAF(body, statusCode);
    const contentValid = isContentValid(body, statusCode);

    let errorMessage: string | null = null;
    if (statusCode !== 200) {
      errorMessage = `HTTP ${statusCode}`;
    } else if (wafDetected) {
      errorMessage = 'Posible bloqueo WAF detectado';
    } else if (!contentValid) {
      errorMessage = 'Contenido HTML inválido o insuficiente';
    }

    return {
      statusCode,
      responseTimeMs,
      contentValid,
      contentLength,
      errorMessage,
      wafDetected,
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error?.name === 'AbortError'
      ? 'Timeout (25s)'
      : error?.message || 'Error de conexión';

    return {
      statusCode: null,
      responseTimeMs,
      contentValid: false,
      contentLength: null,
      errorMessage,
      wafDetected: false,
    };
  }
}

export async function POST() {
  try {
    const config = await getRuntimeConfig();
    if (!config.enabled) {
      return NextResponse.json({ ok: false, error: 'Módulo deshabilitado' }, { status: 400 });
    }

    const result = await performCheck(config.url);

    // Guardar log en BD
    await insertCheckLog({
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      contentValid: result.contentValid,
      contentLength: result.contentLength,
      errorMessage: result.errorMessage,
      wafDetected: result.wafDetected,
    });

    // Verificar si hay que enviar alerta por correo (3+ fallos consecutivos)
    const alertResult = await checkAndAlert();

    return NextResponse.json({
      ok: true,
      check: result,
      alert: alertResult,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error en verificación' }, { status: 500 });
  }
}