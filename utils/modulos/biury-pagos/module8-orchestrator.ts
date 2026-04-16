import {
  createLog as createDbLog,
  getConfig,
  updateLogById,
  matchProductRule,
} from './module8-config';

interface SiigoAuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
}

interface SiigoVoucherResponse {
  id?: number;
  number?: string;
  error?: string;
  message?: string;
  status?: number;
  contentType?: string | null;
  data?: any;
  body?: string;
}

async function getSiigoToken(): Promise<{ token: string | null; error?: string; response?: any }> {
  const siigoUsername = await getConfig('siigo_username');
  const siigoAccessKey = await getConfig('siigo_access_key');

  if (!siigoUsername || !siigoAccessKey) {
    return { token: null, error: 'Credenciales de Siigo no configuradas' };
  }

  try {
    const response = await fetch('https://api.siigo.com/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Partner-Id': 'biury',
        'User-Agent': 'Dworkers-Biury/1.0',
      },
      body: JSON.stringify({
        username: siigoUsername,
        access_key: siigoAccessKey,
      }),
    });

    const contentType = response.headers.get('content-type');
    let data: SiigoAuthResponse = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error: any) {
        return { token: null, error: error.message || 'Respuesta inválida de Siigo' };
      }
    } else {
      const textResponse = await response.text();
      if (!response.ok) {
        return {
          token: null,
          error: response.status === 401 || response.status === 403
            ? `Autenticacion Siigo rechazada (HTTP ${response.status})`
            : `Error Siigo auth (HTTP ${response.status})`,
          response: { status: response.status, contentType, body: textResponse },
        };
      }
      return { token: null, error: 'Respuesta inválida de Siigo' };
    }

    if (!response.ok || data.error) {
      if (response.status === 401 || response.status === 403) {
        return {
          token: null,
          error: `Autenticacion Siigo rechazada (HTTP ${response.status})`,
          response: { status: response.status, contentType, data },
        };
      }
      return {
        token: null,
        error: data.error || `Error Siigo auth (HTTP ${response.status})`,
        response: { status: response.status, contentType, data },
      };
    }

    return { token: data.access_token || null };
  } catch (error: any) {
    return { token: null, error: error.message };
  }
}

function getSiigoConsecutive(paymentId: string): number {
  const digits = String(paymentId || '').replace(/\D/g, '');
  if (digits.length) {
    return parseInt(digits.slice(-9), 10);
  }

  let hash = 0;
  for (const char of String(paymentId || '')) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000000000;
  }
  return hash || 1;
}

async function createSiigoVoucher(
  paymentData: any,
  siigoToken: string,
  rawData: any,
  matchedRule: NonNullable<Awaited<ReturnType<typeof matchProductRule>>>
): Promise<{ success: boolean; response: SiigoVoucherResponse; error?: string }> {
  const gatewayRaw = paymentData.payment_gateway_name || '';
  const gateway = gatewayRaw.toLowerCase();
  const debitAccount = matchedRule.account_code;
  const totalFormatted = Number(paymentData.totals.total).toFixed(2);
  const paymentId = paymentData.payment_id;
  const consecutive = getSiigoConsecutive(paymentId);

  const body = {
    document: { id: 8923 },
    date: new Date().toISOString().split('T')[0],
    type: 'Detailed',
    customer: {
      identification: paymentData.billing.document,
    },
    items: [
      {
        account: {
          code: debitAccount,
          movement: 'Debit',
        },
        description: matchedRule.description || matchedRule.gateway_matcher || gatewayRaw || 'Gateway',
        value: totalFormatted,
      },
      {
        account: {
          code: '28050501',
          movement: 'Credit',
        },
        description: 'Anticipos Clientes',
        value: totalFormatted,
        due: {
          prefix: 'CC',
          consecutive,
          quote: 1,
          date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
    ],
    observations: `Treli Payment ID: ${paymentId}`,
  };

  const maxAttempts = 5;
  let lastResponse: any = {};
  let customerCreated = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await waitForSiigoSlot();
      const response = await fetch('https://api.siigo.com/v1/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${siigoToken}`,
          'Partner-Id': 'biury',
          'User-Agent': 'Dworkers-Biury/1.0',
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type');
      let responseData: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const jsonData = await response.json();
          responseData = { status: response.status, contentType, data: jsonData, request: body };
        } catch (error: any) {
          responseData = { status: response.status, contentType, error: error.message || 'Respuesta inválida de Siigo', request: body };
        }
      } else {
        const textResponse = await response.text();
        responseData = { status: response.status, contentType, body: textResponse, request: body };
      }

      lastResponse = responseData;

      if (response.status === 429 && attempt < maxAttempts) {
        const baseWait = parseRetrySeconds(responseData) || 4;
        const waitSeconds = baseWait + (attempt - 1) * 5;
        await sleep(waitSeconds * 1000);
        continue;
      }

      if (!response.ok) {
        if (isInvalidCustomer(responseData) && !customerCreated) {
          const customerPayload = buildCustomerPayload(paymentData, rawData);
          const customerResult = await createSiigoCustomer(customerPayload, siigoToken);
          responseData = {
            ...responseData,
            customer_create: customerResult.response || { error: customerResult.error || 'Error al crear cliente' },
          };
          lastResponse = responseData;
          if (customerResult.success) {
            customerCreated = true;
            continue;
          }
        }
        const authError = response.status === 401 || response.status === 403
          ? `Autenticacion Siigo rechazada (HTTP ${response.status})`
          : `Error Siigo (HTTP ${response.status})`;
        return {
          success: false,
          response: responseData,
          error: responseData?.data?.message || responseData?.data?.error || authError,
        };
      }

      return {
        success: true,
        response: responseData,
      };
    } catch (error: any) {
      if (attempt >= maxAttempts) {
        return {
          success: false,
          response: lastResponse || {},
          error: error.message || 'Error desconocido',
        };
      }
      await sleep(2000);
    }
  }

  return {
    success: false,
    response: lastResponse || {},
    error: 'Error desconocido',
  };
}

export async function processTreliWebhook(payload: { content: any; logId?: number | null }): Promise<{
  ok: boolean;
  status: 'success' | 'error' | 'filtered';
  logId?: number;
  error?: string;
}> {
  const data = payload.content;
  const normalized = normalizePaymentData(data);
  const payloadRaw = JSON.stringify(payload?.content ?? payload ?? {});

  if (!normalized || !normalized.items || !normalized.items.length) {
    const logId = await saveLog(payload.logId, {
      payment_id: normalized?.payment_id || 'unknown',
      customer_document: normalized?.billing?.document || 'unknown',
      product_name: normalized?.items?.[0]?.name || 'unknown',
      gateway: normalized?.payment_gateway_name || 'unknown',
      total: Number(normalized?.totals?.total) || 0,
      payload_raw: payloadRaw,
      siigo_response: JSON.stringify({ error: 'Payload inválido: sin items' }),
      status: 'error',
    });
    return { ok: true, status: 'error', logId, error: 'Payload inválido: sin items' };
  }

  const primaryItem = normalized.items[0];
  const productName = primaryItem?.name || 'unknown';
  const matchedRule = await matchProductRule(productName, normalized.payment_gateway_name);

  if (!matchedRule) {
    await saveLog(payload.logId, {
      payment_id: normalized.payment_id || 'unknown',
      customer_document: normalized.billing?.document || 'unknown',
      product_name: productName,
      gateway: normalized.payment_gateway_name || 'unknown',
      total: Number(normalized.totals?.total) || 0,
      payload_raw: payloadRaw,
      siigo_response: JSON.stringify({ status: 'filtered', reason: 'Sin regla de producto' }),
      status: 'filtered',
    });
    return { ok: true, status: 'filtered' };
  }

  const authResult = await getSiigoToken();
  if (!authResult.token) {
    const logId = await saveLog(payload.logId, {
      payment_id: normalized.payment_id || 'unknown',
      customer_document: normalized.billing?.document || 'unknown',
      product_name: productName,
      gateway: normalized.payment_gateway_name || 'unknown',
      total: Number(normalized.totals?.total) || 0,
      payload_raw: payloadRaw,
      siigo_response: JSON.stringify(
        authResult.response || { error: authResult.error || 'Error al obtener token de Siigo' }
      ),
      status: 'error',
    });
    return { ok: true, status: 'error', logId, error: authResult.error || 'Error al obtener token de Siigo' };
  }

  const siigoResult = await createSiigoVoucher(normalized, authResult.token, data, matchedRule);

  const logId = await saveLog(payload.logId, {
    payment_id: normalized.payment_id || 'unknown',
    customer_document: normalized.billing?.document || 'unknown',
    product_name: productName,
    gateway: normalized.payment_gateway_name || 'unknown',
    total: Number(normalized.totals?.total) || 0,
    payload_raw: payloadRaw,
    siigo_response: JSON.stringify(siigoResult.response),
    status: siigoResult.success ? 'success' : 'error',
  });

  if (!siigoResult.success) {
    return {
      ok: true,
      status: 'error',
      logId,
      error: siigoResult.error || 'Error al crear voucher en Siigo',
    };
  }

  return { ok: true, status: 'success', logId };
}

function normalizePaymentData(data: any): {
  payment_id: string;
  billing: { document: string; name?: string; email?: string; phone?: string; address?: string };
  totals: { total: number | string };
  payment_gateway_name: string;
  items: Array<{ name: string }>;
} {
  if (!data) return data;

  const source = data?.data ?? data;

  const payment_id = source.payment_id || source.id || source.transaction?.id || 'unknown';
  const billingDocument =
    source.billing?.document ||
    source.transaction?.transaction_billing?.identification ||
    source.transaction?.billing?.document ||
    'unknown';

  const billingName =
    source.billing?.name ||
    [source.billing?.first_name, source.billing?.last_name].filter(Boolean).join(' ') ||
    source.transaction?.transaction_billing?.name ||
    source.transaction?.billing?.name ||
    source.customer?.name ||
    undefined;

  const billingEmail =
    source.billing?.email ||
    source.transaction?.transaction_billing?.email ||
    source.transaction?.billing?.email ||
    source.customer?.email ||
    undefined;

  const billingPhone =
    source.billing?.phone ||
    source.billing?.phone_number ||
    source.transaction?.transaction_billing?.phone ||
    source.transaction?.billing?.phone ||
    source.customer?.phone ||
    undefined;

  const billingAddress =
    source.billing?.address ||
    source.billing?.address_1 ||
    source.transaction?.transaction_billing?.address ||
    source.transaction?.billing?.address ||
    source.customer?.address ||
    undefined;

  const total =
    source.totals?.total ??
    source.total ??
    source.transaction?.amount ??
    source.items?.[0]?.total ??
    0;

  const gateway =
    source.payment_gateway_name ||
    source.payment_method_gateway ||
    source.transaction?.payment_method_gateway ||
    'unknown';

  return {
    payment_id,
    billing: {
      document: billingDocument,
      name: billingName,
      email: billingEmail,
      phone: billingPhone,
      address: billingAddress,
    },
    totals: { total },
    payment_gateway_name: gateway,
    items: source.items || [],
  };
}

function parseRetrySeconds(responseData: any): number | null {
  const message = responseData?.data?.Errors?.[0]?.Message || responseData?.data?.message || '';
  const match = String(message).match(/(\d+)\s*second/);
  if (match) {
    const seconds = parseInt(match[1], 10);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds;
  }
  return null;
}

function buildCustomerPayload(paymentData: any, rawData?: any) {
  const source = rawData?.data ?? rawData ?? {};
  const billing = source.billing || source.transaction?.transaction_billing || source.transaction?.billing || {};
  const document = paymentData?.billing?.document || billing.document || billing.identification || 'unknown';
  const nameRaw =
    paymentData?.billing?.name ||
    billing.name ||
    [billing.first_name, billing.last_name].filter(Boolean).join(' ') ||
    source.customer?.name ||
    'Cliente';
  const trimmedName = String(nameRaw || 'Cliente').trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || 'Biury';
  const emailRaw = paymentData?.billing?.email || billing.email || source.customer?.email || source.email || null;
  const phoneRaw = paymentData?.billing?.phone || billing.phone || billing.phone_number || source.customer?.phone || source.phone || null;

  const payload: any = {
    person_type: 'Person',
    id_type: '13',
    identification: String(document),
    name: [firstName, lastName],
    commercial_name: trimmedName,
  };

  if (emailRaw) {
    payload.emails = [String(emailRaw).trim()];
  }

  if (phoneRaw) {
    const phoneDigits = String(phoneRaw).replace(/\D/g, '');
    if (phoneDigits) {
      payload.phones = [{ number: phoneDigits }];
    }
  }

  return payload;
}

function isInvalidCustomer(responseData: any): boolean {
  const code = responseData?.data?.Errors?.[0]?.Code || responseData?.Errors?.[0]?.Code || '';
  const message = responseData?.data?.Errors?.[0]?.Message || responseData?.Errors?.[0]?.Message || '';
  return code === 'invalid_reference' && String(message).toLowerCase().includes('customer');
}

async function createSiigoCustomer(payload: any, siigoToken: string): Promise<{ success: boolean; response: any; error?: string }>
{
  const maxAttempts = 3;
  let lastResponse: any = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await waitForSiigoSlot();
      const response = await fetch('https://api.siigo.com/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${siigoToken}`,
          'Partner-Id': 'biury',
          'User-Agent': 'Dworkers-Biury/1.0',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      let responseData: any = {};

      if (contentType && contentType.includes('application/json')) {
        try {
          const jsonData = await response.json();
          responseData = { status: response.status, contentType, data: jsonData, request: payload };
        } catch (error: any) {
          responseData = { status: response.status, contentType, error: error.message || 'Respuesta inválida de Siigo', request: payload };
        }
      } else {
        const textResponse = await response.text();
        responseData = { status: response.status, contentType, body: textResponse, request: payload };
      }

      lastResponse = responseData;

      if (response.status === 429 && attempt < maxAttempts) {
        const baseWait = parseRetrySeconds(responseData) || 4;
        const waitSeconds = baseWait + (attempt - 1) * 5;
        await sleep(waitSeconds * 1000);
        continue;
      }

      if (!response.ok) {
        return {
          success: false,
          response: responseData,
          error: responseData?.data?.message || responseData?.data?.error || `HTTP ${response.status}`,
        };
      }

      return { success: true, response: responseData };
    } catch (error: any) {
      if (attempt >= maxAttempts) {
        return { success: false, response: lastResponse || {}, error: error.message || 'Error desconocido' };
      }
      await sleep(2000);
    }
  }

  return { success: false, response: lastResponse || {}, error: 'Error desconocido' };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastSiigoRequestAt = 0;
async function waitForSiigoSlot() {
  const minIntervalMs = 20000;
  const elapsed = Date.now() - lastSiigoRequestAt;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  lastSiigoRequestAt = Date.now();
}

async function saveLog(
  logId: number | null | undefined,
  data: {
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  payload_raw?: string;
  siigo_response?: string;
  status: 'success' | 'error' | 'filtered';
}): Promise<number> {
  if (logId) {
    const updated = await updateLogById(logId, {
      customer_document: data.customer_document,
      product_name: data.product_name,
      gateway: data.gateway,
      total: data.total,
      payload_raw: data.payload_raw,
      siigo_response: data.siigo_response,
      status: data.status,
    });
    if (updated) return logId;
  }

  return createDbLog(data);
}
