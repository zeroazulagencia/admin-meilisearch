import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      wordpress: 'connected',
      zoho: 'connected',
      treli: 'connected',
    }
  });
}