import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('https://workers.zeroazul.com/custom-module5/llamada-sara/llamar', 301);
}
