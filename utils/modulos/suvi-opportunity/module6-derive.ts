import { NextRequest } from 'next/server';

type AnyPayload = Record<string, any>;

function getStr(obj: AnyPayload, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v).trim();
  }
  return '';
}

function asString(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((item) => item != null && item !== '');
    return first != null ? asString(first) : '';
  }
  if (typeof value === 'object') {
    const obj = value as AnyPayload;
    if (obj.value != null) return asString(obj.value);
    if (obj.raw_value != null) return asString(obj.raw_value);
    if (Array.isArray(obj.values)) return asString(obj.values[0]);
  }
  return String(value).trim();
}

function getFieldsValue(payload: AnyPayload, fieldKey: string): string {
  const valueKey = `fields[${fieldKey}][value]`;
  const rawKey = `fields[${fieldKey}][raw_value]`;
  const extraKey = fieldKey.includes('[') ? fieldKey : `fields[${fieldKey}]`;
  const scopedFields = typeof payload.fields === 'object' && payload.fields !== null ? payload.fields : null;
  const scoped = scopedFields ? scopedFields[fieldKey] : undefined;
  const candidates = [payload[valueKey], payload[rawKey], payload[extraKey], scoped];
  for (const candidate of candidates) {
    const parsed = asString(candidate);
    if (parsed) return parsed;
  }
  if (scopedFields && scopedFields[fieldKey] != null && typeof scopedFields[fieldKey] === 'object') {
    const obj = scopedFields[fieldKey] as AnyPayload;
    const nested = obj?.meta ?? obj?.data;
    if (nested) {
      const parsed = asString(nested);
      if (parsed) return parsed;
    }
  }
  return '';
}

function isFieldsVariant(payload: AnyPayload): boolean {
  return Object.keys(payload).some(
    (k) => k.startsWith('fields[') && (k.endsWith('][value]') || k.endsWith('][raw_value]'))
  );
}

function getFormVariant(payload: AnyPayload): string | null {
  const formId = payload['form[id]'] ?? payload['formId'] ?? '';
  const id = typeof formId === 'string' ? formId.trim() : '';
  if (id === 'b08bdc3') return 'Formulario proyecto';
  if (id === 'c197850') return 'Interes crédito';
  if (id === 'ecbe21e') return 'Landing Crédito';
  if (id === 'a98c5f6') return 'Contacto web';
  return null;
}

const COUNTRY_PREFIX: Record<string, string> = {
  'colombia': 'Colombia(+57)',
  'estados unidos': 'Estados Unidos(+1)',
  'usa': 'Estados Unidos(+1)',
  'mexico': 'Mexico(+52)',
  'méxico': 'Mexico(+52)',
  'españa': 'España(+34)',
  'chile': 'Chile(+56)',
  'peru': 'Peru(+51)',
  'perú': 'Peru(+51)',
  'argentina': 'Argentina(+54)',
  'ecuador': 'Ecuador(+593)',
  'panama': 'Panamá(+507)',
  'panamá': 'Panamá(+507)',
  'venezuela': 'Venezuela(+58)',
  'brasil': 'Brasil(+55)',
  'canada': 'Canadá(+1)',
  'canadá': 'Canadá(+1)',
};

function normalizePais(raw: string): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  return COUNTRY_PREFIX[lower] || raw;
}

function cleanIndicativo(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  return digits || null;
}

function indicativoFromPais(paisValue: string | null): string | null {
  if (!paisValue) return null;
  const match = paisValue.match(/\(\+(\d+)\)/);
  if (match) return match[1];
  return cleanIndicativo(paisValue);
}

function indicativoFromPhone(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const match = trimmed.match(/^\+(\d{1,4})/);
  return match ? match[1] : null;
}

function splitFullName(fullName: string) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { first: '-', last: '-' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '-' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export interface DerivedPayload {
  payload_raw: AnyPayload;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  pais: string | null;
  indicativo: string | null;
  ciudad: string | null;
  nombre_proyecto: string | null;
  form_variant: string | null;
}

export function deriveFromPayload(payload: AnyPayload): DerivedPayload {
  let nombre = '-';
  let apellido = '-';
  let email = 'sin-email@captura.local';
  let telefono = '-';
  let pais: string | null = null;
  let indicativo: string | null = null;
  let ciudad: string | null = null;
  let nombre_proyecto: string | null = null;

  const variant = getFormVariant(payload);

  if (variant === 'Landing Crédito') {
    nombre = getFieldsValue(payload, 'name') || '-';
    apellido = getFieldsValue(payload, 'field_78cc91b') || '-';
    email = getFieldsValue(payload, 'email').toLowerCase() || 'sin-email@captura.local';
    telefono = getFieldsValue(payload, 'message') || '-';
    pais = normalizePais(getFieldsValue(payload, 'field_a27c238')) || null;
  } else if (variant === 'Contacto web') {
    const fieldsWithinPayload = typeof payload.fields === 'object' && payload.fields !== null ? payload.fields : null;
    const embeddedName = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).name : null;
    const embeddedEmail = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).email : null;
    const embeddedTel = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).tel : null;
    const embeddedCountry = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).country : null;
    const embeddedCity = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).city : null;
    const embeddedIndicativo = fieldsWithinPayload ? (fieldsWithinPayload as AnyPayload).indicativo : null;
    const fullName = getFieldsValue(payload, 'name') || asString(embeddedName) || '-';
    const split = splitFullName(fullName);
    nombre = split.first || '-';
    apellido = split.last || '-';
    const emailField = getFieldsValue(payload, 'email') || asString(embeddedEmail);
    email = (emailField || getStr(payload, 'email', 'Correo electrónico', 'correo')).toLowerCase() || 'sin-email@captura.local';
    const telField = getFieldsValue(payload, 'tel') || asString(embeddedTel);
    const fallbackTel = getStr(payload, 'telefono', 'Telefono', 'Teléfono', 'fields[tel][value]');
    telefono = telField || fallbackTel || '-';
    const paisRaw = getFieldsValue(payload, 'country') || asString(embeddedCountry) || getStr(payload, 'pais', 'Pais', 'País');
    pais = 'Estados Unidos (+1)';
    ciudad = getFieldsValue(payload, 'city') || asString(embeddedCity) || null;
    nombre_proyecto = null;
    const indicativoField = cleanIndicativo(getFieldsValue(payload, 'indicativo') || asString(embeddedIndicativo) || null);
    const indicativoPais = indicativoFromPais(pais);
    const indicativoPhone = indicativoFromPhone(telefono);
    indicativo = '1';
  } else if (isFieldsVariant(payload)) {
    nombre = getFieldsValue(payload, 'FirstName') || '-';
    apellido = getFieldsValue(payload, 'LastName') || '-';
    email = getFieldsValue(payload, 'Email').toLowerCase() || 'sin-email@captura.local';
    telefono = getFieldsValue(payload, 'MobilePhone') || '-';
    pais = getFieldsValue(payload, 'Pais_de_Residencia__c') || null;
    ciudad = getFieldsValue(payload, 'Ciudad_de_Residencia__c') || null;
    nombre_proyecto = getFieldsValue(payload, 'Proyecto') || null;
  } else {
    email = getStr(payload, 'email', 'Correo electrónico', 'correo', 'Email').toLowerCase() || 'sin-email@captura.local';
    nombre = getStr(payload, 'nombre', 'Nombre', 'name') || '-';
    apellido = getStr(payload, 'apellido', 'Apellido', 'lastname') || '-';
    telefono = getStr(payload, 'telefono', 'Teléfono', 'Celular', 'phone', 'Phone') || '-';
    nombre_proyecto = getStr(payload, 'proyecto', 'nombre_proyecto', 'ID_proyecto', 'proyecto_nombre') || null;
    pais = getStr(payload, 'pais', 'País', 'country') || null;
    indicativo = cleanIndicativo(getStr(payload, 'indicativo'));
    ciudad = getStr(payload, 'ciudad', 'Ciudad', 'city') || null;
  }

  if (!indicativo) {
    const indicativoPais = indicativoFromPais(pais);
    const indicativoPhone = indicativoFromPhone(telefono);
    indicativo = indicativoPais || indicativoPhone || '1';
  }

  const resolved: DerivedPayload = {
    payload_raw: payload,
    nombre,
    apellido,
    email,
    telefono,
    pais: pais || null,
    indicativo: indicativo || null,
    ciudad: ciudad || null,
    nombre_proyecto: nombre_proyecto || null,
    form_variant: variant || null,
  };

  if (resolved.form_variant === 'Contacto web') {
    if (!resolved.nombre || resolved.nombre === '-') {
      resolved.nombre = '-';
    }
    if (!resolved.apellido || resolved.apellido === '-') {
      resolved.apellido = '-';
    }
  }

  return resolved;
}

export async function getBodyPayload(req: NextRequest): Promise<Record<string, any>> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  }
  const text = await req.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    const params = new URLSearchParams(text);
    const payload: Record<string, string | string[]> = {};
    Array.from(params.keys()).forEach((k) => {
      const all = params.getAll(k);
      payload[k] = all.length > 1 ? all : all[0] ?? '';
    });
    return payload;
  }
}
