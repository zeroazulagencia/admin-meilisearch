import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://workers.zeroazul.com';

const routes = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/modulos', changefreq: 'weekly', priority: 0.8 },
  { loc: '/modulos/13', changefreq: 'weekly', priority: 0.9 },
  { loc: '/agente-ia-ventas', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-whatsapp', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agentes-ia-atencion-cliente', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-finanzas', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-cobros', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-inventarios', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-rrhh', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-analitica', changefreq: 'weekly', priority: 0.8 },
  { loc: '/agente-ia-para-servicios', changefreq: 'weekly', priority: 0.8 },
  { loc: '/ia-integrada-crm-erp', changefreq: 'weekly', priority: 0.8 },
];

export async function GET(req: NextRequest) {
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const route of routes) {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${BASE_URL}${route.loc}</loc>\n`;
    sitemap += `    <changefreq>${route.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${route.priority}</priority>\n`;
    sitemap += '  </url>\n';
  }

  sitemap += '</urlset>';

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}