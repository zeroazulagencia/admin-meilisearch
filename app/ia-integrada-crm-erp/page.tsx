import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'IA Integrada a tu CRM y ERP | Workers',
  description:
    'Integra agentes de IA a tu CRM y ERP: automatiza registro, seguimiento, reportes y flujos de negocio sin reemplazar tus sistemas.',
  keywords: [
    'ia integrada crm erp',
    'agente ia integrado a crm',
    'automatizar CRM con IA',
    'ia para ERP y CRM',
    'agentes de ia en sistemas empresariales',
  ],
  alternates: { canonical: '/ia-integrada-crm-erp' },
  openGraph: {
    title: 'IA integrada a tu CRM y ERP | Workers',
    description: 'Conecta agentes de IA a los sistemas que ya usas para automatizar tu operación.',
    url: 'https://workers.zeroazul.com/ia-integrada-crm-erp',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function IAIntegradaCRMErp() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · CRM Y ERP"
      titleTop="Tu CRM y ERP"
      titleBottom="trabajan contigo"
      subtitle="Agentes de IA integrados a los sistemas que ya usas."
      intro="Tu CRM y tu ERP ya guardan la información de tu negocio, pero alimentarlos cuesta horas y darles uso no siempre se logra. Nuestros agentes de IA se integran a estos sistemas sin reemplazarlos: registran datos, actualizan tareas, generan reportes y ejecutan procesos repetitivos. Más valor de tus herramientas, con el mismo sistema de siempre."
      beneficios={[
        {
          title: 'Datos siempre actualizados',
          desc: 'Registra interacciones, pedidos y estado de clientes automáticamente, sin capturas manuales.',
        },
        {
          title: 'Flujos que se ejecutan solos',
          desc: 'Dispara tareas, recordatorios y reportes dentro de tu CRM o ERP según reglas que defines.',
        },
        {
          title: 'Actualizada sin cambiar de sistema',
          desc: 'No reemplazas tu CRM o ERP. Los aprovechas al máximo con agentes que trabajan sobre ellos.',
        },
      ]}
      casoTitle="Un CRM que dejó de ser una carga para volverse una ventaja"
      casoDesc="Un equipo comercial registraba tarde y mal los avances en su CRM por falta de tiempo. Los agentes de IA tomaron el registro automático: leían cada conversación, actualizaban el estado, adjuntaban datos y disparaban tareas de seguimiento. El CRM pasó de ser una revisión obligatoria a una fuente viva para decidir."
      faqs={[
        {
          q: '¿Tengo que cambiar de CRM o ERP?',
          a: 'No. Nos integramos al sistema que ya usas para sumar automatización sin mover tu operación.',
        },
        {
          q: '¿Qué puede automatizar en mi CRM?',
          a: 'Registro de contactos y oportunidades, actualización de etapas, tareas de seguimiento, notas y reportes de ventas.',
        },
        {
          q: '¿Y en mi ERP?',
          a: 'Puede asistir pedidos, cotizaciones, inventario y reportes, respetando los permisos y reglas de tu empresa.',
        },
        {
          q: '¿Es segura la conexión?',
          a: 'Sí. Usamos integraciones oficiales con permisos controlados y accesos restringidos a lo que el agente necesita.',
        },
      ]}
      ctaHeading="¿Listo para que tus sistemas trabajen por ti?"
    />
  )
}