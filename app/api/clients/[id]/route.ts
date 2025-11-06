import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener un cliente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [rows] = await query<any>(
      'SELECT id, name, email, phone, company, nit, clave, permissions, status FROM clients WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, client: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// PUT - Actualizar un cliente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    // Intentar actualizar con NIT, si falla intentar sin él (backward compatibility)
    try {
      await query(
        'UPDATE clients SET name = ?, email = ?, phone = ?, company = ?, nit = ?, clave = ?, permissions = ? WHERE id = ?',
        [body.name, body.email, body.phone, body.company, body.nit || null, body.clave, JSON.stringify(body.permissions || {}), id]
      );
    } catch (e: any) {
      // Si falla, probablemente la columna nit no existe, intentar sin ella
      console.log('[API CLIENTS] Error updating with NIT, trying without it:', e?.message);
      await query(
        'UPDATE clients SET name = ?, email = ?, phone = ?, company = ?, clave = ?, permissions = ? WHERE id = ?',
        [body.name, body.email, body.phone, body.company, body.clave, JSON.stringify(body.permissions || {}), id]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// DELETE - Eliminar un cliente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM clients WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
