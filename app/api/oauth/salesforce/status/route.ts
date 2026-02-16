import { NextRequest, NextResponse } from 'next/server';
import { hasOAuthCredentials, hasActiveTokens } from '@/utils/modulos/suvi-leads/salesforce-oauth';
import { getConfig } from '@/utils/modulos/suvi-leads/config';

// GET - Verificar estado de OAuth
export async function GET(request: NextRequest) {
  try {
    const hasCredentials = await hasOAuthCredentials();
    const hasTokens = await hasActiveTokens();
    
    const instanceUrl = await getConfig('salesforce_instance_url');
    const tokenExpiry = await getConfig('salesforce_token_expiry');
    const consumerKey = await getConfig('salesforce_consumer_key');

    const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;
    const now = Date.now();
    const isExpired = expiryTime > 0 && now >= expiryTime;

    return NextResponse.json({
      oauth_configured: hasCredentials,
      has_active_tokens: hasTokens,
      instance_url: instanceUrl || null,
      consumer_key: consumerKey ? `${consumerKey.slice(0, 20)}...` : null,
      token_expiry: expiryTime > 0 ? new Date(expiryTime).toISOString() : null,
      is_expired: isExpired,
      time_until_expiry_minutes: expiryTime > 0 ? Math.floor((expiryTime - now) / 60000) : null,
    });
  } catch (error: any) {
    console.error('[OAUTH] Error verificando estado:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
