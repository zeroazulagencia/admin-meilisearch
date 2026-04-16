type DropboxEntry = {
  '.tag'?: string;
  name?: string;
  path_display?: string;
};

const DROPBOX_API = 'https://api.dropboxapi.com/2';

async function dropboxPostJson<T>(endpoint: string, token: string, body: Record<string, unknown> | null): Promise<{ ok: boolean; data?: T; error?: string }>
{
  const res = await fetch(`${DROPBOX_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `${res.status} ${text}` };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}

export async function validateDropboxToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${DROPBOX_API}/users/get_current_account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: 'null',
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Dropbox token invalido: ${res.status} ${text}` };
  }

  return { ok: true };
}

export async function refreshDropboxAccessToken(
  appKey: string,
  appSecret: string,
  refreshToken: string
): Promise<{ ok: boolean; accessToken?: string; error?: string }> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: appKey,
    client_secret: appSecret,
  });

  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Dropbox refresh failed: ${res.status} ${text}` };
  }

  const json = await res.json().catch(() => ({} as any));
  const accessToken = json?.access_token || null;
  if (!accessToken) {
    return { ok: false, error: 'Dropbox refresh failed: access_token missing' };
  }

  return { ok: true, accessToken };
}

type ListFolderResponse = { entries: DropboxEntry[]; cursor: string; has_more: boolean };

export async function listDropboxBackupPaths(token: string, folderPath: string, prefix: string): Promise<{ ok: boolean; paths: string[]; error?: string }> {
  const paths: string[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const result: { ok: boolean; data?: ListFolderResponse; error?: string } = cursor
      ? await dropboxPostJson<ListFolderResponse>('/files/list_folder/continue', token, { cursor })
      : await dropboxPostJson<ListFolderResponse>('/files/list_folder', token, { path: folderPath, recursive: false });

    if (!result.ok || !result.data) {
      return { ok: false, paths, error: result.error || 'Error al listar backups en Dropbox' };
    }

    for (const entry of result.data.entries || []) {
      if (entry['.tag'] !== 'file') continue;
      const name = entry.name || '';
      const path = entry.path_display || '';
      if (name.startsWith(prefix) && name.endsWith('.dump.gz') && path) {
        paths.push(path);
      }
    }

    cursor = result.data.cursor;
    hasMore = result.data.has_more;
  }

  return { ok: true, paths };
}

export async function deleteDropboxPaths(token: string, paths: string[]): Promise<{ ok: boolean; deleted: number; error?: string }> {
  if (paths.length === 0) {
    return { ok: true, deleted: 0 };
  }

  let deleted = 0;
  for (let i = 0; i < paths.length; i += 1000) {
    const batch = paths.slice(i, i + 1000);
    const result = await dropboxPostJson('/files/delete_batch', token, {
      entries: batch.map((path) => ({ path })),
    });

    if (!result.ok) {
      return { ok: false, deleted, error: result.error || 'Error al eliminar backups en Dropbox' };
    }

    deleted += batch.length;
  }

  return { ok: true, deleted };
}
