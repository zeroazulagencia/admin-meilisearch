import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Endpoint de pagos de Biury',
    data: [],
    note: 'Implementar conexión a base de datos de Biury',
  });
}