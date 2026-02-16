import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/utils/modulos/suvi-leads/salesforce-oauth';

// Marcar como ruta dinámica
export const dynamic = 'force-dynamic';

// GET - Callback de OAuth (recibe el código de autorización)
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://workers.zeroazul.com';
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Manejar errores de Salesforce
    if (error) {
      console.error('[OAUTH] Error de Salesforce:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/modulos/1?oauth_error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    // Validar que venga el código
    if (!code) {
      return NextResponse.json(
        { error: 'Código de autorización no recibido' },
        { status: 400 }
      );
    }

    // Obtener redirect URI usado (debe coincidir con el de la autorización)
    const redirectUri = `${baseUrl}/api/oauth/salesforce/callback`;

    // Intercambiar código por tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    console.log('[OAUTH] Autorización completada:', {
      instance_url: tokens.instance_url,
      has_refresh_token: !!tokens.refresh_token,
    });

    // Redirigir al dashboard con mensaje de éxito
    return NextResponse.redirect(
      new URL(`/modulos/1?oauth_success=true&instance_url=${encodeURIComponent(tokens.instance_url)}`, baseUrl)
    );
  } catch (error: any) {
    console.error('[OAUTH] Error en callback:', error);
    return NextResponse.redirect(
      new URL(`/modulos/1?oauth_error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }
}
