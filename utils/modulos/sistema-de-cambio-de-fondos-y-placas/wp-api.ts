import { getConfig } from './config';

function buildAuthHeader(token: string | null) {
  if (!token) return null;
  if (token.startsWith('Basic ') || token.startsWith('Bearer ')) return token;
  const encoded = Buffer.from(token).toString('base64');
  return `Basic ${encoded}`;
}

async function getBaseUrl() {
  const baseUrl = await getConfig('wp_api_base_url');
  if (!baseUrl) throw new Error('wp_api_base_url no configurado');
  return baseUrl.replace(/\/$/, '');
}

async function fetchWp(path: string, options: RequestInit = {}) {
  const baseUrl = await getBaseUrl();
  const token = await getConfig('wp_api_token');
  const auth = buildAuthHeader(token);
  const headers = {
    ...(options.headers || {}),
    ...(auth ? { Authorization: auth } : {}),
  } as Record<string, string>;
  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return res;
}

export async function wpUploadImage(params: { plate: string; side: string; imageBase64?: string; imageUrl?: string }) {
  const endpoint = (await getConfig('wp_api_upload_endpoint')) || '/wp-json/za-plate/v1/upload';
  const body = {
    plate: params.plate,
    side: params.side,
    image_base64: params.imageBase64,
    image_url: params.imageUrl,
  };
  const res = await fetchWp(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

export async function wpOverrideImage(params: { filename: string; imageBase64: string }) {
  const endpoint = (await getConfig('wp_api_override_endpoint')) || '/wp-json/za-plate/v1/override';
  const body = {
    filename: params.filename,
    image_base64: params.imageBase64,
  };
  const res = await fetchWp(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

export async function wpListLarge(minKb = 600) {
  const endpoint = (await getConfig('wp_api_list_large_endpoint')) || '/wp-json/za-plate/v1/list-large';
  const res = await fetchWp(`${endpoint}?min_kb=${minKb}`, { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

export async function wpGetBase64(params: { filename?: string; plate?: string; side?: string }) {
  const endpoint = (await getConfig('wp_api_get_base64_endpoint')) || '/wp-json/za-plate/v1/get-base64';
  const query = new URLSearchParams();
  if (params.filename) query.set('filename', params.filename);
  if (params.plate) query.set('plate', params.plate);
  if (params.side) query.set('side', params.side);
  const res = await fetchWp(`${endpoint}?${query.toString()}`, { method: 'GET' });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}
