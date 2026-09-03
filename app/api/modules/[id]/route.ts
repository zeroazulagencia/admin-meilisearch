import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { execSync } from 'child_process';

/**
 * Activa o desactiva los cronjobs del sistema asociados a un módulo.
 * Busca líneas en el crontab que contengan /api/custom-module{moduleId}/
 * y las comenta con #HERMES-DEACTIVATED: o las descomenta según corresponda.
 */
function toggleCronjobsForModule(moduleId: string, deactivate: boolean) {
  try {
    // Obtener crontab actual
    let crontab = '';
    try {
      crontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    } catch {
      // No hay crontab aún
      crontab = '';
    }

    if (!crontab.trim()) return { changed: false, reason: 'no_crontab' };

    const lines = crontab.split('\n');
    const marker = `custom-module${moduleId}/`;
    const deactivatedPrefix = '#HERMES-DEACTIVATED:';
    let modified = false;

    const newLines = lines.map((line: string) => {
      const trimmed = line.trim();

      // Línea que ya tiene nuestro marcador de desactivación
      if (trimmed.startsWith(deactivatedPrefix)) {
        // Si estábamos desactivando y tiene el marcador pero NO es este módulo, dejarla
        if (deactivate && !trimmed.includes(marker)) return line;
        // Si estamos reactivando y coincide con este módulo, descomentar
        if (!deactivate && trimmed.includes(marker)) {
          modified = true;
          const afterPrefix = trimmed.slice(deactivatedPrefix.length).trim();
          const indent = line.match(/^\s*/)?.[0] || '';
          return `${indent}${afterPrefix}`;
        }
        return line;
      }

      // Línea vacía, otro comentario (no nuestro)
      if (!trimmed || trimmed.startsWith('#')) return line;

      // Línea activa (no comentada)
      if (deactivate && trimmed.includes(marker)) {
        modified = true;
        const indent = line.match(/^\s*/)?.[0] || '';
        return `${indent}${deactivatedPrefix} ${trimmed}`;
      }

      return line;
    });

    if (modified) {
      execSync(`crontab -`, {
        input: newLines.join('\n') + '\n',
        encoding: 'utf8',
        timeout: 5000,
      });
      return { changed: true, action: deactivate ? 'deactivated' : 'activated' };
    }

    return { changed: false, reason: 'no_matching_lines' };
  } catch (err: any) {
    console.error(`[CRONJOBS] Error toggling cronjobs for module ${moduleId}:`, err);
    return { changed: false, error: err?.message };
  }
}

// GET - Obtener un módulo específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    console.log('[API MODULES] [GET BY ID] Cargando módulo:', moduleId);
    
    const [rows] = await query<any>(
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
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Módulo no encontrado'
        },
        { status: 404 }
      );
    }
    
    console.log('[API MODULES] [GET BY ID] Módulo encontrado:', rows[0].title);
    
    return NextResponse.json({
      ok: true,
      module: rows[0]
    });
  } catch (error: any) {
    console.error('[API MODULES] [GET BY ID] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al cargar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un módulo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    const body = await request.json();
    const { title, description } = body;
    
    console.log('[API MODULES] [PUT] Actualizando módulo:', moduleId);
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'El título es requerido'
        },
        { status: 400 }
      );
    }
    
    await query<any>(
      'UPDATE modules SET title = ?, description = ? WHERE id = ?',
      [title.trim(), description || null, moduleId]
    );
    
    // Obtener el módulo actualizado
    const [rows] = await query<any>(
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
    
    console.log('[API MODULES] [PUT] Módulo actualizado exitosamente');
    
    return NextResponse.json({
      ok: true,
      module: rows && rows.length > 0 ? rows[0] : null
    });
  } catch (error: any) {
    console.error('[API MODULES] [PUT] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al actualizar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active === 'undefined' || is_active === null) {
      return NextResponse.json(
        {
          ok: false,
          error: 'is_active (boolean) es requerido'
        },
        { status: 400 }
      );
    }

    const active = is_active === true || is_active === 1 ? 1 : 0;

    await query<any>(
      'UPDATE modules SET is_active = ? WHERE id = ?',
      [active, moduleId]
    );

    // También activar/desactivar cronjobs del sistema asociados a este módulo
    const cronResult = toggleCronjobsForModule(moduleId, active === 0);
    if (cronResult.changed) {
      console.log('[API MODULES] [PATCH] Cronjobs', cronResult.action, 'para módulo', moduleId);
    } else if (cronResult.reason !== 'no_matching_lines') {
      console.log('[API MODULES] [PATCH] Cronjobs sin cambios:', cronResult);
    }

    const [rows] = await query<any>(
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

    console.log('[API MODULES] [PATCH] Estado actualizado');
    return NextResponse.json({
      ok: true,
      module: rows && rows.length > 0 ? rows[0] : null
    });
  } catch (error: any) {
    console.error('[API MODULES] [PATCH] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al actualizar el estado: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un módulo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;
    console.log('[API MODULES] [DELETE] Eliminando módulo:', moduleId);
    
    await query<any>('DELETE FROM modules WHERE id = ?', [moduleId]);
    
    console.log('[API MODULES] [DELETE] Módulo eliminado exitosamente');
    
    return NextResponse.json({
      ok: true,
      message: 'Módulo eliminado correctamente'
    });
  } catch (error: any) {
    console.error('[API MODULES] [DELETE] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al eliminar el módulo: ' + (error?.message || 'Error desconocido')
      },
      { status: 500 }
    );
  }
}
