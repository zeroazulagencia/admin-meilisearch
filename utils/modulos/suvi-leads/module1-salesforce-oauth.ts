/**
 * MÓDULO 1 - SUVI LEADS
 * OAuth 2.0 para Salesforce con PKCE
 */
import { getConfig, setConfig } from './module1-config';
import crypto from 'crypto';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

// Generar code verifier y challenge para PKCE
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Obtener URL de OAuth de Salesforce
async function getSalesforceOAuthUrl(): Promise<string> {
  const instanceUrl = await getConfig('salesforce_instance_url');
  return instanceUrl || 'https://suvivienda.my.salesforce.com';
}

// Obtener tokens válidos (auto-refresh si expiraron)
export async function getSalesforceTokens(): Promise<{ accessToken: string; instanceUrl: string }> {
  let accessToken = await getConfig('salesforce_access_token');
  const instanceUrl = await getSalesforceOAuthUrl();
  const tokenExpiry = await getConfig('salesforce_token_expiry');

  // Verificar si el token expiró
  const now = Date.now();
  const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;

  if (!accessToken || now >= expiryTime) {
    console.log('[OAUTH] Token expirado o ausente, renovando...');
    const refreshed = await refreshAccessToken();
    accessToken = refreshed.access_token;
  }

  if (!accessToken) {
    throw new Error('No se pudo obtener un access token válido de Salesforce');
  }

  return { accessToken, instanceUrl };
}

// Renovar access token usando refresh token
export async function refreshAccessToken(): Promise<TokenResponse> {
  const refreshToken = await getConfig('salesforce_refresh_token');
  const clientId = await getConfig('salesforce_consumer_key');
  const clientSecret = await getConfig('salesforce_consumer_secret');
  const oauthUrl = await getSalesforceOAuthUrl();

  if (!refreshToken) {
    throw new Error('No hay refresh token disponible. Debes autorizarte primero.');
  }

  if (!clientId || !clientSecret) {
    throw new Error('Consumer Key y Secret no configurados');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${oauthUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error renovando token: ${error}`);
  }

  const tokens: TokenResponse = await response.json();

  // Guardar nuevo access token (expira en ~2 horas = 7200 segundos)
  const expiryTime = Date.now() + (7200 * 1000); // 2 horas
  await setConfig('salesforce_access_token', tokens.access_token);
  await setConfig('salesforce_instance_url', tokens.instance_url);
  await setConfig('salesforce_token_expiry', expiryTime.toString());

  console.log('[OAUTH] Token renovado exitosamente');
  return tokens;
}

// Intercambiar código de autorización por tokens
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const clientId = await getConfig('salesforce_consumer_key');
  const clientSecret = await getConfig('salesforce_consumer_secret');
  const oauthUrl = await getSalesforceOAuthUrl();

  if (!clientId || !clientSecret) {
    throw new Error('Consumer Key y Secret no configurados');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: code,
  });

  const response = await fetch(`${oauthUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error intercambiando código: ${error}`);
  }

  const tokens: TokenResponse = await response.json();

  // Guardar tokens en la base de datos
  const expiryTime = Date.now() + (7200 * 1000); // 2 horas
  await setConfig('salesforce_access_token', tokens.access_token);
  await setConfig('salesforce_refresh_token', tokens.refresh_token || '');
  await setConfig('salesforce_instance_url', tokens.instance_url);
  await setConfig('salesforce_token_expiry', expiryTime.toString());

  console.log('[OAUTH] Tokens guardados exitosamente');
  return tokens;
}

// Generar URL de autorización
export async function getAuthorizationUrl(redirectUri: string): Promise<string> {
  const clientId = await getConfig('salesforce_consumer_key');
  const oauthUrl = await getSalesforceOAuthUrl();

  if (!clientId) {
    throw new Error('Consumer Key no configurado');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token',
    prompt: 'login consent',
  });

  return `${oauthUrl}/services/oauth2/authorize?${params.toString()}`;
}

// Verificar si hay credenciales OAuth configuradas
export async function hasOAuthCredentials(): Promise<boolean> {
  const clientId = await getConfig('salesforce_consumer_key');
  const clientSecret = await getConfig('salesforce_consumer_secret');
  return !!(clientId && clientSecret);
}

// Verificar si hay tokens activos
export async function hasActiveTokens(): Promise<boolean> {
  const accessToken = await getConfig('salesforce_access_token');
  const refreshToken = await getConfig('salesforce_refresh_token');
  return !!(accessToken || refreshToken);
}
