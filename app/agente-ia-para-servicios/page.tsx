import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Empresas de Servicios | Automatiza tu operación',
  description:
    'Impulsa con IA los procesos de tu empresa de servicios: agendamiento, cotizaciones, seguimiento a clientes y soporte, con un agente que trabaja 24/7.',
  keywords: [
    'agente ia para servicios',
    'agente de ia para empresas de servicios',
    'automatizar empresa de servicios con IA',
    'IA para agendamiento y cotización',
    'agente IA pyme de servicios',
  ],
  alternates: { canonical: '/agente-ia-para-servicios' },
  openGraph: {
    title: 'Agente IA para Empresas de Servicios | Workers',
    description: 'Automatiza agendamiento, cotización y soporte de tu empresa de servicios.',
    url: 'https://workers.zeroazul.com/agente-ia-para-servicios',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAParaServicios() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · EMPRESAS DE SERVICIOS"
      titleTop="Tu empresa de servicios"
      titleBottom="nunca para de vender"
      subtitle="Automatiza cotizaciones, agendamiento y soporte para escalar tu operación."
      intro="Las empresas de servicios dependen de responder rápido y no perder trabajo. Nuestro agente de IA gestiona el ciclo completo por ti: agenda citas, envía cotizaciones, da seguimiento a clientes y ofrece soporte técnico. Tu operación avanza 24/7 sin que el equipo dependa de estar disponible para cada consulta."
      beneficios={[
        {
          title: 'Agendamiento automático',
          desc: 'Tus clientes agendan servicios y verifican disponibilidad en segundos, sin ida y vuelta de mensajes.',
        },
        {
          title: 'Cotizaciones ágiles',
          desc: 'Reúne datos del trabajo, prepara presupuesto en tu formato y da seguimiento hasta que el cliente decide.',
        },
        {
          title: 'Soporte post-servicio',
          desc: 'Resuelve dudas frecuentes, canaliza garantías y mantiene al cliente satisfecho después del trabajo.',
        },
      ]}
      casoTitle="Una empresa de servicios que cerró más con menos fricción"
      casoDesc="Una empresa de servicios a domicilio perdía cotizaciones porque el equipo tardaba en responder. El agente IA tomaba la solicitud, agendaba la visita y enviaba cotización al instante con seguimiento. Los clientes recibían respuesta inmediata, el cierre se aceleró y el equipo dedicó ese tiempo a ejecutar bien el servicio."
      faqs={[
        {
          q: '¿Puede cotizar según mi servicio?',
          a: 'Sí. Lo entrenamos con tu catálogo de servicios y reglas de precio. El agente pide los datos necesarios y prepara la cotización correcta.',
        },
        {
          q: '¿Cómo llega lo clientes a agendar?',
          a: 'Por WhatsApp, tu web o redes sociales. Coordina con tu agenda y bloca la cita directa, verificando disponibilidad.',
        },
        {
          q: '¿Qué pasa con preguntas técnicas?',
          a: 'Resuelve las frecuentes y escala las complejas al técnico humano con el contexto de la conversación.',
        },
        {
          q: '¿Solo sirve para atender, no para vender?',
          a: 'También empuja la venta: da seguimiento a cotizaciones, recuerda propuestas pendientes y acerca al cliente a decidir.',
        },
      ]}
      ctaHeading="¿Quieres que tu empresa de servicios cierre más trabajo?"
    />
  )
}