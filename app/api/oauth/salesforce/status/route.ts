/**
 * MÓDULO 1 - SUVI LEADS
 * OAuth Salesforce: Verificar estado de autenticación
 */
import { NextRequest, NextResponse } from 'next/server';
import { hasOAuthCredentials, hasActiveTokens, refreshAccessToken } from '@/utils/modulos/suvi-leads/module1-salesforce-oauth';
import { getConfig } from '@/utils/modulos/suvi-leads/module1-config';

// Marcar como ruta dinámica
export const dynamic = 'force-dynamic';

// GET - Verificar estado de OAuth
export async function GET(request: NextRequest) {
  try {
    const hasCredentials = await hasOAuthCredentials();
    const hasTokens = await hasActiveTokens();
    
    let instanceUrl = await getConfig('salesforce_instance_url');
    let tokenExpiry = await getConfig('salesforce_token_expiry');
    const consumerKey = await getConfig('salesforce_consumer_key');

    const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;
    const now = Date.now();
    let isExpired = expiryTime > 0 && now >= expiryTime;

    if (hasTokens && isExpired) {
      try {
        await refreshAccessToken();
        tokenExpiry = await getConfig('salesforce_token_expiry');
        instanceUrl = await getConfig('salesforce_instance_url');
        const refreshedExpiry = tokenExpiry ? parseInt(tokenExpiry) : 0;
        isExpired = refreshedExpiry > 0 && Date.now() >= refreshedExpiry;
      } catch (e) {
        console.warn('[OAUTH] Refresh automatico fallo:', e);
      }
    }

    return NextResponse.json({
      oauth_configured: hasCredentials,
      has_active_tokens: hasTokens,
      instance_url: instanceUrl || null,
      consumer_key: consumerKey ? `${consumerKey.slice(0, 20)}...` : null,
      token_expiry: tokenExpiry ? new Date(parseInt(tokenExpiry)).toISOString() : null,
      is_expired: isExpired,
      time_until_expiry_minutes: tokenExpiry ? Math.floor((parseInt(tokenExpiry) - Date.now()) / 60000) : null,
    });
  } catch (error: any) {
    console.error('[OAUTH] Error verificando estado:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
