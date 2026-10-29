import type { Product } from './types'

/** Ecosistema Zero Azul. Polar Blue Agent es la plataforma de agentes de Workers; el resto son productos hermanos. */
export const PRODUCTS: Product[] = [
  {
    slug: 'polar-blue-agent',
    name: 'Polar Blue Agent',
    tagline: 'Equipos de agentes IA que operan dentro de tus procesos',
    core: true,
    seoTitle: 'Polar Blue Agent | Equipos de agentes IA para empresas | Workers',
    seoDescription:
      '¿Qué es Polar Blue Agent? Polar Blue Agent es la plataforma de Workers para desplegar equipos de agentes IA autónomos conectados a tu CRM, ERP, bases de datos y canales como WhatsApp.',
    eyebrow: 'PRODUCTO · AGENTES',
    titleTop: 'Un equipo de agentes IA que',
    titleBottom: 'trabaja como parte de tu empresa',
    subtitle: 'Polar Blue Agent conecta tus sistemas, entiende tu operación y ejecuta procesos completos.',
    intro:
      '¿Qué es Polar Blue Agent? Es la plataforma de agentes de IA de Workers. No es un chatbot suelto. Es una plataforma para diseñar, desplegar y supervisar agentes especializados por área (ventas, finanzas, atención, inventarios, RRHH) que comparten contexto, se coordinan entre sí y actúan sobre tus herramientas reales con reglas y permisos definidos por ti.',
    beneficios: [
      { title: 'Agentes por área, un solo equipo', desc: 'Cada agente domina una función y todos comparten la misma información de la empresa, por eso no se contradicen ni duplican trabajo.' },
      { title: 'Conectado a tus sistemas', desc: 'Lee y escribe en CRMs, ERPs, hojas de cálculo, bases de datos y canales de atención mediante APIs, sin migrar nada.' },
      { title: 'Supervisión y trazabilidad', desc: 'Cada acción queda registrada. Ves qué hizo cada agente, cuándo y con qué información, y puedes intervenir cuando quieras.' },
    ],
    capacidades: [
      { title: 'Agentes por área', desc: 'Ventas, finanzas, atención, inventarios, RRHH y analítica: cada agente domina una función de tu operación.' },
      { title: 'Un equipo que se coordina', desc: 'Los agentes comparten contexto y se pasan el trabajo entre sí, sin duplicar ni contradecirse.' },
      { title: 'Conectado a tus sistemas', desc: 'Lee y actúa sobre CRM, ERP, bases de datos y hojas de cálculo mediante APIs, sin migrar nada.' },
      { title: 'Canales donde ya están tus clientes', desc: 'WhatsApp y otros canales de atención, con la misma información que ve tu equipo.' },
      { title: 'Reglas y permisos definidos por ti', desc: 'Cada agente sabe qué puede hacer, con qué datos y cuándo debe escalar a una persona.' },
      { title: 'Supervisión y trazabilidad', desc: 'Cada acción queda registrada: qué hizo, cuándo y con qué información.' },
    ],
    casoTitle: 'De procesos manuales a un departamento que no se detiene',
    casoDesc:
      'Una empresa de servicios coordinaba cotizaciones, seguimiento y cobros con hojas de cálculo y mensajes sueltos. Con un equipo de agentes conectado a su CRM y a WhatsApp, cada lead se califica, cada cotización sale a tiempo y cada cobro tiene seguimiento, con el equipo humano enfocado en negociar y decidir.',
    faqs: [
      { q: '¿Qué es Polar Blue Agent?', a: 'Es la plataforma de Workers para construir equipos de agentes de inteligencia artificial que ejecutan procesos de negocio: atienden clientes, califican leads, concilian pagos, controlan inventarios y más, conectados a los sistemas que ya usas.' },
      { q: '¿En qué se diferencia de un chatbot?', a: 'Un chatbot responde preguntas. Un agente toma decisiones dentro de reglas, consulta y actualiza sistemas, y se coordina con otros agentes para completar tareas de principio a fin.' },
      { q: '¿Cuánto tarda la implementación?', a: 'Un agente de alcance acotado puede estar operativo en 2 a 4 semanas. Equipos con integraciones profundas suelen tomar entre 6 y 12 semanas, con entregas por fases.' },
    ],
    ctaHeading: '¿Listo para poner un equipo de agentes a trabajar en tu empresa?',
  },
  {
    slug: 'workers-insights',
    name: 'Workers Insights',
    tagline: 'Inteligencia operativa sobre los datos vivos de tu empresa',
    core: true,
    seoTitle: 'Workers Insights | Inteligencia operativa con IA para empresas | Workers',
    seoDescription:
      '¿Qué es Workers Insights? Workers Insights unifica los datos de tus sistemas para que preguntes en lenguaje natural, rastrees cada respuesta hasta su origen y detectes a tiempo lo que pide atención.',
    eyebrow: 'PRODUCTO · INTELIGENCIA',
    titleTop: 'Inteligencia operativa sobre',
    titleBottom: 'los datos vivos de tu empresa',
    subtitle: 'Pregunta, rastrea cada respuesta hasta su origen y descubre a tiempo lo que pide atención.',
    intro:
      '¿Qué es Workers Insights? Workers Insights conecta los sistemas donde ya vive tu operación y los convierte en una sola fuente de verdad. Tu equipo consulta en lenguaje natural, ve de dónde sale cada número y recibe avisos cuando algo cambia, con los siguientes pasos ya propuestos.',
    beneficios: [
      { title: 'Respuestas que puedes verificar', desc: 'Cada cifra se rastrea hasta el sistema, el registro y la transacción de origen, para decidir con confianza.' },
      { title: 'Anticipas en vez de reaccionar', desc: 'La plataforma vigila tus datos y señala desviaciones y patrones inusuales antes de que se vuelvan problema.' },
      { title: 'De la información a la acción', desc: 'Cada hallazgo llega con acciones recomendadas y priorizadas que tu equipo o tus agentes pueden ejecutar.' },
    ],
    capacidades: [
      { title: 'Una sola fuente de verdad operativa', desc: 'Unifica datos de CRM, ERP, finanzas, inventario y canales en un mismo modelo, sin migrar ni duplicar información.' },
      { title: 'Análisis en lenguaje natural', desc: 'Pregunta como le hablarías a un analista y recibe respuestas respaldadas por los datos de tu empresa.' },
      { title: 'Detección proactiva de anomalías', desc: 'Identifica cambios inusuales en ventas, cartera, inventarios o tiempos de respuesta y te avisa a tiempo.' },
      { title: 'Drill-down hasta la transacción', desc: 'Navega desde el indicador de toda la empresa hasta el registro individual que lo explica.' },
      { title: 'Próximos pasos recomendados', desc: 'Convierte cada hallazgo en acciones priorizadas, con responsable y contexto.' },
      { title: 'Reportes automáticos', desc: 'Genera y envía los informes recurrentes de cada área con los datos del momento, sin armarlos a mano.' },
    ],
    casoTitle: 'De reportes armados a mano a decisiones con los datos del día',
    casoDesc:
      'Un equipo comercial y financiero cerraba cada mes conciliando exportaciones de varios sistemas. Con Insights, la cartera, las ventas y el inventario se consultan en un mismo lugar, cada cifra se puede rastrear a su origen y las desviaciones llegan como alertas con una acción sugerida.',
    faqs: [
      { q: '¿Qué es Workers Insights?', a: 'Es el producto de inteligencia operativa de Workers: unifica los datos de tus sistemas, permite consultarlos en lenguaje natural con trazabilidad al origen y detecta cambios que requieren atención.' },
      { q: '¿En qué se diferencia de un tablero de BI tradicional?', a: 'Un tablero muestra lo que alguien decidió graficar. Insights responde preguntas nuevas en el momento, explica de dónde sale cada respuesta, vigila los datos por su cuenta y propone qué hacer.' },
      { q: '¿Necesito migrar mis datos?', a: 'No. Se conecta a los sistemas que ya usas y trabaja sobre sus datos vivos. Los agentes de Polar Blue Agent pueden usar la misma información.' },
    ],
    ctaHeading: '¿Quieres ver tu operación con datos que puedes verificar?',
  },
  {
    slug: 'workers-knowledge',
    name: 'Workers Knowledge',
    tagline: 'El sistema documental que da memoria a tu empresa y a tus agentes',
    core: true,
    seoTitle: 'Workers Knowledge | Sistema documental y base de conocimiento con IA | Workers',
    seoDescription:
      '¿Qué es Workers Knowledge? Workers Knowledge organiza los documentos y el conocimiento de tu empresa en una base con permisos, versiones y citas a la fuente, que alimenta a tus agentes de IA.',
    eyebrow: 'PRODUCTO · CONOCIMIENTO',
    titleTop: 'El sistema documental que da',
    titleBottom: 'memoria a tu empresa y a tus agentes',
    subtitle: 'Todo lo que tu empresa sabe, ordenado, vigente y con permisos, para que personas y agentes respondan con la misma verdad.',
    intro:
      '¿Qué es Workers Knowledge? Workers Knowledge reúne contratos, políticas, manuales, procesos y conversaciones en una base de conocimiento viva. Cada respuesta cita el documento del que sale, respeta quién puede verlo y se mantiene actualizada, y es la fuente de contexto de todos tus agentes.',
    beneficios: [
      { title: 'Una sola memoria para todos', desc: 'Personas y agentes consultan la misma información oficial, no versiones sueltas en carpetas y chats.' },
      { title: 'Respuestas con fuente', desc: 'Cada respuesta indica el documento y la sección de origen, para verificarla en segundos.' },
      { title: 'Control sobre quién ve qué', desc: 'Los permisos por rol y área se aplican también a lo que los agentes pueden consultar.' },
    ],
    capacidades: [
      { title: 'Ingesta de todo tu contenido', desc: 'Documentos, PDFs, hojas de cálculo, sitios web y contenido de tus sistemas entran a una sola base.' },
      { title: 'Contexto empresarial estructurado', desc: 'Organiza clientes, productos, procesos y políticas y las relaciones entre ellos, para que los agentes entiendan tu negocio.' },
      { title: 'Respuestas con cita a la fuente', desc: 'Búsqueda y preguntas en lenguaje natural con referencia al documento y la sección exactos.' },
      { title: 'Permisos por rol y área', desc: 'Define quién puede ver o usar cada documento, incluidos los agentes.' },
      { title: 'Versionado y vigencia', desc: 'Sabe cuál es la versión vigente de cada documento y evita respuestas basadas en información obsoleta.' },
      { title: 'Base compartida para tus agentes', desc: 'Polar Blue Agent, Conversso y tus demás agentes responden desde el mismo conocimiento verificado.' },
    ],
    casoTitle: 'Que cada respuesta salga del documento correcto',
    casoDesc:
      'Una empresa tenía políticas, contratos y manuales repartidos entre correos y carpetas, y cada persona respondía distinto. Con Knowledge, todo vive en una base con versiones vigentes y permisos, y tanto el equipo como los agentes responden con la misma información y la fuente a la vista.',
    faqs: [
      { q: '¿Qué es Workers Knowledge?', a: 'Es el sistema documental de Workers: una base de conocimiento empresarial con búsqueda en lenguaje natural, citas a la fuente, permisos, versiones y contexto estructurado que usan tus agentes de IA.' },
      { q: '¿Qué tipos de contenido puedo cargar?', a: 'Documentos, PDFs, hojas de cálculo, páginas web y contenido de tus sistemas. Se organiza por áreas, con vigencia y permisos.' },
      { q: '¿Cómo se relaciona con los agentes?', a: 'Es su memoria. Los agentes consultan Knowledge para responder y actuar, y lo hacen solo con lo que sus permisos les permiten ver.' },
    ],
    ctaHeading: '¿Quieres que tu empresa y tus agentes trabajen con la misma verdad?',
  },
  {
    slug: 'polar-torre-de-control',
    name: 'Polar Torre de Control',
    tagline: 'Apps internas y CRM modular: tus flujos y sistemas en un solo panel',
    core: true,
    url: 'https://zeroazul.com/torre-de-control/',
    seoTitle: 'Polar Torre de Control | CRM modular para pymes | Workers',
    seoDescription:
      '¿Qué es Polar Torre de Control? Polar Torre de Control unifica CRM, e-commerce, facturación, logística y atención al cliente en un panel, con integraciones a la medida y agentes IA.',
    eyebrow: 'PRODUCTO · APPS INTERNAS',
    titleTop: 'Interfaces operativas para cada flujo, en',
    titleBottom: 'un solo panel',
    subtitle: 'Colas, vistas de caso, formularios, aprobaciones y auditoría, junto al flujo y a la medida de tu equipo.',
    intro:
      '¿Qué es Polar Torre de Control? Polar Torre de Control reúne ventas, tiendas en línea, facturación, atención, logística e inventario sin obligarte a reemplazar tus herramientas: cada sistema sigue funcionando y la Torre los muestra y sincroniza en un único lugar. Sobre ella, los agentes de Polar Blue Agent automatizan procesos y consultan tus datos.',
    beneficios: [
      { title: 'Modular y a tu medida', desc: 'Empiezas con los módulos que necesitas (CRM, e-commerce, facturación, logística) y sumas otros cuando crezcas.' },
      { title: 'Integraciones con tu ecosistema', desc: 'Se conecta con pasarelas de pago, tiendas, ERPs y software contable habituales en Colombia.' },
      { title: 'Agentes IA sobre tus datos', desc: 'Los agentes consultan y actualizan la Torre para automatizar seguimiento, reportes y alertas.' },
    ],
    capacidades: [
      { title: 'Colas de trabajo', desc: 'Lo pendiente de cada persona y de cada agente, priorizado en un solo lugar.' },
      { title: 'Vista de caso con evidencia', desc: 'El cliente, los documentos, las conversaciones y el historial juntos, para decidir sin buscar.' },
      { title: 'Formularios y captura', desc: 'Interfaces a la medida de cada proceso para ingresar y corregir información.' },
      { title: 'Aprobaciones humanas', desc: 'Puntos de control donde una persona valida antes de que el proceso continúe.' },
      { title: 'Registro de auditoría', desc: 'Quién hizo qué y cuándo, en cada caso y en cada cambio.' },
      { title: 'Módulos e integraciones a la medida', desc: 'CRM, e-commerce, facturación y logística se activan según necesidad y se conectan a tus sistemas.' },
    ],
    casoTitle: 'Dejar de saltar entre cinco plataformas',
    casoDesc:
      'Un negocio con tienda, facturación y atención en herramientas distintas conciliaba manualmente cada semana. Con la Torre de Control, pedidos, pagos y conversaciones se ven en un solo panel y los reportes salen solos.',
    faqs: [
      { q: '¿Tengo que reemplazar mis sistemas actuales?', a: 'No. La Torre se conecta a los sistemas existentes y los hace visibles desde un solo lugar.' },
      { q: '¿Cómo se implementa?', a: 'En cuatro fases: diagnóstico, diseño, integración y operación, con módulos que se activan según tu necesidad.' },
      { q: '¿Se integra con agentes IA?', a: 'Sí. Es la base natural para Polar Blue Agent: los agentes trabajan sobre los mismos datos que ve tu equipo.' },
    ],
    ctaHeading: '¿Quieres ver todos tus sistemas en un solo panel?',
  },
  {
    slug: 'conversso',
    name: 'Conversso',
    tagline: 'Asistente IA de WhatsApp con la información de tu negocio',
    url: 'https://conversso.zeroazul.com/',
    seoTitle: 'Conversso | Asistente de IA para WhatsApp Business | Workers',
    seoDescription:
      '¿Qué es Conversso? Conversso es el asistente de IA para WhatsApp Business de Zero Azul: responde clientes con información real de tu negocio, 24/7, sin programar.',
    eyebrow: 'PRODUCTO · WHATSAPP',
    titleTop: 'Un asistente en WhatsApp que',
    titleBottom: 'conoce tu negocio',
    subtitle: 'Responde a tus clientes con datos reales, a cualquier hora, sin escribir una línea de código.',
    intro:
      '¿Qué es Conversso? Conversso aprende de tu web, tus documentos y tus preguntas frecuentes, y responde solo con esa información. Se integra con tiendas como Shopify y WooCommerce, ofrece bandeja compartida para tu equipo y un simulador para probar las respuestas antes de publicarlas.',
    beneficios: [
      { title: 'Respuestas basadas en tus datos', desc: 'Precios, envíos, horarios y políticas salen de tu propia información, no de suposiciones del modelo.' },
      { title: 'Listo en minutos', desc: 'Se configura desde un panel, sin programación, conectando tu cuenta de WhatsApp Business.' },
      { title: 'Humanos y agente juntos', desc: 'Bandeja compartida para que tu equipo tome el control de cualquier conversación cuando haga falta.' },
    ],
    casoTitle: 'Atender fuera de horario sin perder ventas',
    casoDesc:
      'Una tienda en línea recibía consultas de precios y envíos de noche y fines de semana que quedaban sin respuesta hasta el día siguiente. Con Conversso, esas preguntas se resuelven al instante y los pedidos se confirman sin intervención del equipo.',
    faqs: [
      { q: '¿Necesito saber programar?', a: 'No. Todo se configura desde un panel: cargas tu información, pruebas las respuestas en el simulador y lo activas.' },
      { q: '¿Puede integrarse con mi tienda?', a: 'Sí, cuenta con integración para Shopify y WooCommerce para consultar información de productos y pedidos.' },
      { q: '¿Qué pasa si el asistente no sabe algo?', a: 'Responde únicamente con la información que le diste y, cuando corresponde, deja la conversación en la bandeja compartida para que una persona la atienda.' },
    ],
    ctaHeading: '¿Quieres un asistente que atienda tu WhatsApp las 24 horas?',
  },
  {
    slug: 'ecco',
    name: 'Ecco',
    tagline: 'Contenido para redes sociales generado con IA',
    url: 'https://ecco.zeroazul.com/',
    seoTitle: 'Ecco | Crea contenido para redes sociales con IA | Workers',
    seoDescription:
      '¿Qué es Ecco? Ecco convierte una idea en posts, correos e historias con texto e imagen listos para publicar, con tu logo y colores de marca.',
    eyebrow: 'PRODUCTO · CONTENIDO',
    titleTop: 'De una idea a un post listo para',
    titleBottom: 'publicar',
    subtitle: 'Genera texto e imagen con tu identidad de marca, sin conocimientos de diseño.',
    intro:
      '¿Qué es Ecco? Ecco es la plataforma de contenido con IA de Zero Azul para negocios, emprendedores y agencias que publican con frecuencia. Escribes la idea; Ecco produce publicaciones, correos e historias con tu logo y tus colores, y tú decides si editar algo antes de publicar.',
    beneficios: [
      { title: 'Texto e imagen en un solo lugar', desc: 'Sin saltar entre herramientas: la pieza sale completa, con copy y visual coherentes.' },
      { title: 'Tu marca en cada pieza', desc: 'Logo y colores aplicados automáticamente para mantener una identidad consistente.' },
      { title: 'Control total antes de publicar', desc: 'Edita manualmente lo que quieras. La IA acelera, tú apruebas.' },
    ],
    casoTitle: 'Constancia en redes sin depender de un diseñador',
    casoDesc:
      'Un emprendimiento publicaba de forma irregular porque cada pieza tomaba horas. Con Ecco genera la semana completa en una sesión y mantiene una presencia constante sin ampliar el equipo.',
    faqs: [
      { q: '¿Qué tipos de contenido puedo crear?', a: 'Publicaciones para redes, correos e historias, con texto e imagen generados a partir de una idea.' },
      { q: '¿Puedo usar mi identidad de marca?', a: 'Sí. Puedes cargar tu logo y colores para que las piezas salgan alineadas con tu marca.' },
      { q: '¿Sirve para agencias?', a: 'Sí, existe un plan pensado para agencias con mayor volumen y varias marcas.' },
    ],
    ctaHeading: '¿Quieres publicar más, con menos esfuerzo?',
  },
  {
    slug: 'sintessis',
    name: 'Sintessis',
    tagline: 'Tableros de Google Analytics 4 generados con IA',
    url: 'https://sintessis.zeroazul.com/',
    seoTitle: 'Sintessis | Tableros de Google Analytics 4 con IA | Workers',
    seoDescription:
      '¿Qué es Sintessis? Sintessis conecta Google Analytics 4 y genera con IA tableros claros para tu negocio, con datos en vivo, alertas y reportes compartibles.',
    eyebrow: 'PRODUCTO · ANALÍTICA',
    titleTop: 'Google Analytics 4, explicado para',
    titleBottom: 'tu negocio',
    subtitle: 'Conecta tu cuenta y obtén un tablero con las métricas que realmente importan.',
    intro:
      '¿Qué es Sintessis? Sintessis se conecta a Google Analytics 4 con un clic y usa IA para armar métricas según el tipo de negocio (e-commerce, SaaS, agencia o contenido). Consulta datos en vivo, envía alertas ante cambios importantes y permite compartir o exportar el resultado.',
    beneficios: [
      { title: 'Sin armar dashboards a mano', desc: 'La IA propone las métricas relevantes según tu sector y las organiza en un tablero legible.' },
      { title: 'Datos en vivo', desc: 'Consulta directa a GA4: lo que ves es lo que está pasando, no un reporte desactualizado.' },
      { title: 'Alertas y reportes compartibles', desc: 'Recibe avisos por correo ante cambios significativos y comparte enlaces o PDF con tu equipo.' },
    ],
    casoTitle: 'Entender el rendimiento sin ser analista',
    casoDesc:
      'Una tienda en línea tenía Analytics instalado, pero nadie lo interpretaba. Con Sintessis, el equipo revisa un tablero simple y recibe alertas cuando las ventas o el tráfico se desvían.',
    faqs: [
      { q: '¿Necesito conocimientos técnicos?', a: 'No. Conectas tu cuenta de Google y la plataforma genera el tablero.' },
      { q: '¿Los datos están actualizados?', a: 'Sí, consulta GA4 directamente; la frecuencia de actualización depende del plan.' },
      { q: '¿Puedo compartir los reportes?', a: 'Sí, mediante enlaces públicos o exportación en PDF.' },
    ],
    ctaHeading: '¿Quieres entender tus métricas sin complicarte?',
  },
  {
    slug: 'vigilantte',
    name: 'Vigilantte',
    tagline: 'Monitoreo continuo de la seguridad de tu sitio web',
    url: 'https://vigilantte.zeroazul.com/',
    seoTitle: 'Vigilantte | Monitoreo de seguridad web automático | Workers',
    seoDescription:
      '¿Qué es Vigilantte? Vigilantte escanea tu sitio de forma continua: certificados, cabeceras de seguridad, malware, puertos expuestos y reputación del dominio, con plan de acción priorizado.',
    eyebrow: 'PRODUCTO · SEGURIDAD',
    titleTop: 'Un vigilante que nunca deja de',
    titleBottom: 'mirar tu sitio',
    subtitle: 'Escaneos automáticos de seguridad, reportados en lenguaje claro y con acciones priorizadas.',
    intro:
      '¿Qué es Vigilantte? Vigilantte revisa tu sitio sin instalar nada en tu servidor: certificados TLS/SSL, cabeceras HTTP de seguridad, malware y scripts inyectados, etiquetas de seguimiento fraudulentas, puertos expuestos, DNS y reputación del dominio. Te avisa solo de problemas nuevos o sin resolver.',
    beneficios: [
      { title: 'Sin instalación', desc: 'Verificas la propiedad del sitio con un script o registro DNS y empiezan los escaneos.' },
      { title: 'Alertas inteligentes', desc: 'Notifica lo nuevo o pendiente y permite ignorar falsos positivos para reducir ruido.' },
      { title: 'Plan de acción claro', desc: 'Reportes en lenguaje accesible con las correcciones ordenadas por prioridad.' },
    ],
    casoTitle: 'Detectar un problema antes de que lo note un cliente',
    casoDesc:
      'Un sitio comercial tenía un certificado por vencer y una etiqueta de seguimiento sospechosa. Vigilantte los detectó en el escaneo programado y el equipo los corrigió antes de que afectaran ventas o reputación.',
    faqs: [
      { q: '¿Qué analiza Vigilantte?', a: 'Certificados TLS/SSL, cabeceras de seguridad, malware y scripts inyectados, etiquetas de seguimiento fraudulentas, puertos expuestos, DNS y reputación del dominio.' },
      { q: '¿Funciona con WordPress o Shopify?', a: 'Sí, cuenta con integraciones para WordPress, Shopify y GitHub.' },
      { q: '¿Con qué frecuencia escanea?', a: 'Depende del plan: desde escaneos semanales hasta diarios o cada hora.' },
    ],
    ctaHeading: '¿Quieres que alguien vigile tu sitio por ti?',
  },
]

export const CORE_PRODUCTS = PRODUCTS.filter((p) => p.core)
export const ECOSYSTEM_PRODUCTS = PRODUCTS.filter((p) => !p.core)

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug)
