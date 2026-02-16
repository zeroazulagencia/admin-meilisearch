import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

export async function GET(req: NextRequest, { params }: any) {
  return handleModuleRequest(req, params, 'GET');
}

export async function POST(req: NextRequest, { params }: any) {
  return handleModuleRequest(req, params, 'POST');
}

export async function PUT(req: NextRequest, { params }: any) {
  return handleModuleRequest(req, params, 'PUT');
}

export async function PATCH(req: NextRequest, { params }: any) {
  return handleModuleRequest(req, params, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: any) {
  return handleModuleRequest(req, params, 'DELETE');
}

async function handleModuleRequest(req: NextRequest, params: any, method: string) {
  try {
    const { module_id, path: apiPath } = params;
    
    const [rows] = await query<any>(
      'SELECT folder_name FROM modules WHERE id = ? LIMIT 1',
      [module_id]
    );
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
    }
    
    const folderName = rows[0].folder_name;
    const routePath = apiPath ? apiPath.join('/') : '';
    const modulesPath = resolve(process.cwd(), 'modules-custom', folderName, 'api');
    const routeTsPath = join(modulesPath, routePath, 'route.ts');
    
    if (!existsSync(routeTsPath)) {
      return NextResponse.json({ error: 'Endpoint no implementado' }, { status: 404 });
    }
    
    const handler = await import(routeTsPath);
    
    if (handler[method]) {
      return await handler[method](req, { params: { ...params, id: apiPath[apiPath.length - 1] } });
    }
    
    return NextResponse.json({ error: 'Método no soportado' }, { status: 405 });
  } catch (error: any) {
    console.error('[MODULE API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
