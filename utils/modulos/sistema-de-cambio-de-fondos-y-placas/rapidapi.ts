import { getConfig } from './config';

export async function processRapidApi(imageUrl: string) {
  const key = await getConfig('rapidapi_key');
  const host = (await getConfig('rapidapi_host')) || 'cars-image-background-removal.p.rapidapi.com';
  const endpoint = (await getConfig('rapidapi_endpoint')) || '/v1/results?mode=fg-image-shadow-hideclp';

  if (!key) throw new Error('rapidapi_key no configurado');

  const url = `https://${host}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const body = new URLSearchParams({
    url: imageUrl,
    'url-bg': imageUrl,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  const imageBase64 = json?.results?.[0]?.entities?.[0]?.image;
  if (!imageBase64) {
    throw new Error('Respuesta RapidAPI sin imagen');
  }

  return imageBase64 as string;
}
