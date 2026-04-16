import { getConfig } from './config';

export async function generateBackground(imageUrl: string, prompt: string) {
  const token = await getConfig('replicate_api_token');
  const model = (await getConfig('replicate_model')) || 'bria/generate-background';
  if (!token) throw new Error('replicate_api_token no configurado');

  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        image: imageUrl,
        bg_prompt: prompt,
      },
    }),
  });

  const json = await res.json().catch(() => ({} as Record<string, any>));
  const compact = (value: unknown) => {
    try {
      const raw = JSON.stringify(value);
      return raw.length > 500 ? `${raw.slice(0, 500)}...` : raw;
    } catch {
      return String(value);
    }
  };

  if (!res.ok) {
    const info = {
      status: res.status,
      status_text: res.statusText,
      id: json?.id,
      status_rep: json?.status,
      error: json?.error,
      detail: json?.detail,
    };
    throw new Error(`Replicate error: ${compact(info)}`);
  }

  const output = json?.output?.[0];
  if (!output) {
    const info = {
      status: res.status,
      id: json?.id,
      status_rep: json?.status,
      error: json?.error,
      detail: json?.detail,
    };
    throw new Error(`Replicate sin output: ${compact(info)}`);
  }

  return output as string;
}
