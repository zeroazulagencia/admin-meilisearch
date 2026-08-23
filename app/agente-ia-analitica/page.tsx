import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Analítica | Convierte tus datos en decisiones',
  description:
    'Automatiza el análisis de datos de tu empresa con un agente de IA: responde preguntas, genera reportes y anticipa tendencias sin esperar al equipo técnico.',
  keywords: [
    'agente ia analitica',
    'agente de ia para analítica de datos',
    'automatizar análisis de datos con IA',
    'IA para inteligencia de negocio pyme',
    'reportes automáticos con IA',
  ],
  alternates: { canonical: '/agente-ia-analitica' },
  openGraph: {
    title: 'Agente IA para Analítica | Workers',
    description: 'Transforma tus datos en decisiones comerciales con un agente de IA.',
    url: 'https://workers.zeroazul.com/agente-ia-analitica',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAAnalitica() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · ANALÍTICA"
      titleTop="Datos que se convierten"
      titleBottom="en decisiones"
      subtitle="Un agente que responde y reporta sobre tu información sin esperar."
      intro="Tienes los datos, pero responder preguntas de negocio toma días. Nuestro agente de IA para analítica conecta tus fuentes y responde al momento: resuelve consultas en lenguaje natural, genera reportes automáticos, detecta tendencias y anuncia qué necesita tu atención. Información accionable, sin depender de un equipo técnico cada vez."
      beneficios={[
        {
          title: 'Preguntas, respuestas al instante',
          desc: 'Pregunta en lenguaje natural y obtén respuestas claras sobre ventas, clientes u operación, sin armar consultas.',
        },
        {
          title: 'Reportes automáticos',
          desc: 'Recibe informes diarios o semanales con los indicadores que de verdad importan, sin armarlos a mano.',
        },
        {
          title: 'Señales tempranas',
          desc: 'Detecta tendencias, anomalías y oportunidades antes de que se vuelvan problemas de negocio.',
        },
      ]}
      casoTitle="Responder preguntas de negocio en segundos"
      casoDesc="Un equipo comercial tardaba días en pedir números al área de datos para decidir. El agente de IA se conectó a su base y herramientas, y desde entonces respondía al momento preguntas como cuánto se vendió este mes o qué clientes están por renovar. Las reuniones pasaron de promesas a datos frescos, y las decisiones dejaron de esperar."
      faqs={[
        {
          q: '¿Necesito un equipo técnico para usarlo?',
          a: 'No. Nosotros conectamos tus fuentes y el agente queda listo para responder preguntas y armar reportes en lenguaje natural.',
        },
        {
          q: '¿Qué fuentes puedo conectar?',
          a: 'Bases de datos, hojas de cálculo, ERP, CRM y herramientas de venta o marketing. Trabajamos con las que ya usas.',
        },
        {
          q: '¿Es confiable con mis números?',
          a: 'Sí. Se configura sobre datos reales y cada respuesta apunta a la fuente. Puedes validar y ajustar los indicadores que reporte.',
        },
        {
          q: '¿Hace predicciones?',
          a: 'Puede anticipar tendencias y alertar riesgos con base en tu histórico, siempre como apoyo y con revisión humana.',
        },
      ]}
      ctaHeading="¿Quieres que tus datos respondan por ti?"
    />
  )
}