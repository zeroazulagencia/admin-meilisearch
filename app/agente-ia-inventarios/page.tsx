import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Inventarios | Controla tu stock sin fricción',
  description:
    'Automatiza el control de inventario de tu negocio con IA: monitorea stock, alerta faltantes y evita quiebres o sobre stock en tu operación.',
  keywords: [
    'agente ia inventarios',
    'agente de ia para inventarios',
    'automatizar control de inventario con IA',
    'IA para stock y bodega',
    'control de inventario con IA pyme',
  ],
  alternates: { canonical: '/agente-ia-inventarios' },
  openGraph: {
    title: 'Agente IA para Inventarios | Workers',
    description: 'Monitorea stock y anticipa faltantes con un agente de IA.',
    url: 'https://workers.zeroazul.com/agente-ia-inventarios',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAInventarios() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · INVENTARIOS"
      titleTop="Inventario al día"
      titleBottom="sin hojas de cálculo"
      subtitle="Un agente que monitorea stock, faltantes y rotación por ti."
      intro="El descontrol de inventario duele: se pierde ventas por faltantes o se deja plata congelada en productos que no rotan. Nuestro agente de IA vigila tu stock en tiempo real, cruza movimientos, detecta faltantes y quiebres, y avisa cuándo rápido tu reposición. Tu inventario claro, sin inventarios manuales."
      beneficios={[
        {
          title: 'Monitoreo en tiempo real',
          desc: 'Sabes cuánto tienes de cada producto, en todo momento y sin esperar a contar a mano.',
        },
        {
          title: 'Alertas de quiebre',
          desc: 'Detecta faltantes y niveles mínimos antes de perder una venta, con avisos automáticos.',
        },
        {
          title: 'Mejor uso del capital',
          desc: 'Identifica productos lentos o pasados de stock para comprar mejor y liberar efectivo.',
        },
      ]}
      casoTitle="Dejar de quedarse sin lo que más se vende"
      casoDesc="Un retail pequeño perdía ventas cada semana por quedarse sin sus productos estrella. El agente de IA conectó su bodega y punto de venta, monitoreó el stock y avisó antes del quiebre. También señaló qué productos no rotaban. Las compras se planificaron mejor y dejaron de perder las ventas que más les rinden."
      faqs={[
        {
          q: '¿Cómo sabe cuánto tengo realmente?',
          a: 'Integramos tu punto de venta, ERP o planilla actualizada. El agente compara ventas, entradas y salidas constantes para mantener el stock real.',
        },
        {
          q: '¿Sirve para negocios sin sistema de inventario?',
          a: 'Sí. Puedes empezar desde planillas o escaneando el inventario inicial, y el agente te ordena el flujo para no depender del papel.',
        },
        {
          q: '¿Sugiere cuánto comprar?',
          a: 'Sí. Con el histórico de ventas y rotación proyecta faltantes y sugiere cantidades de repos o reorder points.',
        },
        {
          q: '¿Cómo me avisa?',
          a: 'Por WhatsApp, correo o panel, con alertas de quiebre, stock bajo y productos con una rotación.',
        },
      ]}
      ctaHeading="¿Quieres controlar tu inventario sin fricción?"
    />
  )
}