import { getConfig, setConfig } from './config';
import { refreshDropboxAccessToken, validateDropboxToken } from './dropbox';

function isTokenExpiredError(error: string | undefined): boolean {
  if (!error) return false;
  return error.includes('invalid_access_token') || error.includes('expired_access_token');
}

export async function getDropboxAccessToken(): Promise<{ ok: boolean; token?: string; error?: string }> {
  let token = await getConfig('dropbox_access_token');
  if (token) {
    const tokenCheck = await validateDropboxToken(token);
    if (tokenCheck.ok) {
      return { ok: true, token };
    }

    if (!isTokenExpiredError(tokenCheck.error)) {
      return { ok: false, error: tokenCheck.error || 'dropbox_access_token invalido' };
    }
  }

  const appKey = await getConfig('dropbox_app_key');
  const appSecret = await getConfig('dropbox_app_secret');
  const refreshToken = await getConfig('dropbox_refresh_token');
  if (!appKey || !appSecret || !refreshToken) {
    return { ok: false, error: 'dropbox_access_token no configurado' };
  }

  const refresh = await refreshDropboxAccessToken(appKey, appSecret, refreshToken);
  if (!refresh.ok || !refresh.accessToken) {
    return { ok: false, error: refresh.error || 'Error al refrescar token de Dropbox' };
  }

  await setConfig('dropbox_access_token', refresh.accessToken);
  token = refresh.accessToken;

  const recheck = await validateDropboxToken(token);
  if (!recheck.ok) {
    return { ok: false, error: recheck.error || 'dropbox_access_token invalido' };
  }

  return { ok: true, token };
}
