import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Finanzas Pyme | Automatiza tu operación financiera',
  description:
    'Automatiza tareas financieras de tu pyme con IA: conciliación, reportes, control de caja y alertas de flujo, sin perder el control.',
  keywords: [
    'agente ia finanzas pyme',
    'agente de ia para finanzas',
    'automatizar finanzas con IA',
    'IA para control financiero pyme',
    'asistente financiero IA para empresas',
  ],
  alternates: { canonical: '/agente-ia-finanzas' },
  openGraph: {
    title: 'Agente IA para Finanzas Pyme | Workers',
    description: 'Automatiza conciliación, caja y reportes financieros con un agente de IA.',
    url: 'https://workers.zeroazul.com/agente-ia-finanzas',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIAFinanzas() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · FINANZAS"
      titleTop="Controla tus finanzas"
      titleBottom="sin tiempos muertos"
      subtitle="Un agente financiero que organiza, concilia y alerta por ti."
      intro="Las pymes pierden horas en conciliar, clasificar gastos y armar reportes. Nuestro agente de IA para finanzas automatiza esas tareas: cruza movimientos, mantiene la caja ordenada, detecta salidas de flujo y te alerta antes de llegar como problema. Tu control financiero al día, sin crecer el equipo contable."
      beneficios={[
        {
          title: 'Conciliación automática',
          desc: 'Cruza bancos, facturas y comprobantes en segundos para que tus saldos sí cierren.',
        },
        {
          title: 'Reportes listos cuando los pides',
          desc: 'Flujo de caja, gastos por categoría y rentabilidad, disponibles al momento, sin esperar al cierre de mes.',
        },
        {
          title: 'Alertas de riesgo temprano',
          desc: 'Detecta cuentas por pagar próximas, saldos bajos y movimientos extraños con tiempo para actuar.',
        },
      ]}
      casoTitle="Una pyme que supo de sus números sin esperar el fin de mes"
      casoDesc="Una pyme dedicada a servicios llevaba la contabilidad en planillas con semanas de retraso. El agente de IA empezó a conciliar automáticamente sus cuentas y a generar reportes diarios. El dueño tomaba decisiones con datos frescos y el flujo de caja dejó de ser una sorpresa de último momento."
      faqs={[
        {
          q: '¿Reemplaza a mi contador?',
          a: 'No. Ordena la operación y libera a tu contador de tareas repetitivas para que se concentre en planificar, minimizar impuestos y dar asesoría estratégica.',
        },
        {
          q: '¿Es seguro darle acceso a mis movimientos?',
          a: 'Sí. Trabajamos sobre conexiones de solo lectura, con permisos mínimos y cifrado. Puede revisar y decisión de qué datos y cuentas se conectan.',
        },
        {
          q: '¿Qué reportes genera?',
          a: 'Flujo de caja, conciliaciones, ingresos y gastos por categoría, cuentas por cobrar y pagar, y alertas personalizadas que defines.',
        },
        {
          q: '¿Con qué sistemas se integra?',
          a: 'Automatiza fuentes como bancos, planillas y ERP o CRM según tu operación actual, para que no cambies tu forma de trabajar.',
        },
      ]}
      ctaHeading="¿Quieres controlar tus finanzas al día?"
    />
  )
}