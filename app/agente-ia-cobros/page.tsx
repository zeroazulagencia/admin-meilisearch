import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Cobros | Reduce tu cartera vencida automáticamente',
  description:
    'Automatiza la gestión de cobros con un agente de IA: recuerda deudas, negocia plazos y recupera tu cartera sin fricción con los clientes.',
  keywords: [
    'agente ia cobros',
    'agente de ia para cobros',
    'automatizar cobros con IA',
    'recuperar cartera con IA',
    'cobranza automática pyme',
  ],
  alternates: { canonical: '/agente-ia-cobros' },
  openGraph: {
    title: 'Agente IA para Cobros | Workers',
    description: 'Automatiza recordatorios y recupera tu cartera vencida con un agente de IA.',
    url: 'https://workers.zeroazul.com/agente-ia-cobros',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIACobros() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · COBROS"
      titleTop="Cobra más sin"
      titleBottom="dañar la relación"
      subtitle="Un agente que gestiona recordatorios y acuerdos de pago por ti."
      intro="El cobro incomoda y, sin seguimiento, la cartera se vence. Nuestro agente de IA asume la cobranza: envía recordatorios en el momento justo, responde dudas sobre facturas, procesa pagos parciales y escala con tacto cuando un cliente realmente no puede pagar. Más liquidez, sin fricciones."
      beneficios={[
        {
          title: 'Recordatorios en el momento justo',
          desc: 'Avisos de vencimiento y seguimiento personalizados por WhatsApp o correo, sin sonar insistente.',
        },
        {
          title: 'Acuerdos de pago ágiles',
          desc: 'Ofrece plazos y negocia montos dentro de las reglas que defines, y registra cada acuerdo.',
        },
        {
          title: 'Cartera bajo control',
          desc: 'Sabes en tiempo real quién te debe, cuánto y desde cuándo, con prioridades claras.',
        },
      ]}
      casoTitle="Recuperar efectivo sin pierna el cliente"
      casoDesc="Una distribuidora tenía una cartera envejecida por falta de seguimiento. El agente de IA tomó los recordatorios y la negociación inicial: recordaba a tiempo, ofrecía opciones de pago válidas y escalaba solo los casos difíciles. La cartera recuperada subió en pocas semanas, y los clientes dejaron de sentirse hostigados."
      faqs={[
        {
          q: '¿Puede dañar la relación con mis clientes?',
          a: 'No si está bien configurado. El agente se entrena con tu tono, respeta plazos y pasencias, y escala casos complejos al humano para evitar roces.',
        },
        {
          q: '¿Qué canales usa para cobrar?',
          a: 'Puede gestionar WhatsApp, correo y llamadas, y enviar recordatorios por el canal que tu cliente prefiera.',
        },
        {
          q: '¿Negocia descuentos o plazos?',
          a: 'Lo hace dentro de los límites y reglas que tú defines, pidiendo confirmación humana en descuentos más agregados.',
        },
        {
          q: '¿Cómo escala un caso difícil?',
          a: 'Detecta respuestas, evasivas o situaciones sensibles y transfiere al cobrador humano con el historial completo.',
        },
      ]}
      ctaHeading="¿Quieres cobrar más sin perjudicar a tus clientes?"
    />
  )
}