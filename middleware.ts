import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const accept = req.headers.get('Accept') || '';
  
  if (accept.includes('text/markdown')) {
    const response = NextResponse.next();
    response.headers.set('x-markdown-tokens', '1');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/:path((?!api/|_next/|static/|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};