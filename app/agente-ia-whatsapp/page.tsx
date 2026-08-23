import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para WhatsApp | Ventas y atención automatizada en WhatsApp',
  description:
    'Implementa un agente de IA en WhatsApp de tu negocio: responde a clientes, cualifica leads y vende 24/7 en el canal que tus clientes ya usan.',
  keywords: [
    'agente IA whatsapp',
    'agente IA whatsapp ventas',
    'chatbot IA whatsapp para vender',
    'automatizar whatsapp con IA',
    'ventas por whatsapp con IA',
  ],
  alternates: { canonical: '/agente-ia-whatsapp' },
  openGraph: {
    title: 'Agente IA para WhatsApp | Workers',
    description: 'Vende y atiende clientes en WhatsApp con un agente de IA 24/7.',
    url: 'https://workers.zeroazul.com/agente-ia-whatsapp',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAWhatsapp() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · WHATSAPP"
      titleTop="Tu canal de WhatsApp"
      titleBottom="vende y atiende solo"
      subtitle="Automatiza conversaciones en WhatsApp para no perder ningún cliente."
      intro="El 80% de las pymes vende por WhatsApp, pero responder a tiempo es imposible sin un equipo grande. Nuestro agente de IA gestiona el canal por ti: responde al instante, muestra clientes la información, les da seguimiento y empuja la conversación hacia la compra. Disponible 24/7, escalable y en tu tono."
      beneficios={[
        {
          title: 'Respuesta inmediata',
          desc: 'Cada mensaje recibe una respuesta en segundos, sin listas de espera que enfrían a tu cliente.',
        },
        {
          title: 'Venta conversacional',
          desc: 'El agente acompaña la conversación, resuelve dudas y avanza el proceso de compra hasta cerrar o agendar.',
        },
        {
          title: 'Integrado a tu operación',
          desc: 'Se conecta con tu catálogo, tu CRM y tu agenda para dar respuestas útiles y registrar cada interacción.',
        },
      ]}
      casoTitle="Una pyme que dejó de perder pedidos por no responder"
      casoDesc="Una tienda online recibía más de 200 mensajes al día por WhatsApp y su equipo solo con 40. Instalaron un agente de IA: respondía consultas de stock, envíos y pagos, agendaba compras y escalaba al humano solo lo complejo. La respuesta oportuna se convirtió en más pedidos completados sin contratar a nadie."
      faqs={[
        {
          q: '¿Necesito WhatsApp Business API para usarlo?',
          a: 'Sí, lo conectamos a tu WhatsApp Business API. Nosotros te guiamos en el alta para que el agente pueda operar como un WhatsApp oficial con tu número.',
        },
        {
          q: '¿Puede responder con el tono de mi marca?',
          a: 'Por supuesto. Antes de activarlo lo entrenamos con tu oferta, tus productos y el estilo con el que hablas a tus clientes.',
        },
        {
          q: '¿Puede vender de verdad o solo responder?',
          a: 'Puede ir tan lejos como tú configures: a partir de responder preguntas, el puente a cotización, agendar reuniones o transferir la conversación a un humano en el momento justo.',
        },
        {
          q: '¿Qué pasa si un mensaje es demasiado complejo?',
          a: 'El agente reconoce cuándo la conversación merece una persona y la transfiere con todo el contexto incluido, para que el humano llegue como buen punto de partida.',
        },
      ]}
      ctaHeading="¿Deseas que tu WhatsApp venda mientras duermes?"
    />
  )
}