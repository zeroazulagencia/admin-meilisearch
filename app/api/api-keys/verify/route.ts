import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// POST: Verificar una API key
export async function POST(request: NextRequest) {
  try {
    const { service_name } = await request.json();
    
    if (!service_name) {
      return NextResponse.json(
        { ok: false, error: 'service_name es requerido' },
        { status: 400 }
      );
    }
    
    // Obtener la API key
    const [rows] = await query<any>(
      'SELECT api_key FROM api_keys WHERE service_name = ? AND is_active = 1',
      [service_name]
    );
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'API key no encontrada', valid: false },
        { status: 404 }
      );
    }
    
    const apiKey = rows[0].api_key;
    let valid = false;
    let message = '';
    
    // Verificar segun el servicio
    if (service_name === 'openai') {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        
        if (response.ok) {
          valid = true;
          message = 'API key de OpenAI valida';
        } else {
          const error = await response.json();
          message = error.error?.message || 'API key invalida';
        }
      } catch (e: any) {
        message = 'Error de conexion: ' + e.message;
      }
    } else {
      // Para otros servicios, solo verificamos que existe
      valid = true;
      message = 'API key existe (no se puede verificar automaticamente)';
    }
    
    // Actualizar fecha de verificacion
    if (valid) {
      await query<any>(
        'UPDATE api_keys SET last_verified_at = NOW() WHERE service_name = ?',
        [service_name]
      );
    }
    
    return NextResponse.json({ ok: true, valid, message });
  } catch (error: any) {
    console.error('[API-KEYS VERIFY] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
