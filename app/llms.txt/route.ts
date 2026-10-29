import { PRODUCTS } from '@/components/landing/products'
import { INDUSTRIES } from '@/components/landing/industries'
import { AGENTS } from '@/components/landing/agents'

export const dynamic = 'force-static'

const BASE = 'https://workers.zeroazul.com'

export function GET() {
  const body = [
    '# Workers by Zero Azul',
    '',
    '> Plataforma de agentes de inteligencia artificial para empresas en Colombia. Conecta los sistemas de la empresa (CRM, ERP, bases de datos, WhatsApp) y opera procesos de ventas, atención, finanzas, inventarios, RRHH y analítica con agentes autónomos supervisados.',
    '',
    '## Productos',
    ...PRODUCTS.map((p) => `- [${p.name}](${BASE}/productos/${p.slug}/): ${p.tagline}`),
    '',
    '## Agentes por área',
    ...AGENTS.map((a) => `- [${a.label}](${BASE}${a.href}/): ${a.desc}`),
    '',
    '## Industrias',
    ...INDUSTRIES.map((i) => `- [${i.name}](${BASE}/industrias/${i.slug}/): ${i.pain}`),
    '',
    '## Empresa',
    '- [Zero Azul](https://zeroazul.com): agencia de servicios digitales, IA y marketing (Zero Azul Company S.A.S., Medellín, Colombia).',
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
