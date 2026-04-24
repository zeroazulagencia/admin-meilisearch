import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT type, payload, response, created_at FROM modulos_mipaquete_15_logs ORDER BY created_at DESC LIMIT 100',
      []
    );
    
    return NextResponse.json({ ok: true, logs: rows || [] });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, response } = body;
    
    await query(
      'INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)',
      [type, JSON.stringify(payload), JSON.stringify(response)]
    );
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}