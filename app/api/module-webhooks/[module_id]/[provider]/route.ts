import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function GET(req: NextRequest, { params }: any) {
  return handleWebhook(req, params, 'GET');
}

export async function POST(req: NextRequest, { params }: any) {
  return handleWebhook(req, params, 'POST');
}

async function handleWebhook(req: NextRequest, params: any, method: string) {
  try {
    const { module_id, provider } = params;
    
    console.log(`[WEBHOOK] ${method} - Module: ${module_id}, Provider: ${provider}`);
    
    const [rows] = await query<any>(
      'SELECT folder_name FROM modules WHERE id = ? LIMIT 1',
      [module_id]
    );
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
    }
    
    const folderName = rows[0].folder_name;
    const webhookPath = resolve(
      process.cwd(), 
      'modules-custom', 
      folderName, 
      'api/webhooks', 
      `${provider}.ts`
    );
    
    if (!existsSync(webhookPath)) {
      return NextResponse.json({ error: 'Webhook no implementado' }, { status: 404 });
    }
    
    const handler = await import(webhookPath);
    
    if (handler[method]) {
      return await handler[method](req, { params });
    }
    
    return NextResponse.json({ error: 'Método no soportado' }, { status: 405 });
  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
