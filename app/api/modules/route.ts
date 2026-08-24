import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import fs from 'fs';
import path from 'path';

const ERROR_COUNT_MODULES: Record<number, { table: string; label: string }> = {
  1: { table: 'modulos_suvi_12_leads', label: 'suvi_leads' },
  6: { table: 'modulos_suvi_6_opportunities', label: 'suvi_opportunity' },
};

// GET - Listar todos los módulos con información del agente y cliente
export async function GET() {
  try {
    console.log('[API MODULES] [GET] Iniciando carga de módulos...');
    
    const [rows] = await query<any>(`
      SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.folder_name,
        m.is_active,
        m.description,
        m.created_at,
        m.updated_at,
        a.name as agent_name,
        a.photo as agent_photo,
        a.client_id,
        c.name as client_name
      FROM modules m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN clients c ON a.client_id = c.id
      ORDER BY m.created_at DESC
    `);
    
    console.log('[API MODULES] [GET] Módulos cargados:', rows?.length || 0);

    const moduleIdsToCount = rows
      ?.filter((module: any) => ERROR_COUNT_MODULES[module.id])
      .map((module: any) => module.id) || [];

    const errorCounts: Record<number, number> = {};

    if (moduleIdsToCount.length > 0) {
      for (const moduleId of moduleIdsToCount) {
        const meta = ERROR_COUNT_MODULES[moduleId];
        if (!meta) continue;
        try {
          const [countRows] = await query<any>(
            `SELECT COUNT(*) as total FROM ${meta.table} WHERE processing_status = 'error'`
          );
          errorCounts[moduleId] = countRows?.[0]?.total || 0;
        } catch (countError) {
          console.error(`[API MODULES] [GET] Error contando errores para módulo ${moduleId}:`, countError);
        }
      }
    }
    
    return NextResponse.json({
      ok: true,
      modules: (rows || []).map((module: any) => ({
        ...module,
        error_count: errorCounts[module.id] || 0,
      }))
    });
  } catch (error: any) {
    console.error('[API MODULES] [GET] Error cargando módulos:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al cargar los módulos: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo módulo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, title, description } = body;
    
    console.log('[API MODULES] [POST] Creando módulo:', { agent_id, title });
    
    // Validaciones
    if (!agent_id || !title) {
      return NextResponse.json(
        {
          ok: false,
          error: 'agent_id y title son requeridos'
        },
        { status: 400 }
      );
    }
    
    // Generar folder_name único basado en el título
    const folderName = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    // ---- PUNTO 2: crear folder de implementación + registrar en MODULES_MAP ----
    let folderCreated = false;
    let mapRegistered = false;
    try {
      const BASE = process.env.SCAFFOLD_ROOT || process.cwd();
      const MODULES_DIR = process.env.SCAFFOLD_MODULES_DIR || path.join(BASE, 'modules-custom');
      const MODULES_PAGE = process.env.SCAFFOLD_MODULES_PAGE || path.join(BASE, 'app', 'modulos', '[id]', 'page.tsx');

      if (!folderName) {
        console.warn('[API MODULES] [POST] folder_name vacío, se omite creación de folder');
      } else {
        // nombre del componente (Mod + PascalCase del folder)
        const componentName = 'Mod' + folderName
          .split('-')
          .filter(Boolean)
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');

        const moduleDir = path.join(MODULES_DIR, folderName);
        const outFile = path.join(moduleDir, 'index.tsx');

        // 1) crear directorio + index.tsx desde plantilla (solo si no existe)
        if (!fs.existsSync(outFile)) {
          fs.mkdirSync(moduleDir, { recursive: true });
          const tmpl = fs.readFileSync(
            process.env.SCAFFOLD_TEMPLATE || path.join(BASE, 'scripts', 'templates', 'module-index.tsx'),
            'utf8'
          );
          fs.writeFileSync(outFile, tmpl.replace(/__MODULE_COMPONENT_NAME__/g, componentName), 'utf8');
          folderCreated = true;
          console.log('[Install] [POST] folder creado:', `modules-custom/${folderName}/index.tsx`);
        } else {
          console.log('[Install] [POST] folder ya existía:', folderName);
        }

        // 2) registrar import + entrada MODULES_MAP en app/modulos/[id]/page.tsx
        if (fs.existsSync(MODULES_PAGE)) {
          let src = fs.readFileSync(MODULES_PAGE, 'utf8');

          const importLine = `import ${componentName} from '@/modules-custom/${folderName}';`;
          if (!src.includes(`'@/modules-custom/${folderName}'`)) {
            src = src.replace(/(\/\/ Static imports for known modules\n?)/, `$1${importLine}\n`);
          }

          const entry = `  '${folderName}': ${componentName},`;
          if (!src.includes(`'${folderName}':`)) {
            const lines = src.split('\n');
            const mapStartLine = lines.findIndex((l: string) => l.includes('const MODULES_MAP'));
            let insertAt = -1;
            for (let i = 0; i < lines.length; i++) {
              if (i <= mapStartLine) continue;
              if (/^\};\s*$/.test(lines[i])) { insertAt = i; break; }
            }
            if (insertAt !== -1) {
              lines.splice(insertAt, 0, entry);
              src = lines.join('\n');
              fs.writeFileSync(MODULES_PAGE, src, 'utf8');
              mapRegistered = true;
            }
          } else {
            mapRegistered = true;
          }
        }
      }
    } catch (folderErr: any) {
      console.warn('[Install] [POST] No se pudo materializar folder:', folderErr?.message || folderErr);
    }

    // Insertar módulo en BD
    const [result] = await query<any>(
      'INSERT INTO modules (agent_id, title, folder_name, description) VALUES (?, ?, ?, ?)',
      [agent_id, title, folderName, description || null]
    );
    
    const moduleId = (result as any).insertId;
    
    console.log('[API MODULES] [POST] Módulo creado con ID:', moduleId);

    // Obtener el módulo completo con datos del agente
    const [moduleRows] = await query<any>(
      `SELECT 
        m.id,
        m.agent_id,
        m.title,
        m.folder_name,
        m.is_active,
        m.description,
        m.created_at,
        m.updated_at,
        a.name as agent_name,
        c.name as client_name
      FROM modules m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE m.id = ?`,
      [moduleId]
    );
    
    return NextResponse.json({
      ok: true,
      folderCreated,
      mapRegistered,
      module: moduleRows && moduleRows.length > 0 ? moduleRows[0] : null
    });
  } catch (error: any) {
    console.error('[API MODULES] [POST] Error creando módulo:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al crear el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}
