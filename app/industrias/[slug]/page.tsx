import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LandingShell from '@/components/LandingShell'
import { INDUSTRIES, getIndustry } from '@/components/landing/industries'
import { AGENTS } from '@/components/landing/agents'

export const dynamicParams = false
export const generateStaticParams = () => INDUSTRIES.map((i) => ({ slug: i.slug }))

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const i = getIndustry(params.slug)
  if (!i) return {}
  const path = `/industrias/${i.slug}/`
  return {
    title: i.seoTitle,
    description: i.seoDescription,
    alternates: { canonical: path },
    openGraph: { title: i.seoTitle, description: i.seoDescription, url: `https://workers.zeroazul.com${path}`, siteName: 'Workers by Zero Azul', type: 'website' },
  }
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const i = getIndustry(params.slug)
  if (!i) notFound()
  const agentes = i.agentes.map((h) => AGENTS.find((a) => a.href === h)).filter((a): a is (typeof AGENTS)[number] => !!a)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Agentes IA para ${i.name.toLowerCase()}`,
    description: i.seoDescription,
    url: `https://workers.zeroazul.com/industrias/${i.slug}/`,
    provider: { '@id': 'https://workers.zeroazul.com/#organization' },
    areaServed: { '@type': 'Country', name: 'Colombia' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingShell
        {...i}
        beneficiosTitle={`Qué hacen los agentes IA en ${i.name.toLowerCase()}`}
        related={{ title: 'Agentes recomendados para tu industria', items: agentes.map((a) => ({ href: a.href, label: a.label, desc: a.desc })) }}
      />
    </>
  )
}
