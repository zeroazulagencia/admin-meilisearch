/** Landings de agentes existentes (subproductos de Polar Blue Agent). Fuente única para menú, footer y home. */
export const AGENTS = [
  { href: '/agente-ia-ventas', label: 'Agente IA de Ventas', category: 'VENTAS', desc: 'Califica leads, hace seguimiento y acerca cada oportunidad al cierre.' },
  { href: '/agente-ia-whatsapp', label: 'Agente IA de WhatsApp', category: 'ATENCION', desc: 'Atiende clientes por WhatsApp 24/7 con información real de tu negocio.' },
  { href: '/agentes-ia-atencion-cliente', label: 'Atención al Cliente', category: 'ATENCION', desc: 'Varios agentes atienden, escalan casos complejos y hacen posventa.' },
  { href: '/agente-ia-finanzas', label: 'Agente IA de Finanzas', category: 'FINANZAS', desc: 'Concilia pagos, genera reportes y alerta sobre anomalías financieras.' },
  { href: '/agente-ia-cobros', label: 'Agente IA de Cobros', category: 'FINANZAS', desc: 'Gestiona cartera, recordatorios y acuerdos de pago sin fricción.' },
  { href: '/agente-ia-inventarios', label: 'Agente IA de Inventarios', category: 'INVENTARIOS', desc: 'Vigila stock, alerta mínimos y coordina compras y proveedores.' },
  { href: '/agente-ia-rrhh', label: 'Agente IA de Recursos Humanos', category: 'RRHH', desc: 'Preselecciona candidatos, coordina entrevistas y automatiza onboarding.' },
  { href: '/agente-ia-analitica', label: 'Agente IA de Analítica', category: 'DATOS', desc: 'Consolida datos, detecta anomalías y entrega reportes accionables.' },
  { href: '/agente-ia-para-servicios', label: 'Agente IA para Servicios', category: 'OPERACION', desc: 'Órdenes, agendas y seguimiento de servicios sin trabajo manual.' },
  { href: '/ia-integrada-crm-erp', label: 'IA integrada a CRM y ERP', category: 'OPERACION', desc: 'Agentes que leen y escriben directamente en tu CRM o ERP.' },
] as const
