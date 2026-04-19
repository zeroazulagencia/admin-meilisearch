/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  trailingSlash: true,
  
  // Desactivar completamente el cache de Next.js
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  // Configurar headers para evitar cache del navegador y agregar Link headers (RFC 8288)
  headers: async () => {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Link',
            value: '</sitemap.xml>; rel="sitemap"; title="Sitemap", </modulos/13>; rel="https://workers.zeroazul.com/rel/modulos"; title="Module 13 Biury", </robots.txt>; rel="robots"; title="Robots.txt", </.well-known/agent-skills/index.json>; rel="https://workers.zeroazul.com/rel/agent-skills"; title="Agent Skills", </.well-known/mcp/server-card.json>; rel="https://workers.zeroazul.com/rel/mcp-server"; title="MCP Server Card", </.well-known/api-catalog>; rel="service-desc"; title="API Catalog (RFC 9727)", </.well-known/oauth-authorization-server>; rel="authorization_server"; title="OAuth Authorization Server", </webmcp.js>; rel="https://workers.zeroazul.com/rel/webmcp"; title="WebMCP Tools"',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig


