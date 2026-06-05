import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from './module22-config';
import { getSiigoToken } from './siigo-auth';

export async function verifyBridgeAccess(req: NextRequest): Promise<NextResponse | true> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) return NextResponse.json({ ok: false, error: 'Authorization header required' }, { status: 401 });

  const bridgeKey = await getConfig('access_key');
  if (!bridgeKey || token !== bridgeKey) {
    return NextResponse.json({ ok: false, error: 'Invalid access_key' }, { status: 401 });
  }

  return true;
}

export async function siigoFetch(path: string, options: { method?: string; body?: any; params?: URLSearchParams } = {}) {
  const token = await getSiigoToken();
  const url = new URL(path, 'https://api.siigo.com');
  if (options.params) url.search = options.params.toString();

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
      'Partner-Id': 'biury',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Siigo API error (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
