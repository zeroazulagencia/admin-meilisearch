import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CARTAS_DIR = join(process.cwd(), 'cartas-pdf', 'autolarte');

export async function GET(req: NextRequest) {
  const nit = new URL(req.url).searchParams.get('nit');
  if (!nit) return NextResponse.json({ status: 'error', message: 'El parametro nit es requerido' }, { status: 400 });

  const sanitized = nit.replace(/[^a-zA-Z0-9]/g, '');
  const filePath = join(CARTAS_DIR, `${sanitized}.pdf`);

  if (!existsSync(filePath)) {
    return NextResponse.json({ status: 'error', message: 'El documento no existe. Debe generarse primero.' }, { status: 404 });
  }

  const fileBuffer = readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${sanitized}.pdf"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}
