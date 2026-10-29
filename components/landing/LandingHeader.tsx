'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PRODUCTS } from './products'
import { INDUSTRIES } from './industries'
import { AGENTS } from './agents'

type Item = { href: string; label: string; desc?: string; external?: boolean }
type Group = { key: string; label: string; items: Item[] }

const GROUPS: Group[] = [
  { key: 'productos', label: 'Productos', items: PRODUCTS.map((p) => ({ href: `/productos/${p.slug}`, label: p.name, desc: p.tagline })) },
  { key: 'agentes', label: 'Agentes', items: AGENTS.map((a) => ({ href: a.href, label: a.label })) },
  { key: 'industrias', label: 'Industrias', items: INDUSTRIES.map((i) => ({ href: `/industrias/${i.slug}`, label: i.name })) },
  {
    key: 'recursos', label: 'Recursos', items: [
      { href: '/#como-funciona', label: 'Metodología' },
      { href: '/#faq', label: 'Preguntas frecuentes' },
      { href: 'https://zeroazul.com/blog', label: 'Blog', external: true },
      { href: 'https://zeroazul.com', label: 'Zero Azul', external: true },
    ],
  },
]

const linkCls = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors'

function ItemLink({ item, onClick }: { item: Item; onClick?: () => void }) {
  const inner = (
    <>
      <span className="font-medium">{item.label}</span>
      {item.desc && <span className="block text-xs text-gray-500 font-normal">{item.desc}</span>}
    </>
  )
  return item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkCls} onClick={onClick}>{inner}</a>
    : <Link href={item.href} className={linkCls} onClick={onClick}>{inner}</Link>
}

export default function LandingHeader({ onContact, onLogin }: { onContact: () => void; onLogin?: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl text-gray-900">WORKERS</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5DE1E5' }}></span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" onMouseLeave={() => setOpen(null)}>
            {GROUPS.map((g) => (
              <div key={g.key} className="relative" onMouseEnter={() => setOpen(g.key)}>
                <button
                  type="button"
                  aria-expanded={open === g.key}
                  onClick={() => setOpen(open === g.key ? null : g.key)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  {g.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {open === g.key && (
                  <div className="absolute left-0 top-full pt-2 w-72">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 max-h-[70vh] overflow-y-auto">
                      {g.items.map((it) => <ItemLink key={it.href} item={it} onClick={() => setOpen(null)} />)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={onContact} className="ml-4 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
            {onLogin && <button onClick={onLogin} className="ml-2 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#000000' }}>Login</button>}
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={onContact} className="text-gray-900 px-4 py-2 rounded-lg font-semibold shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Demo</button>
            <button type="button" aria-label="Menú" aria-expanded={mobile} onClick={() => setMobile(!mobile)} className="p-2 text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobile ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
            </button>
          </div>
        </div>
      </div>

      {mobile && (
        <div className="lg:hidden border-t border-gray-200 bg-white max-h-[80vh] overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.key} className="border-b border-gray-100">
              <button type="button" onClick={() => setOpen(open === g.key ? null : g.key)} className="w-full flex justify-between items-center px-4 py-3 font-semibold text-gray-900">
                {g.label}
                <svg className={`w-4 h-4 transition-transform ${open === g.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {open === g.key && <div className="pb-2">{g.items.map((it) => <ItemLink key={it.href} item={it} onClick={() => setMobile(false)} />)}</div>}
            </div>
          ))}
          {onLogin && <button onClick={() => { setMobile(false); onLogin() }} className="w-full text-left px-4 py-3 font-semibold text-gray-900">Login</button>}
        </div>
      )}
    </header>
  )
}
