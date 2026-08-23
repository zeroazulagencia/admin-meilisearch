import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Asistente Virtual IA para Atención al Cliente | Workers',
  description:
    'Automatiza la atención al cliente con un agente de IA: responde dudas, gestiona tickets y reduce el tiempo de espera 24/7 en todos tus canales.',
  keywords: [
    'asistente virtual ia atencion cliente',
    'agente de ia atencion al cliente',
    'chatbot de atención al cliente',
    'automatizar servicio al cliente con IA',
    'soporte 24/7 con IA',
  ],
  alternates: { canonical: '/agentes-ia-atencion-cliente' },
  openGraph: {
    title: 'Asistente Virtual IA para Atención al Cliente | Workers',
    description: 'Responde y resuelve las dudas de tus clientes 24/7 con IA.',
    url: 'https://workers.zeroazul.com/agentes-ia-atencion-cliente',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgentesAIAtencionCliente() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · ATENCIÓN AL CLIENTE"
      titleTop="Atiende a tus clientes"
      titleBottom="sin filas ni esperas"
      subtitle="Un asistente virtual que resuelve consultas y gestiona el soporte por ti."
      intro="La atención al cliente define si vuelven o se van. Nuestro asistente de IA responde dudas frecuentes, da seguimiento a pedidos, canaliza quejas y deriva a una persona cuando hace falta. Tus clientes quedan atendidos al instante, y tu equipo, con menos tareas repetitivas y más tiempo para casos valiosos."
      beneficios={[
        {
          title: 'Disponible 24/7',
          desc: 'Atiende a tus clientes a cualquier hora, los fines de semana y en fechas especiales, sin depender del horario de tu equipo.',
        },
        {
          title: 'Primera respuesta en segundos',
          desc: 'Resuelve dudas comunes al momento y evita la frustración de la larga espera.',
        },
        {
          title: 'Escala sin más personal',
          desc: 'Absorbe picos de demanda y miles de consultas con la misma calidad, sin contrataciones extra.',
        },
      ]}
      casoTitle="Soporte que respondía en minutos en vez de horas"
      casoDesc="Una empresa de servicios con base de clientes en crecimiento notó que el soporte se saturaba y las respuestas tardaban horas. Implementaron un asistente de IA que respondía de inmediato las consultas frecuentes, registraba solicitudes y escalada casos complejos al equipo humano. El ticket promedio pasó de 4 horas a menos de 2 minutos de respuesta."
      faqs={[
        {
          q: '¿Reemplaza a mi equipo de soporte?',
          a: 'No; lo complementa. El agente resuelve lo repetitivo y tu equipo se enfoca en los casos que necesitan criterio y trato humano.',
        },
        {
          q: '¿En qué canales puedo usarlo?',
          a: 'Puede operar en tu web una primera respuesta, WhatsApp, correo y redes sociales, según dónde estén tus clientes.',
        },
        {
          q: '¿Aprende de mi negocio?',
          a: 'Sí. Lo cargamos con tu base de conocimiento: preguntas frecuentes, políticas, productos y procesos, y lo actualizamos con los cambios de tu operación.',
        },
        {
          q: '¿Cómo deriva casos complejos a una persona?',
          a: 'Con un flujo de escalamiento: detecta el momento en que un cliente necesita atención humana y transfiere con el historial completo.',
        },
      ]}
      ctaHeading="¿Listo para atender a tus clientes sin esperas?"
    />
  )
}