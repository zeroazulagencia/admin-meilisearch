/** Clasificador de tipos de consulta basado en el contenido del primer mensaje */

export const QUERY_TYPE_KEYWORDS: Record<string, string[]> = {
  'Ubicaciones': [
    'donde queda', 'ubicacion', 'ubicado', 'donde', 'lugar', 'localizado',
    'dirección', 'por donde', 'en que parte', 'parqueadero'
  ],
  'Horarios': [
    'horario', 'horas', 'abre', 'cierra', 'abierto', 'hasta que hora',
    'a qué hora', 'cuando abre'
  ],
  'Sorteos': [
    'sorteo', 'sorteos', 'sorte', 'premio', 'rifa', 'tiquete', 'registrar en'
  ],
  'Tiendas / Locales': [
    'tienda', 'locales', 'almacén', 'restaurante', 'local', 'hay reebok',
    'hay happy', 'locales', 'barberia'
  ],
  'Eventos / Actividades': [
    'evento', 'eventos', 'actividades', 'programacion', 'tributo',
    'programación', 'funciones', 'funcion', 'funcio'
  ],
  'Facturas / Registro': [
    'factura', 'registrar', 'registro', 'facturas'
  ],
  'Saludo': [
    'hola', 'buenos', 'buenas', 'dias', 'saludo'
  ],
  'Agradecimiento': [
    'gracias', 'vale', 'ok gracias', 'muchas gracias'
  ],
  'Información General': [
    'info', 'informacion', 'información', 'saber', 'preguntar'
  ],
};

export function classifyQueryType(message: string): string {
  const normalized = message.toLowerCase().trim();

  // Si el mensaje es muy corto (menos de 3 chars), clasificar como indefinido
  if (normalized.length < 3) {
    return 'General';
  }

  for (const [type, keywords] of Object.entries(QUERY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return type;
      }
    }
  }

  return 'General';
}

/** Detectar si una conversación fue exitosa (tuvo al menos un intercambio) */
export function isSuccessfulConversation(
  userMsgs: number,
  aiMsgs: number,
  lastMessage?: string,
): boolean {
  // Exitosa: al menos un mensaje del usuario y uno de la IA,
  // o la última interacción fue de la IA
  return userMsgs > 0 && aiMsgs > 0;
}