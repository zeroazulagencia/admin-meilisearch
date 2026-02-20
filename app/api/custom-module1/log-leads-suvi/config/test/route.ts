import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<any>(
    'SELECT config_value FROM modulos_suvi_12_config WHERE config_key = ? LIMIT 1',
    [key]
  );
  return rows[0]?.config_value ?? null;
}

// POST: Probar una config key
export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    
    if (!key) {
      return NextResponse.json({ ok: false, error: 'key es requerido' }, { status: 400 });
    }
    
    const value = await getConfig(key);
    
    if (!value) {
      return NextResponse.json({ ok: false, valid: false, message: 'No hay valor configurado para esta key' });
    }
    
    // Test segun el tipo de key
    switch (key) {
      case 'openai_api_key': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${value}` }
        });
        if (res.ok) {
          return NextResponse.json({ ok: true, valid: true, message: 'API key de OpenAI valida' });
        }
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: true, valid: false, message: err?.error?.message || 'API key invalida' });
      }
      
      case 'facebook_access_token': {
        const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${value}`);
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ ok: true, valid: true, message: `Token valido (${data.name || data.id})` });
        }
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: true, valid: false, message: err?.error?.message || 'Token invalido' });
      }
      
      case 'salesforce_consumer_key':
      case 'salesforce_consumer_secret': {
        // Solo verificar que existe un valor
        return NextResponse.json({ ok: true, valid: true, message: 'Credencial guardada (usa OAuth para verificar)' });
      }
      
      default:
        return NextResponse.json({ ok: true, valid: true, message: 'Valor configurado' });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
