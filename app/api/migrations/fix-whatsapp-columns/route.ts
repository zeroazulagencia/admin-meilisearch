import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// POST - Ejecutar migración para corregir el tamaño de las columnas de WhatsApp
export async function POST(req: NextRequest) {
  try {
    // Verificar si las columnas existen antes de modificarlas
    const [webhookCheck] = await query<any>(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'agents' 
       AND COLUMN_NAME = 'whatsapp_webhook_verify_token'`
    );
    
    const [appSecretCheck] = await query<any>(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'agents' 
       AND COLUMN_NAME = 'whatsapp_app_secret'`
    );

    const webhookExists = webhookCheck && webhookCheck.length > 0 && webhookCheck[0].count === 1;
    const appSecretExists = appSecretCheck && appSecretCheck.length > 0 && appSecretCheck[0].count === 1;

    const results: string[] = [];

    // Modificar whatsapp_webhook_verify_token a TEXT si existe
    if (webhookExists) {
      try {
        await query(
          'ALTER TABLE agents MODIFY COLUMN whatsapp_webhook_verify_token TEXT NULL'
        );
        results.push('whatsapp_webhook_verify_token modificado a TEXT exitosamente');
      } catch (e: any) {
        results.push(`Error modificando whatsapp_webhook_verify_token: ${e?.message || 'Error desconocido'}`);
      }
    } else {
      results.push('whatsapp_webhook_verify_token no existe, saltando...');
    }

    // Modificar whatsapp_app_secret a TEXT si existe
    if (appSecretExists) {
      try {
        await query(
          'ALTER TABLE agents MODIFY COLUMN whatsapp_app_secret TEXT NULL'
        );
        results.push('whatsapp_app_secret modificado a TEXT exitosamente');
      } catch (e: any) {
        results.push(`Error modificando whatsapp_app_secret: ${e?.message || 'Error desconocido'}`);
      }
    } else {
      results.push('whatsapp_app_secret no existe, saltando...');
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Migración ejecutada',
      results 
    });
  } catch (e: any) {
    console.error('[MIGRATION] Error executing migration:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al ejecutar migración' 
    }, { status: 500 });
  }
}

