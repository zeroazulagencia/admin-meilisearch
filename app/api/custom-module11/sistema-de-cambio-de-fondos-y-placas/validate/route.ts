import { NextResponse } from 'next/server';
import { lookup, resolve4 } from 'dns/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { getConfig } from '@/utils/modulos/sistema-de-cambio-de-fondos-y-placas/config';

export const dynamic = 'force-dynamic';

function isValidUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidPath(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith('/');
}

export async function POST() {
  try {
    const autolarteBaseUrl = await getConfig('autolarte_base_url');
    const wpApiBaseUrl = await getConfig('wp_api_base_url');
    const wpApiToken = await getConfig('wp_api_token');
    const wpApiListEndpoint = (await getConfig('wp_api_list_large_endpoint')) || '/wp-json/za-plate/v1/list-large';
    const wpApiGetBase64Endpoint = (await getConfig('wp_api_get_base64_endpoint')) || '/wp-json/za-plate/v1/get-base64';
    const uploadsPath = await getConfig('uploads_path');
    const cronjobsPath = await getConfig('cronjobs_path');
    const plateAssistantPath = await getConfig('plate_assistant_path');
    const replicateToken = await getConfig('replicate_api_token');
    const replicateModel = (await getConfig('replicate_model')) || 'bria/generate-background';
    const rapidapiKey = await getConfig('rapidapi_key');
    const rapidapiHost = (await getConfig('rapidapi_host')) || 'cars-image-background-removal.p.rapidapi.com';
    const rapidapiEndpoint = (await getConfig('rapidapi_endpoint')) || '/v1/results?mode=fg-image-shadow-hideclp';
    const categoryJsonPath = await getConfig('category_json_path');
    const vehiclesJsonPath = await getConfig('vehicles_json_path');
    const serverSearchUrl = await getConfig('server_search_url');
    const concesionarioJsonUrl = await getConfig('concesionario_json_url');
    const concesionarioEffectiveUrl = concesionarioJsonUrl || 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json';

    const results: Record<string, string> = {};
    const details: Record<string, string> = {};

    results.autolarte_base_url = isValidUrl(autolarteBaseUrl) ? 'ok' : 'invalid_url';
    results.wp_api_base_url = isValidUrl(wpApiBaseUrl) ? 'ok' : 'invalid_url';
    results.server_search_url = isValidUrl(serverSearchUrl) ? 'ok' : 'invalid_url';
    results.uploads_path = isValidPath(uploadsPath) ? 'ok' : 'invalid_path';
    results.cronjobs_path = isValidPath(cronjobsPath) ? 'ok' : 'invalid_path';
    results.plate_assistant_path = isValidPath(plateAssistantPath) ? 'ok' : 'invalid_path';
    results.category_json_path = isValidPath(categoryJsonPath) ? 'ok' : 'invalid_path';
    results.vehicles_json_path = isValidPath(vehiclesJsonPath) ? 'ok' : 'invalid_path';
    results.concesionario_json_url = isValidUrl(concesionarioEffectiveUrl) ? 'ok' : 'invalid_url';
    if (!concesionarioJsonUrl) details.concesionario_json_url = 'default';

    if (!wpApiBaseUrl) {
      results.wp_api_token = 'missing';
    } else if (!wpApiToken) {
      results.wp_api_token = 'missing';
    } else {
      try {
        const url = `${wpApiBaseUrl.replace(/\/$/, '')}${wpApiListEndpoint}?min_kb=1`;
        const auth = wpApiToken.startsWith('Basic ') || wpApiToken.startsWith('Bearer ')
          ? wpApiToken
          : `Basic ${Buffer.from(wpApiToken).toString('base64')}`;
        const res = await fetch(url, { headers: { Authorization: auth } });
        if (res.status === 401 || res.status === 403) {
          results.wp_api_token = 'invalid';
        } else if (!res.ok) {
          results.wp_api_token = `error_${res.status}`;
          const text = await res.text().catch(() => '');
          if (text) details.wp_api_token = text.slice(0, 200);
        } else {
          results.wp_api_token = 'ok';
        }
      } catch (err: any) {
        results.wp_api_token = 'fetch_failed';
        details.wp_api_token = err?.message || 'fetch_failed';
      }
    }

    if (!replicateToken) {
      results.replicate_api_token = 'missing';
    } else {
      const modelUrl = `https://api.replicate.com/v1/models/${replicateModel}`;
      try {
        const res = await fetch(modelUrl, {
          headers: { Authorization: `Token ${replicateToken}` },
        });
        if (res.status === 401 || res.status === 403) {
          results.replicate_api_token = 'invalid';
        } else if (!res.ok) {
          results.replicate_api_token = `error_${res.status}`;
        } else {
          results.replicate_api_token = 'ok';
        }
      } catch (err: any) {
        results.replicate_api_token = 'fetch_failed';
        details.replicate_api_token = err?.message || 'fetch_failed';
      }
    }

    if (!rapidapiKey) {
      results.rapidapi_key = 'missing';
    } else {
      const normalizedEndpoint = rapidapiEndpoint.startsWith('http')
        ? rapidapiEndpoint
        : `https://${rapidapiHost}${rapidapiEndpoint.startsWith('/') ? '' : '/'}${rapidapiEndpoint}`;
      const testUrl = normalizedEndpoint;
      try {
        const lookupResult = await lookup(rapidapiHost).catch((err: any) => {
          details.rapidapi_host = err?.message || 'dns_lookup_failed';
          return null;
        });
        if (lookupResult) {
          details.rapidapi_host = `resolved:${lookupResult.address}`;
        }

        const resolvedIps = await resolve4(rapidapiHost).catch(() => [] as string[]);
        if (resolvedIps.length) {
          details.rapidapi_host_ips = resolvedIps.join(',');
          let ipsetAvailable = false;
          try {
            const listResult = await execAsync('ipset list -name');
            const names = (listResult?.stdout || '').split('\n').map((line) => line.trim()).filter(Boolean);
            ipsetAvailable = names.includes('egress_allow_v4');
            if (!ipsetAvailable && names.length) details.rapidapi_ipset = `no_egress_allow_v4:${names.join(',')}`;
          } catch (err: any) {
            details.rapidapi_ipset = 'ipset_not_available';
          }
          if (ipsetAvailable) {
            const resultsLines: string[] = [];
            for (const ip of resolvedIps) {
              try {
                await execAsync(`ipset add egress_allow_v4 ${ip} -exist`);
                resultsLines.push(`${ip}:added`);
              } catch (err: any) {
                resultsLines.push(`${ip}:error`);
              }
            }
            details.rapidapi_ipset = resultsLines.join(',');
          }
        }
        const body = new URLSearchParams({
          url: 'https://storage.googleapis.com/api4ai-static/samples/img-bg-removal-cars-1.jpg',
        });
        const res = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-RapidAPI-Key': rapidapiKey,
            'X-RapidAPI-Host': rapidapiHost,
          },
          body,
        });
        if (res.status === 401 || res.status === 403) {
          results.rapidapi_key = 'invalid';
        } else if (!res.ok) {
          results.rapidapi_key = `error_${res.status}`;
          const text = await res.text().catch(() => '');
          if (text) details.rapidapi_key = text.slice(0, 300);
        } else {
          results.rapidapi_key = 'ok';
        }
      } catch (err: any) {
        results.rapidapi_key = 'fetch_failed';
        details.rapidapi_key = err?.message || 'fetch_failed';
        if (err?.cause?.code) details.rapidapi_error_code = err.cause.code;
        if (err?.code) details.rapidapi_error_code = err.code;
        if (err?.cause?.message) details.rapidapi_error_message = err.cause.message;
        details.rapidapi_url = testUrl;
      }
    }

    results.wp_api_get_base64_endpoint = wpApiGetBase64Endpoint ? 'ok' : 'missing';

    const summary = Object.values(results).every((v) => v === 'ok')
      ? 'Validacion OK'
      : 'Validacion con alertas';

    return NextResponse.json({ ok: true, results, details, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
