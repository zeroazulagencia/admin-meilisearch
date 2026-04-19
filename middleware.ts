import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const accept = request.headers.get('Accept') || '';
  
  if (accept.includes('text/markdown')) {
    const url = new URL('/api/markdown/', 'https://workers.zeroazul.com');
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/|static/|favicon.ico|robots.txt|sitemap.xml|\\.well-known/).*)',
  ],
};