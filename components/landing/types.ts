export type Faq = { q: string; a: string }
export type Field = { title: string; desc: string }

/** Props de contenido que consume LandingShell (productos, industrias y agentes). */
export type PageContent = {
  eyebrow: string
  titleTop: string
  titleBottom?: string
  subtitle: string
  intro: string
  beneficios: Field[]
  /** Capacidades / subproductos (opcional). */
  capacidades?: Field[]
  casoTitle: string
  casoDesc: string
  faqs: Faq[]
  ctaHeading: string
}

export type Product = PageContent & {
  slug: string
  name: string
  tagline: string
  /** Núcleo de la plataforma Workers (true) o producto hermano del ecosistema. */
  core?: boolean
  /** Sitio propio del producto (CTA secundario). Sin url = el producto vive en Workers. */
  url?: string
  seoTitle: string
  seoDescription: string
}

export type Industry = PageContent & {
  slug: string
  name: string
  /** Situación típica ("¿Te identificas?") */
  pain: string
  seoTitle: string
  seoDescription: string
  /** Rutas de agentes recomendados para la industria */
  agentes: string[]
}
