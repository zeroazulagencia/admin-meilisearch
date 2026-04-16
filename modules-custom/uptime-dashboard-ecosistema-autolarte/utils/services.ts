import type { ServiceSection } from './types';

export const SERVICE_SECTIONS: ServiceSection[] = [
  {
    title: 'Sincronizador CRM + Usados (y retoque foto)',
    services: [
      {
        name: 'Zero Azul Automation',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com',
        route: 'https://automation.zeroazul.com',
        description: 'Plataforma que orquesta el flujo de sincronizacion cada 6h.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 301, 302, 401, 403]
      },
      {
        name: 'Zero Azul Automation Workflow AUTOLARTE SYNC USADOS',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com/api/v1/workflows/NDDll4OQV5TWDcZt',
        route: 'https://automation.zeroazul.com/workflow/NDDll4OQV5TWDcZt',
        description: 'Workflow que sincroniza CRM con web. Verifica que este activo.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        headers: {},
        accept_codes: [200, 401, 403, 404],
        fetch_executions: true,
        workflow_id: 'NDDll4OQV5TWDcZt',
        executions_base_url: 'https://automation.zeroazul.com',
        n8n_auth: 'apikey'
      },
      {
        name: 'Actualizar Usados (cronjob)',
        type: 'http',
        endpoint: 'https://autolarte.com.co/dev/cronjobs/actualizar-usados.php',
        route: 'https://autolarte.com.co/dev/cronjobs/actualizar-usados',
        description: 'Obtiene inventario CRM, crea/actualiza/elimina en WordPress, retoca fotos con Replicate (Bria).',
        timeout: 30,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 301, 302, 403]
      },
      {
        name: 'CRM Inventario',
        type: 'http',
        endpoint: 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json',
        route: 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json',
        description: 'Inventario del CRM. Zero Azul Automation obtiene datos para comparar.',
        timeout: 15,
        enabled: true,
        method: 'GET'
      },
      {
        name: 'WordPress API Vehiculos',
        type: 'http',
        endpoint: 'https://autolarte.com.co/wp-json/jet-cct/cct_vehiculos_usados',
        route: 'https://autolarte.com.co/wp-json/jet-cct/cct_vehiculos_usados',
        description: 'Vehiculos publicados en web. Zero Azul Automation compara con CRM.',
        timeout: 15,
        enabled: true,
        method: 'GET'
      },
      {
        name: 'Workers Zero Azul',
        type: 'http',
        endpoint: 'https://server-search.zeroazul.com/indexes/bd_reports_dworkers/documents',
        route: 'https://server-search.zeroazul.com/indexes/bd_reports_dworkers/documents',
        description: 'Zero Azul Automation envia reporte HTML por Gmail y a Workers Zero Azul.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 401, 403, 404, 405]
      },
      {
        name: 'Modelo de Ajuste de Fondos',
        type: 'http',
        endpoint: 'https://api.replicate.com/v1/models/bria/generate-background',
        route: 'https://api.replicate.com/v1/models/bria/generate-background',
        description: 'Retoque foto: genera fondos con IA.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 401, 404]
      },
      {
        name: 'Modelo de Ajuste de Placas',
        type: 'http',
        endpoint: 'https://cars-image-background-removal.p.rapidapi.com/v1/results',
        route: 'https://cars-image-background-removal.p.rapidapi.com/v1/results',
        description: 'Retoque foto: elimina fondo y difumina placas.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 401, 403, 404, 405]
      }
    ]
  },
  {
    title: 'Agente Lucas',
    services: [
      {
        name: 'Agente Lucas Chat',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com/webhook/0577e752-f260-4ee6-a5d0-dae33dde47a0/chat',
        route: 'https://automation.zeroazul.com/webhook/0577e752-f260-4ee6-a5d0-dae33dde47a0/chat',
        description: 'Verifica que el chat del agente responda correctamente.',
        timeout: 30,
        enabled: true,
        method: 'POST',
        test_chat: true,
        chat_message: 'Como estas?'
      },
      {
        name: 'Agente Lucas',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com/api/v1/workflows/61DSxtMYOoeUn3Zn',
        route: 'https://automation.zeroazul.com/workflow/61DSxtMYOoeUn3Zn',
        description: 'Workflow del agente Lucas.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        headers: {},
        accept_codes: [200, 401, 403, 404]
      },
      {
        name: 'Carta Laboral',
        type: 'http',
        endpoint: 'https://workers.zeroazul.com/api/custom-module3/generador-carta-laboral/generar',
        route: 'https://workers.zeroazul.com/api/custom-module3/generador-carta-laboral/generar',
        description: 'Requiere: 1) Workflow activo, 2) Sigha token 200, 3) generador carta laboral (workers). Los 3 OK = en linea.',
        timeout: 30,
        enabled: true,
        test_carta_laboral: true,
        carta_nit: '1095796088'
      },
      {
        name: 'Conocimiento general',
        type: 'http',
        endpoint: 'https://server-search.zeroazul.com/indexes/guia_conocimiento_autolarte_lucas/search',
        route: 'https://server-search.zeroazul.com/indexes/guia_conocimiento_autolarte_lucas/search',
        description: 'Informacion general sobre Autolarte, marcas, grupo y Lucas. POST con q, limit, hybrid.',
        timeout: 15,
        enabled: true,
        test_conocimiento_general: true
      },
      {
        name: 'Conocimiento marcas',
        type: 'http',
        endpoint: 'https://hyundai.moevo.co/',
        route: 'Conocimiento marcas (5 URLs)',
        description: 'Verifica status 200: hyundai.moevo.co, repuestera.com.co, moevo.co, byd.moevo.co, solochevrolet.co',
        timeout: 20,
        enabled: true,
        test_conocimiento_marcas: true,
        conocimiento_marcas_urls: [
          'https://hyundai.moevo.co/',
          'https://repuestera.com.co/',
          'https://moevo.co/',
          'https://byd.moevo.co/',
          'https://www.solochevrolet.co/'
        ]
      },
      {
        name: 'Conocimiento Intranet URL',
        type: 'http',
        endpoint: 'https://intranet.autolarte.com.co/wp-json/wp/v2/search',
        route: 'https://intranet.autolarte.com.co/wp-json/wp/v2/search?search=TERMINO',
        description: 'Conocimiento intranet. Requiere: 1) Workflow activo, 2) API busqueda. Ambas OK = en linea.',
        timeout: 15,
        enabled: true,
        method: 'GET',
        test_conocimiento_intranet: true,
        headers: { 'Authorization': 'Basic emVyb2F6dWw6SzkjbVA3JHZMMkBuUTUheFI4' }
      },
      {
        name: 'Buscador de cumpleanos',
        type: 'http',
        endpoint: 'https://tarjetav.co/api/birthday',
        route: 'https://tarjetav.co/api/birthday',
        description: 'Requiere: 1) Workflow activo, 2) GET birthday/{mes}. Ambas OK = en linea.',
        timeout: 15,
        enabled: true,
        test_birthday_search: true
      },
      {
        name: 'Datos Usuarios',
        type: 'http',
        endpoint: 'https://tarjetav.co/api/vcards/search',
        route: 'https://tarjetav.co/api/vcards/search',
        description: 'Buscador de datos de usuarios. POST con nombre, Authorization Basic.',
        timeout: 15,
        enabled: true,
        test_datos_usuarios: true
      }
    ]
  },
  {
    title: 'Flujo VCARD (Actualizacion)',
    services: [
      {
        name: 'Sistema de VCARDs Autolarte',
        type: 'http',
        endpoint: 'https://tarjetav.co/v/autolarte',
        route: 'https://tarjetav.co/v/autolarte',
        description: 'Sistema general de VCARDs de Autolarte.',
        timeout: 10,
        enabled: true,
        method: 'HEAD'
      },
      {
        name: 'Formulario solicitud VCARD',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com/form-test/16a250f0-603d-4c9c-9c4f-c0167d061d7a',
        route: 'https://automation.zeroazul.com/form-test/16a250f0-603d-4c9c-9c4f-c0167d061d7a',
        description: 'Formulario de solicitud de VCARD.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 301, 302, 401, 403, 404]
      },
      {
        name: 'Flujo que envia el Mail recordatorio vcard',
        type: 'http',
        endpoint: 'https://automation.zeroazul.com/api/v1/workflows/x3vWL2ZTZ4rXZPkR',
        route: 'https://automation.zeroazul.com/workflow/x3vWL2ZTZ4rXZPkR',
        description: 'Cron semanal: obtiene VCARDs pendientes, filtra por email y envia recordatorio con link tarjetav.co/autolarte/complete-vcard/{id}.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        headers: {},
        accept_codes: [200, 401, 403, 404],
        fetch_executions: true,
        workflow_id: 'x3vWL2ZTZ4rXZPkR',
        executions_base_url: 'https://automation.zeroazul.com',
        n8n_auth: 'apikey'
      },
      {
        name: 'Formulario de actualizacion de vcards',
        type: 'http',
        endpoint: 'https://tarjetav.co/autolarte/complete-vcard/',
        route: 'https://tarjetav.co/autolarte/complete-vcard/',
        description: 'Formulario tarjetav.co/autolarte/complete-vcard/{id}. Empleados actualizan foto y datos. Se envia a tarjetav.co y se notifica por Outlook.',
        timeout: 15,
        enabled: true,
        test_formulario_vcard: true
      },
      {
        name: 'Conexion para envio del mail recordatorio',
        type: 'outlook',
        endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        route: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        description: 'Conexion OAuth para envio del mail recordatorio VCARD.',
        timeout: 15,
        enabled: true
      },
      {
        name: 'Buscador de Vcard para diversos flujos',
        type: 'http',
        endpoint: 'https://tarjetav.co/api/vcards/search',
        route: 'https://tarjetav.co/api/vcards/search',
        description: 'POST busca empleado por nombre. Usa nombre de vcard aleatoria.',
        timeout: 15,
        enabled: true,
        test_vcards_search: true
      },
      {
        name: 'Lista VCARDs pendientes de actualizar',
        type: 'http',
        endpoint: 'https://tarjetav.co/api/automation',
        route: 'https://tarjetav.co/api/automation',
        description: 'Lista VCARDs pendientes de actualizar. El flujo de mail recordatorio las obtiene y envia el link complete-vcard/{id}.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 401, 403, 404, 405]
      }
    ]
  },
  {
    title: 'Web y Seguridad Autolarte',
    services: [
      {
        name: 'Autolarte',
        type: 'http',
        endpoint: 'https://autolarte.com.co/',
        route: 'https://autolarte.com.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      },
      {
        name: 'Hyundai',
        type: 'http',
        endpoint: 'https://hyundai.moevo.co/',
        route: 'https://hyundai.moevo.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      },
      {
        name: 'Repuestera',
        type: 'http',
        endpoint: 'https://repuestera.com.co/',
        route: 'https://repuestera.com.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      },
      {
        name: 'Moevo',
        type: 'http',
        endpoint: 'https://moevo.co/',
        route: 'https://moevo.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      },
      {
        name: 'BYD',
        type: 'http',
        endpoint: 'https://byd.moevo.co/',
        route: 'https://byd.moevo.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      },
      {
        name: 'Solochevrolet',
        type: 'http',
        endpoint: 'https://www.solochevrolet.co/',
        route: 'https://www.solochevrolet.co/',
        description: 'Web: GET 200. Redireccion: 5 llamadas, ninguna 3xx.',
        timeout: 10,
        enabled: true,
        test_web_seguridad: true
      }
    ]
  },
  {
    title: 'Sistema de Pago Autolarte',
    services: [
      {
        name: 'Api Cartera Autolarte',
        type: 'http',
        endpoint: 'http://181.49.158.60:8032/WebApiCartera/api/login/Autenticacion',
        route: 'http://181.49.158.60:8032/WebApiCartera/api/login/Autenticacion',
        description: 'Obtiene token de autenticacion para consultar cartera.',
        timeout: 10,
        enabled: true,
        method: 'POST',
        accept_codes: [200, 400, 401]
      },
      {
        name: 'Conector Zero Azul + Autolarte',
        type: 'http',
        endpoint: 'https://autolarte.com.co/dev/endpoints/cargar_facturas.php?cc=15446348',
        route: 'https://autolarte.com.co/dev/endpoints/cargar_facturas.php?cc=15446348',
        description: 'Carga de facturas por cedula. Puente entre Autolarte y Zero Azul.',
        timeout: 15,
        enabled: true,
        method: 'GET'
      },
      {
        name: 'Wompi API',
        type: 'http',
        endpoint: 'https://production.wompi.co/v1',
        route: 'https://production.wompi.co/v1',
        description: 'Crea link de pago y redirige al checkout.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_codes: [200, 401, 404]
      },
      {
        name: 'Servicio Wompi autolarte',
        type: 'http',
        endpoint: 'https://autolarte.com.co/dev/wompi-event-handler.php',
        route: 'https://autolarte.com.co/dev/wompi-event-handler.php',
        description: 'Recibe webhook de pago, aplica en Zero Azul y confirma reserva.',
        timeout: 10,
        enabled: true,
        method: 'GET',
        accept_400: true
      }
    ]
  },
  {
    title: 'Sistema de Pedidos y Usuarios Repuestera',
    services: [
      {
        name: 'Sistema de Pedidos y Usuarios Repuestera',
        type: 'http',
        endpoint: 'http://localhost/repuestera/pedidos',
        route: '/repuestera/pedidos',
        description: 'Verifica que el sistema de pedidos y usuarios de Repuestera este disponible.',
        timeout: 5,
        enabled: true,
        en_desarrollo: true
      }
    ]
  },
  {
    title: 'Agente Repuestos',
    services: [
      {
        name: 'Agente Repuestos',
        type: 'http',
        endpoint: 'http://localhost/agente-repuestos',
        route: '/agente-repuestos',
        description: 'Verifica que el agente de repuestos este disponible.',
        timeout: 5,
        enabled: true,
        en_desarrollo: true
      }
    ]
  }
];
