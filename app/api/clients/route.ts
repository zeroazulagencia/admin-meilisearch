import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar todos los clientes
export async function GET() {
  try {
    const [rows] = await query<any>('SELECT id, name, email, phone, company, clave, permissions, status FROM clients ORDER BY id');
    return NextResponse.json({ ok: true, clients: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

// POST - Crear nuevo cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [result] = await query<any>(
      'INSERT INTO clients (name, email, phone, company, clave, status) VALUES (?, ?, ?, ?, ?, ?)',
      [body.name, body.email, body.phone, body.company, body.clave, 'active']
    );
    return NextResponse.json({ ok: true, id: result.insertId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
