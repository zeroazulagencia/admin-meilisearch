import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Navbar from '@/components/Navbar'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://workers.zeroazul.com'),
  title: 'Workers | Agentes de IA para empresas · Polar Blue Agent',
  description: '¿Qué es Workers? La plataforma de agentes de inteligencia artificial que se conectan a tus sistemas y operan tus procesos de ventas, atención, finanzas, inventarios y más, 24/7.',
  keywords: 'agentes IA, agentes de inteligencia artificial, Polar Blue Agent, automatización empresarial, multiagentes, agente IA WhatsApp, IA para empresas Colombia, Zero Azul',
  alternates: {
    canonical: 'https://workers.zeroazul.com/',
  },
  icons: {
    icon: '/public-img/favicon.png',
    apple: '/public-img/favicon.png',
  },
  openGraph: {
    title: 'Workers | Agentes de IA para empresas',
    description: 'Equipos de agentes de IA conectados a tus sistemas para operar tus procesos 24/7. Polar Blue Agent, Workers Insights, Workers Knowledge y Polar Torre de Control, además de Conversso, Ecco, Sintessis y Vigilantte.',
    url: 'https://workers.zeroazul.com/',
    siteName: 'Workers by Zero Azul',
    locale: 'es_CO',
    type: 'website',
  },
}

const siteLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://workers.zeroazul.com/#organization',
      name: 'Workers by Zero Azul',
      legalName: 'Zero Azul Company S.A.S.',
      url: 'https://workers.zeroazul.com/',
      logo: 'https://workers.zeroazul.com/public-img/logo-dworkers.png',
      description: 'Plataforma de agentes de inteligencia artificial que se conectan a los sistemas de la empresa y operan sus procesos.',
      parentOrganization: { '@type': 'Organization', name: 'Zero Azul', url: 'https://zeroazul.com' },
      areaServed: { '@type': 'Country', name: 'Colombia' },
      sameAs: ['https://www.facebook.com/zeroazulagencia', 'https://www.instagram.com/zeroazulagencia/', 'https://www.linkedin.com/company/22294464'],
      contactPoint: { '@type': 'ContactPoint', telephone: '+57-319-594-7797', contactType: 'sales', availableLanguage: ['Spanish'] },
    },
    { '@type': 'WebSite', '@id': 'https://workers.zeroazul.com/#website', url: 'https://workers.zeroazul.com/', name: 'Workers by Zero Azul', inLanguage: 'es-CO', publisher: { '@id': 'https://workers.zeroazul.com/#organization' } },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
        {/* Google Tag Manager */}
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-T8LX85D7');
            `,
          }}
        />
        {/* WebMCP - load with strategy */}
        <Script src="/webmcp.js" strategy="afterInteractive" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-T8LX85D7"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

