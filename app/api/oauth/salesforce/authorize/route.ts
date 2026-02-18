/**
 * MÓDULO 1 - SUVI LEADS
 * OAuth Salesforce: Autorización inicial
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, hasOAuthCredentials } from '@/utils/modulos/suvi-leads/module1-salesforce-oauth';

// Marcar como ruta dinámica
export const dynamic = 'force-dynamic';

// GET - Iniciar flujo de autorización OAuth
export async function GET(request: NextRequest) {
  try {
    // Verificar que estén configuradas las credenciales
    const hasCredentials = await hasOAuthCredentials();
    if (!hasCredentials) {
      return NextResponse.json(
        { error: 'Consumer Key y Secret no están configurados en la base de datos' },
        { status: 400 }
      );
    }

    // Obtener redirect URI desde el request o usar default
    const { searchParams } = new URL(request.url);
    const customRedirect = searchParams.get('redirect_uri');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://workers.zeroazul.com';
    const redirectUri = customRedirect || `${baseUrl}/api/oauth/salesforce/callback`;

    // Generar URL de autorización
    const authUrl = await getAuthorizationUrl(redirectUri);

    // Redirigir al usuario a Salesforce
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[OAUTH] Error en authorize:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
