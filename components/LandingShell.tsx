'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import type { PageContent } from '@/components/landing/types'

/* ============================================================
   LandingShell — Plantilla reutilizable de landing SEO
   Mismo diseño/idioma que la home pública (WORKERS, #5DE1E5).
   Cada landing pasa su contenido como props (keyword objetivo).
   ============================================================ */

export type LandingFaq = { q: string; a: string }
export type LandingField = { title: string; desc: string }

type Related = { title: string; items: { href: string; label: string; desc?: string }[] }

interface LandingShellProps extends PageContent {
  beneficiosTitle?: string
  /** Sitio propio del producto: reemplaza el CTA secundario "Saber más". */
  externalUrl?: { label: string; href: string }
  related?: Related
}

export default function LandingShell(props: LandingShellProps) {
  const {
    eyebrow, titleTop, titleBottom, subtitle, intro,
    beneficios, capacidades, casoTitle, casoDesc, faqs, ctaHeading,
    beneficiosTitle = 'Por qué elegir este agente IA', externalUrl, related,
  } = props

  const [expanded, setExpanded] = useState<number | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.name.trim()) return setErr('El nombre es requerido')
    if (!form.email.trim() || !re.test(form.email)) return setErr('Ingresa un email válido')
    if (!form.phone.trim()) return setErr('El teléfono es requerido')
    if (!form.message.trim()) return setErr('El mensaje es requerido')
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, honeypot: '', browserData: {} }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErr(data.error || 'Error al enviar el mensaje.'); setLoading(false); return
      }
      setShowContact(false)
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch (err) {
      setErr('Error al enviar el mensaje.')
    }
    setLoading(false)
  }

  const contacto = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowContact(false)}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Contáctanos</h3>
            <button onClick={() => setShowContact(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre <span className="text-red-500">*</span></label>
              <input type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="Tu nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="tu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono <span className="text-red-500">*</span></label>
              <input type="tel" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="+57 300 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje <span className="text-red-500">*</span></label>
              <textarea required rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5] resize-none" placeholder="Cuéntanos sobre tu proyecto..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            {err && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{err}</div>}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={() => setShowContact(false)} className="flex-1 bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors">Cerrar</button>
              <button type="submit" disabled={loading} className="flex-1 text-gray-900 py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: '#5DE1E5' }}>
                {loading ? <span className="flex items-center justify-center"><span className="inline-block animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full mr-2"></span>Enviando...</span> : 'Solicitar Demo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <LandingHeader onContact={() => setShowContact(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="py-16 lg:py-24 text-center px-4">
          <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>{eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
            {titleTop} <span className="border-b-4 border-[#5DE1E5]">{titleBottom ?? ''}</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-gray-800 mt-6">{subtitle}</p>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mt-4">{intro}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button onClick={() => setShowContact(true)} className="text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
            {externalUrl
              ? <a href={externalUrl.href} target="_blank" rel="noopener noreferrer" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center">{externalUrl.label}</a>
              : <a href="#beneficios" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center">Saber más</a>}
          </div>
        </div>

        {/* Beneficios */}
        <section id="beneficios" className="py-16 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>BENEFICIOS</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{beneficiosTitle}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {beneficios.map((b, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{b.title}</h3>
                  <p className="text-sm text-gray-600">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capacidades */}
        {capacidades && capacidades.length > 0 && (
          <section id="capacidades" className="py-16 bg-gray-50 border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>CAPACIDADES</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Lo que incluye</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {capacidades.map((c, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                    <span className="block w-8 h-1 rounded mb-4" style={{ backgroundColor: '#5DE1E5' }} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{c.title}</h3>
                    <p className="text-sm text-gray-600">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Caso de uso */}
        <section id="caso" className="py-16 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto text-center px-4">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>CASO DE USO</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{casoTitle}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{casoDesc}</p>
            <button onClick={() => setShowContact(true)} className="mt-8 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
          </div>
        </section>

        {related && (
          <section className="py-16 border-t border-gray-200">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">{related.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.items.map((r) => (
                  <Link key={r.href} href={r.href} className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{r.label}</h3>
                    {r.desc && <p className="text-sm text-gray-600">{r.desc}</p>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors">
                    <span className="font-semibold text-gray-900 pr-4">{f.q}</span>
                    <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded === i ? 'rotate-45' : ''}`} style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
                  <div className={`px-6 pb-4 ${expanded === i ? '' : 'hidden'}`}><p className="text-gray-600">{f.a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 border-t border-gray-200 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">{ctaHeading}</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Agenda una demo y descubre cómo agilizar tu operación con agentes IA 24/7.</p>
            <button onClick={() => setShowContact(true)} className="text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg text-lg" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo Gratuita</button>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* WhatsApp flotante */}
      <a href="https://wa.me/573195947797" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors z-50" aria-label="Contactar por WhatsApp">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {showBackTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 left-6 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors z-50" aria-label="Volver arriba">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      )}

      {showContact && contacto}
    </div>
  )
}