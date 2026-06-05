import { getConfig } from './module22-config';

const SIIGO_AUTH_URL = 'https://api.siigo.com/auth';

interface SiigoTokenCache {
  token: string;
  expiresAt: number; // timestamp ms
}

let tokenCache: SiigoTokenCache | null = null;

const TTL_MS = 23 * 60 * 60 * 1000; // 23h (token es 24h, renovamos antes)

export async function getSiigoToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const username = await getConfig('siigo_username');
  const accessKey = await getConfig('siigo_access_key');

  if (!username || !accessKey) {
    throw new Error('Siigo credentials not configured');
  }

  const res = await fetch(SIIGO_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-Id': 'biury' },
    body: JSON.stringify({ username, access_key: accessKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Siigo auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + TTL_MS,
  };

  return tokenCache.token;
}
