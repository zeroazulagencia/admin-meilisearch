import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA de Ventas | Automatiza tu equipo comercial con Workers',
  description:
    'Contrata un agente de IA especializado en ventas para tu pyme: califica leads, envía mensajes, agenda reuniones y cierra más oportunidades 24/7 sin ampliar plantilla.',
  keywords: [
    'agente IA ventas',
    'agente de inteligencia artificial para ventas',
    'automatizar ventas con IA',
    'asistente IA comercial pyme',
    'agente IA que vende',
  ],
  alternates: { canonical: '/agente-ia-ventas' },
  openGraph: {
    title: 'Agente IA para Ventas | Workers',
    description:
      'Automatiza la prospección, el seguimiento y el cierre comercial con un agente de IA 24/7.',
    url: 'https://workers.zeroazul.com/agente-ia-ventas',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAVentas() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · VENTAS"
      titleTop="Un agente de IA que"
      titleBottom="vende por tu equipo"
      subtitle="Automatiza la prospección y el seguimiento comercial sin aumentar tu plantilla."
      intro="Nuestro agente de IA para ventas trabaja 24/7: identifica leads, les escribe en el momento justo, agenda reuniones y mantiene las negociaciones avanzando mientras tu equipo se concentra en cerrar. Diseñado para pymes que quieren más conversión sin contratar más personas."
      beneficios={[
        {
          title: 'Prospección automática',
          desc: 'Detecta, califica y prioriza leads en tiempo real para que tu equipo ataque clientes con mayor probabilidad de compra.',
        },
        {
          title: 'Seguimiento sin olvidos',
          desc: 'Ningún lead queda frío. El agente envía seguimientos en el momento justo y mantiene la conversación viva.',
        },
        {
          title: 'Cierre asistido',
          desc: 'Prepara propuestas, responde objeciones y acerca cada oportunidad al cierre con datos y contexto en todo momento.',
        },
      ]}
      casoTitle="Cómo un agente de ventas mantiene viva tu cartera"
      casoDesc="Una pyme de servicios tenía decenas de leads sin seguimiento por falta de tiempo. El agente IA asumió la prospección y el seguimiento por WhatsApp y correo: respondía dudas en segundos, agendaba reuniones y recordaba cada paso. En un mes, casi el 40% de esos leads volvió a avanzar sin que nadie del equipo necesitara dedicar horas extra."
      faqs={[
        {
          q: '¿Qué es un agente de IA para ventas?',
          a: 'Es un asistente de inteligencia artificial que automatiza la parte repetitiva del proceso comercial: captar, calificar y hacer seguimiento de leads, sin reemplazar la conversación y el criterio humano que cierra la venta.',
        },
        {
          q: '¿Reemplaza a mi equipo comercial?',
          a: 'No. Lo libera de tareas repetitivas para que las personas se concentren en negociar y cerrar. El agente organiza el flujo y califica; el humano decide y cobra clientes.',
        },
        {
          q: '¿En qué canales puede trabajar?',
          a: 'Puede operar en WhatsApp, correo y formularios de tu web, además de integrarse con tu CRM para registrar cada conversación y paso del proceso.',
        },
        {
          q: '¿Cuánto tarda en implementarse?',
          a: 'En pocos días. Conectamos el agente a tus canales y le entregamos tu oferta y tono para que empiece a trabajar con una prueba controlada.',
        },
      ]}
      ctaHeading="¿Listo para que un agente IA venda por ti?"
    />
  )
}