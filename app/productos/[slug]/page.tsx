import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LandingShell from '@/components/LandingShell'
import { PRODUCTS, getProduct } from '@/components/landing/products'
import { INDUSTRIES } from '@/components/landing/industries'

export const dynamicParams = false
export const generateStaticParams = () => PRODUCTS.map((p) => ({ slug: p.slug }))

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug)
  if (!p) return {}
  const path = `/productos/${p.slug}/`
  return {
    title: p.seoTitle,
    description: p.seoDescription,
    alternates: { canonical: path },
    openGraph: { title: p.seoTitle, description: p.seoDescription, url: `https://workers.zeroazul.com${path}`, siteName: 'Workers by Zero Azul', type: 'website' },
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProduct(params.slug)
  if (!p) notFound()
  const others = [...PRODUCTS.filter((x) => x.slug !== p.slug && !!x.core === !!p.core), ...PRODUCTS.filter((x) => x.slug !== p.slug && !!x.core !== !!p.core)].slice(0, 3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: p.name,
    applicationCategory: 'BusinessApplication',
    description: p.seoDescription,
    url: `https://workers.zeroazul.com/productos/${p.slug}/`,
    publisher: { '@id': 'https://workers.zeroazul.com/#organization' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingShell
        {...p}
        beneficiosTitle={`Por qué elegir ${p.name}`}
        externalUrl={p.url ? { label: `Conocer ${p.name}`, href: p.url } : undefined}
        related={{ title: 'Más productos del ecosistema', items: others.map((o) => ({ href: `/productos/${o.slug}`, label: o.name, desc: o.tagline })) }}
      />
    </>
  )
}
