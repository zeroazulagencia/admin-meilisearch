import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/utils/modulos/suvi-leads/salesforce-oauth';

// POST - Renovar manualmente el access token
export async function POST(request: NextRequest) {
  try {
    const tokens = await refreshAccessToken();

    return NextResponse.json({
      success: true,
      instance_url: tokens.instance_url,
      issued_at: new Date(parseInt(tokens.issued_at)).toISOString(),
      message: 'Token renovado exitosamente',
    });
  } catch (error: any) {
    console.error('[OAUTH] Error renovando token:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        hint: error.message.includes('refresh token') 
          ? 'Debes autorizarte primero en /api/oauth/salesforce/authorize'
          : 'Verifica tus credenciales de Salesforce',
      },
      { status: 500 }
    );
  }
}
