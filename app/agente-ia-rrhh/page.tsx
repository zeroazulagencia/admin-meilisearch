import type { Metadata } from 'next'
import LandingShell from '@/components/LandingShell'

export const metadata: Metadata = {
  title: 'Agente IA para Recursos Humanos | Automatiza tu gestión de talento',
  description:
    'Automatiza tareas de RRHH con un agente de IA: filtra postulantes, responde a empleados y agiliza onboarding sin perder el trato humano.',
  keywords: [
    'agente ia rrhh',
    'agente de ia recursos humanos',
    'automatizar rrhh con IA',
    'IA para gestión de talento',
    'asistente IA para RRHH pyme',
  ],
  alternates: { canonical: '/agente-ia-rrhh' },
  openGraph: {
    title: 'Agente IA para Recursos Humanos | Workers',
    description: 'Automatiza selección, onboarding y consultas internas con un agente de IA.',
    url: 'https://workers.zeroazul.com/agente-ia-rrhh',
    siteName: 'Workers by Zero Azul',
    type: 'website',
  },
}

export default function AgenteIARRHH() {
  return (
    <LandingShell
      eyebrow="AGENTE IA · RECURSOS HUMANOS"
      titleTop="RRHH más ágil"
      titleBottom="con un agente IA"
      subtitle="Automatiza la gestión de talento y libera a tu equipo de personas para lo importante."
      intro="RRHH repite las mismas tareas: filtrar postulantes, responder dudas internas y perseguir documentos. Nuestro agente de IA se ocupa de lo operativo: organiza candidatos, responde al momento consultas de empleados, agiliza el onboarding y deja a tu equipo de personas con más tiempo para entrevistar y cuidar cultura."
      beneficios={[
        {
          title: 'Filtra postulantes por ti',
          desc: 'Clasifica hojas de vida, responde dudas frecuentes y acerca los mejores perfiles al reclutador.',
        },
        {
          title: 'Consultas internas al instante',
          desc: 'Tu equipo obtiene respuestas inmediatas sobre vacaciones, nómina y políticas, sin esperar a RRHH.',
        },
        {
          title: 'Onboarding sin caos',
          desc: 'Da la bienvenida, organiza documentos y acompaña los primeros días de cada nueva persona.',
        },
      ]}
      casoTitle="Un RRHH que dejó de ahogarse en tareas repetitivas"
      casoDesc="Una empresa en crecimiento recibía decenas de postulaciones y consultas internas a diario. Implementaron un agente de IA que clasificaba perfiles, respondía dudas frecuentes de empleados y agilizaba el onboarding. RRHH recuperó horas semanales y se enfocó en entrevistar y cuidar la cultura, no en copiar y pegar respuestas."
      faqs={[
        {
          q: '¿Reemplaza al área de RRHH?',
          a: 'No. Automatiza lo operativo y da tiempo para lo estratégico: evaluar talento, cuidar la experiencia del empleado y tomar decisiones de cultura.',
        },
        {
          q: '¿Puede gestionar datos sensibles?',
          a: 'Sí, con reglas claras de acceso y privacidad. Solo definimos qué datos pueden ver y manipularse, con permisos y registro.',
        },
        {
          q: '¿Cómo responde a los empleados?',
          a: 'Está disponible por WhatsApp o mensajería interna para que cada persona resuelva dudas de nómina, horarios o políticas al momento.',
        },
        {
          q: '¿También hace onboarding?',
          a: 'Sí, puede dar la bienvenida, recoger documentación pendiente, explicar políticas y dar seguimiento durante el proceso.',
        },
      ]}
      ctaHeading="¿Listo para un RRHH sin tareas repetitivas?"
    />
  )
}