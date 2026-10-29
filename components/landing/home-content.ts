import type { Faq, Field } from './types'

export const HOME_STEPS: Field[] = [
  { title: 'Conectamos tus sistemas', desc: 'ERPs, CRMs, hojas de cálculo, bases de datos, APIs internas y canales como WhatsApp quedan integrados sin migrar nada.' },
  { title: 'Ordenamos tu contexto', desc: 'Reunimos datos dispersos, reglas de negocio y documentos en una base de conocimiento que tus agentes consultan y en la que tu equipo puede confiar.' },
  { title: 'Ponemos agentes a operar', desc: 'Desplegamos agentes en procesos reales, con permisos definidos, supervisión y métricas desde un panel.' },
]

export const HOME_PILLARS: Field[] = [
  { title: 'Flujos auditables', desc: 'Cada tarea de un agente queda registrada de principio a fin.' },
  { title: 'Trazabilidad de modelos', desc: 'Sabes qué modelo respondió, con qué información y cuándo.' },
  { title: 'Acceso gobernado', desc: 'Permisos por rol y por agente sobre cada sistema y dato.' },
  { title: 'Datos bajo tu control', desc: 'Definimos contigo dónde residen y quién puede acceder a tu información.' },
]

export const HOME_TESTIMONIALS = [
  { name: 'Daniel Alejandro Benjumea Mejía', text: 'Excelente atención y muy detallados en lo solicitado.' },
  { name: 'Santiago Cruz G', text: 'Dan excelente servicio y muy buenos en lo que hacen.' },
  { name: 'Nicolás Aragón', text: 'Muy buena atención y buen equipo de trabajo.' },
  { name: 'Andrés González Hoyos', text: 'Trabajan responsablemente con excelente servicio.' },
]

export const HOME_FAQS: Faq[] = [
  { q: '¿Qué es Workers?', a: 'Workers es la plataforma de agentes de inteligencia artificial de Zero Azul. Diseñamos equipos de agentes que se conectan a tus sistemas y ejecutan procesos de negocio: ventas, atención, finanzas, inventarios, recursos humanos y analítica.' },
  { q: '¿Qué hace exactamente un agente de inteligencia artificial?', a: 'Es un programa autónomo que usa IA para ejecutar tareas específicas: conversar con clientes, procesar información, tomar decisiones basadas en reglas, consultar sistemas y ejecutar acciones dentro de tus flujos de trabajo.' },
  { q: '¿Se integran con nuestros sistemas actuales?', a: 'Sí. Los agentes se conectan con APIs, bases de datos, ERPs, CRMs, herramientas internas y cualquier sistema con una interfaz disponible, sin reemplazar lo que ya usas.' },
  { q: '¿Cuánto tarda la implementación?', a: 'Un agente de atención básico puede estar operativo en 2 a 4 semanas. Agentes con integración profunda a varios sistemas pueden tomar de 6 a 12 semanas, entregados por fases.' },
  { q: '¿Qué seguridad y control tienen los agentes?', a: 'Cifrado de datos, control de acceso por roles, registros detallados de actividad y auditorías periódicas. Los agentes operan dentro de parámetros definidos y toda su actividad es monitoreable.' },
]
