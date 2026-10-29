'use client'

import { useState } from 'react'
import Link from 'next/link'
import { INDUSTRIES } from './industries'
import { AGENTS } from './agents'
import { HOME_FAQS, HOME_PILLARS, HOME_STEPS, HOME_TESTIMONIALS } from './home-content'

const CYAN = '#5DE1E5'
const eyebrow = 'text-sm font-semibold uppercase tracking-widest mb-4'
const h2 = 'text-3xl sm:text-4xl font-bold text-gray-900 mb-4'
const cta = 'text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md'

const ICONS: Record<string, string> = {
  OPERACION: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  ATENCION: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  INVENTARIOS: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  DATOS: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  RRHH: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z',
  FINANZAS: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  VENTAS: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
}

function Icon({ category }: { category: string }) {
  return (
    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[category] ?? ICONS.OPERACION} />
    </svg>
  )
}

const highlights = ['AUTOMATIZACION', 'OPERACION 24/7', 'MENOS CUELLOS DE BOTELLA']

export default function HomeSections({ onContact }: { onContact: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-4rem)] py-8 lg:py-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className={eyebrow} style={{ color: CYAN }}>WORKERS · AGENTES DE IA PARA EMPRESAS</p>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Agentes de IA que <span className="border-b-4 border-[#5DE1E5]">trabajan dentro de tu empresa</span>
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-gray-800">Venden, cobran, atienden y operan tus procesos, conectados a tus sistemas y supervisados por tu equipo.</p>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">Workers pone a trabajar agentes especializados por área (ventas, cobros, atención, inventarios, finanzas, RRHH) sobre las herramientas que ya usas. Tú defines las reglas; ellos ejecutan 24/7 y dejan rastro de todo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlights.map((t) => <span key={t} className="px-3 py-1 text-sm font-medium rounded-full border-2" style={{ borderColor: CYAN, color: CYAN }}>{t}</span>)}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onContact} className={`${cta} text-center`} style={{ backgroundColor: CYAN }}>Agendar Demo</button>
              <a href="#agentes" className="bg-gray-900 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center">Ver los agentes</a>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="relative bg-white rounded-3xl overflow-hidden h-full min-h-[500px] flex items-center justify-center">
              <video src="/public-img/worker1.mp4" className="w-full h-full object-cover" autoPlay loop muted playsInline />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, white 0%, transparent 15%, transparent 85%, white 100%), linear-gradient(to bottom, white 0%, transparent 10%, transparent 90%, white 100%)' }}></div>
              <div className="absolute bottom-8 right-8 bg-white rounded-xl shadow-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">OPERACIÓN</p>
                <p className="text-3xl font-bold" style={{ color: CYAN }}>24/7</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className={eyebrow} style={{ color: CYAN }}>CÓMO FUNCIONA</p>
            <h2 className={h2}>Tres pasos para tener agentes operando</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">No reemplazamos tus sistemas ni a tu equipo: los conectamos y ponemos agentes a hacer el trabajo repetitivo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOME_STEPS.map((s, i) => (
              <div key={s.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4" style={{ backgroundColor: CYAN, color: '#000' }}>{i + 1}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agentes */}
      <section id="agentes" className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className={eyebrow} style={{ color: CYAN }}>AGENTES POR ÁREA</p>
            <h2 className={h2}>Un agente para cada área de tu empresa</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Elige por dónde empezar. Cada agente trabaja solo o coordinado con los demás.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENTS.map((a) => (
              <Link key={a.href} href={a.href} className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: CYAN }}><Icon category={a.category} /></div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: CYAN }}>{a.category}</p>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{a.label}</h3>
                <p className="text-sm text-gray-600">{a.desc}</p>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 mb-3">Soluciones por industria</p>
            <div className="flex flex-wrap justify-center gap-2">
              {INDUSTRIES.map((i) => (
                <Link key={i.slug} href={`/industrias/${i.slug}`} className="px-4 py-2 text-sm font-medium rounded-full border border-gray-300 text-gray-800 hover:border-[#5DE1E5] hover:text-gray-900 transition-colors">{i.name}</Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-10">
            <button onClick={onContact} className={cta} style={{ backgroundColor: CYAN }}>Hablemos de tu proyecto</button>
          </div>
        </div>
      </section>

      {/* Confianza */}
      <section id="confianza" className="py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className={eyebrow} style={{ color: CYAN }}>CONFIANZA</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Automatizar sin perder el control</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">Cada agente opera dentro de límites claros y deja rastro de todo lo que hace.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {HOME_PILLARS.map((p) => (
              <div key={p.title} className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-2" style={{ color: CYAN }}>{p.title}</h3>
                <p className="text-sm text-gray-300">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOME_TESTIMONIALS.map((t) => (
              <figure key={t.name} className="bg-gray-800 rounded-xl p-6">
                <blockquote className="text-gray-200 mb-4">“{t.text}”</blockquote>
                <figcaption className="text-sm font-semibold" style={{ color: CYAN }}>{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className={eyebrow} style={{ color: CYAN }}>FAQ</p>
            <h2 className={h2}>Preguntas Frecuentes</h2>
          </div>
          <div className="space-y-4">
            {HOME_FAQS.map((f, i) => (
              <div key={f.q} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-900 pr-4">{f.q}</span>
                  <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-45' : ''}`} style={{ color: CYAN }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
                <div className={`px-6 pb-4 ${openFaq === i ? '' : 'hidden'}`}><p className="text-gray-600">{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">¿Listo para poner agentes a trabajar en tu empresa?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Agenda una demo y descubre cómo agilizar tu operación con agentes IA 24/7.</p>
          <button onClick={onContact} className={`${cta} text-lg px-8 py-4`} style={{ backgroundColor: CYAN }}>Agendar Demo Gratuita</button>
        </div>
      </section>
    </>
  )
}
