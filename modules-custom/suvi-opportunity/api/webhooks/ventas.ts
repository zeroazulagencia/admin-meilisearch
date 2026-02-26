/**
 * MÓDULO 6 - Webhook Ventas
 * Solo POST. Body JSON o form-urlencoded. Sin headers ni referer. Captura todo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createOpportunityRecord } from '@/utils/modulos/suvi-opportunity/module6-config';
import { processOpportunity } from '@/utils/modulos/suvi-opportunity/module6-orchestrator';

function getStr(obj: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v).trim();
  }
  return '';
}

/** Variante: form Salesforce Proyecto (fields[Campo][value]). */
function getFieldsValue(payload: Record<string, any>, fieldKey: string): string {
  const v = payload[`fields[${fieldKey}][value]`] ?? payload[`fields[${fieldKey}][raw_value]`];
  return v != null && v !== '' ? String(v).trim() : '';
}

function isFieldsVariant(payload: Record<string, any>): boolean {
  return Object.keys(payload).some((k) => k.startsWith('fields[') && k.endsWith('][value]'));
}

/** Variante por form[id] */
function getFormVariant(payload: Record<string, any>): string | null {
  const formId = payload['form[id]'] ?? payload['formId'] ?? '';
  const id = typeof formId === 'string' ? formId.trim() : '';
  if (id === 'b08bdc3') return 'Formulario proyecto';
  if (id === 'c197850') return 'Interes crédito';
  if (id === 'ecbe21e') return 'Landing Crédito';
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

function deriveFromPayload(payload: Record<string, any>) {
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
    indicativo = getStr(payload, 'indicativo') || null;
    ciudad = getStr(payload, 'ciudad', 'Ciudad', 'city') || null;
  }

  return {
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
}

async function getBodyPayload(req: NextRequest): Promise<Record<string, any>> {
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

export async function POST(req: NextRequest) {
  try {
    const payload = await getBodyPayload(req);
    const captured = deriveFromPayload(payload);
    console.log('[WEBHOOK-VENTAS] recibido', captured.payload_raw);
    const recordId = await createOpportunityRecord({
      email: captured.email,
      nombre: captured.nombre,
      apellido: captured.apellido,
      telefono: captured.telefono,
      tipo: 'ventas',
      payload_raw: captured.payload_raw,
      pais: captured.pais,
      indicativo: captured.indicativo,
      ciudad: captured.ciudad,
      nombre_proyecto: captured.nombre_proyecto,
      form_variant: captured.form_variant,
    });
    processOpportunity(recordId).catch((e) => console.error('[WEBHOOK-VENTAS]', e));
    return NextResponse.json({ ok: true, id: recordId, tipo: 'ventas' }, { status: 200 });
  } catch (e: any) {
    console.error('[WEBHOOK-VENTAS]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
