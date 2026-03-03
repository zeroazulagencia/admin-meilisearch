import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const requiredKey = process.env.TEST_WEBHOOK_API_KEY;
  if (!requiredKey || request.headers.get('x-api-key') !== requiredKey) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }
  console.log('=== TEST WEBHOOK ===');
  console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers), null, 2));
  
  const text = await request.text();
  console.log('Body length:', text.length);
  console.log('Body raw:', text);
  
  try {
    const json = JSON.parse(text);
    console.log('Body JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Not JSON');
  }
  
  return NextResponse.json({ 
    received: true,
    bodyLength: text.length,
    body: text 
  });
}
