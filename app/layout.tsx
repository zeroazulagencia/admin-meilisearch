import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Empleados digitales :: DWORKERS | Agencia de Inteligencia Artificial',
  description: 'Empleados digitales multiagente con inteligencia artificial, automatizar interacciones y optimizar procesos empresariales. Maximiza Beneficios con agentes IA, asistentes digitales y automatización RPA.',
  keywords: 'agentes IA, agentes ai, asistentes digitales, agencia de inteligencia artificial, multiagentes, automatización empresarial, RPA, inteligencia artificial, agentes digitales, automatización con IA',
  icons: {
    icon: '/public-img/favicon.png',
    apple: '/public-img/favicon.png',
  },
  openGraph: {
    title: 'Empleados digitales :: DWORKERS',
    description: 'Con el poder la Inteligencia artificial y RPA ofrecemos un equipo de trabajo infinito de multiagentes, eficiente y efectivo para tareas en tu empresa.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Google Tag Manager */}
        <script
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

