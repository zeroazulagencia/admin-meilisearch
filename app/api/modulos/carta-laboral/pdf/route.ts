import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CARTAS_DIR = join(process.cwd(), 'cartas-pdf', 'autolarte');

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ status: 'error', message: 'El parametro token es requerido' }, { status: 400 });
  }

  const sanitized = token.replace(/[^a-zA-Z0-9]/g, '');

  const [rows] = await query<any>(
    'SELECT pdf_filename, pdf_token_expires_at, empleado_cedula FROM modulos_lucas_9_cartas WHERE pdf_token = ? LIMIT 1',
    [sanitized]
  );

  if (!rows || rows.length === 0) {
    return NextResponse.json({ status: 'error', message: 'Token invalido o no encontrado' }, { status: 404 });
  }

  const carta = rows[0];

  if (new Date(carta.pdf_token_expires_at) < new Date()) {
    return NextResponse.json({ status: 'error', message: 'El enlace ha expirado. Genere una nueva carta.' }, { status: 410 });
  }

  const filePath = join(CARTAS_DIR, carta.pdf_filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ status: 'error', message: 'Archivo no encontrado en el servidor' }, { status: 404 });
  }

  const fileBuffer = readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="carta-laboral-${carta.empleado_cedula}.pdf"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}
