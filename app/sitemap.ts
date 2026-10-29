import type { MetadataRoute } from 'next'
import { PRODUCTS } from '@/components/landing/products'
import { INDUSTRIES } from '@/components/landing/industries'
import { AGENTS } from '@/components/landing/agents'

const BASE_URL = 'https://workers.zeroazul.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { loc: string; changeFrequency: 'daily' | 'weekly'; priority: number }[] = [
    { loc: '/', changeFrequency: 'daily', priority: 1.0 },
    { loc: '/modulos', changeFrequency: 'weekly', priority: 0.8 },
    { loc: '/modulos/13', changeFrequency: 'weekly', priority: 0.9 },
    ...PRODUCTS.map((p) => ({ loc: `/productos/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...AGENTS.map((a) => ({ loc: a.href, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...INDUSTRIES.map((i) => ({ loc: `/industrias/${i.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ]
  return routes.map((r) => ({ url: `${BASE_URL}${r.loc}`, changeFrequency: r.changeFrequency, priority: r.priority }))
}
