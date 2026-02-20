import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET: Listar todas las API keys (ocultando el valor real)
export async function GET() {
  try {
    const [rows] = await query<any>(
      `SELECT id, service_name, 
        CONCAT(LEFT(api_key, 10), '...', RIGHT(api_key, 4)) as api_key_masked,
        is_active, last_verified_at, created_at, updated_at 
       FROM api_keys ORDER BY service_name`
    );
    
    return NextResponse.json({ ok: true, keys: rows });
  } catch (error: any) {
    console.error('[API-KEYS] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear o actualizar una API key
export async function POST(request: NextRequest) {
  try {
    const { service_name, api_key } = await request.json();
    
    if (!service_name || !api_key) {
      return NextResponse.json(
        { ok: false, error: 'service_name y api_key son requeridos' },
        { status: 400 }
      );
    }
    
    // UPSERT: insertar o actualizar si ya existe
    await query<any>(
      `INSERT INTO api_keys (service_name, api_key) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE api_key = ?, updated_at = NOW()`,
      [service_name, api_key, api_key]
    );
    
    return NextResponse.json({ ok: true, message: 'API key guardada' });
  } catch (error: any) {
    console.error('[API-KEYS] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar una API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service_name = searchParams.get('service_name');
    
    if (!service_name) {
      return NextResponse.json(
        { ok: false, error: 'service_name es requerido' },
        { status: 400 }
      );
    }
    
    await query<any>(
      'DELETE FROM api_keys WHERE service_name = ?',
      [service_name]
    );
    
    return NextResponse.json({ ok: true, message: 'API key eliminada' });
  } catch (error: any) {
    console.error('[API-KEYS] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
