import { getConfig } from './module8-config';
import { shouldProcessProduct } from './module8-siigo';

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

async function createSiigoVoucher(
  paymentData: any,
  siigoToken: string
): Promise<{ success: boolean; response: SiigoVoucherResponse; error?: string }> {
  const gateway = paymentData.payment_gateway_name;
  const account = gateway === 'Wompi' ? '11200501' : '11100501';
  const totalFormatted = Number(paymentData.totals.total).toFixed(2);
  const paymentId = paymentData.payment_id;

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
          code: account,
          movement: 'Debit',
        },
        description: gateway === 'Wompi' ? 'Wompi' : 'Mercado Pago',
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
          consecutive: paymentId,
          quote: 1,
          date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
    ],
    observations: `Treli Payment ID: ${paymentId}`,
  };

  try {
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
        responseData = { status: response.status, contentType, data: jsonData };
      } catch (error: any) {
        responseData = { status: response.status, contentType, error: error.message || 'Respuesta inválida de Siigo' };
      }
    } else {
      const textResponse = await response.text();
      responseData = { status: response.status, contentType, body: textResponse };
    }

    if (!response.ok) {
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
    return {
      success: false,
      response: {},
      error: error.message || 'Error desconocido',
    };
  }
}

export async function processTreliWebhook(payload: { content: any }): Promise<{
  ok: boolean;
  status: 'success' | 'error' | 'filtered';
  logId?: number;
  error?: string;
}> {
  const data = payload.content;
  const normalized = normalizePaymentData(data);
  const payloadRaw = JSON.stringify(payload?.content ?? payload ?? {});

  if (!normalized || !normalized.items || !normalized.items.length) {
    const logId = await createLog({
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

  const productName = normalized.items[0].name;

  if (!shouldProcessProduct(productName)) {
    await createLog({
      payment_id: normalized.payment_id || 'unknown',
      customer_document: normalized.billing?.document || 'unknown',
      product_name: productName,
      gateway: normalized.payment_gateway_name || 'unknown',
      total: Number(normalized.totals?.total) || 0,
      payload_raw: payloadRaw,
      status: 'filtered',
    });
    return { ok: true, status: 'filtered' };
  }

  const authResult = await getSiigoToken();
  if (!authResult.token) {
    const logId = await createLog({
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

  const siigoResult = await createSiigoVoucher(normalized, authResult.token);

  const logId = await createLog({
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
  billing: { document: string };
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
    billing: { document: billingDocument },
    totals: { total },
    payment_gateway_name: gateway,
    items: source.items || [],
  };
}

async function createLog(data: {
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  payload_raw?: string;
  siigo_response?: string;
  status: 'success' | 'error' | 'filtered';
}): Promise<number> {
  const { query } = await import('@/utils/db');
  const [result] = await query(
    `INSERT INTO modulos_biury_8_logs 
     (payment_id, customer_document, product_name, gateway, total, payload_raw, siigo_response, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.payment_id,
      data.customer_document,
      data.product_name,
      data.gateway,
      data.total,
      data.payload_raw || null,
      data.siigo_response || null,
      data.status
    ]
  );
  return (result as any).insertId;
}

export { shouldProcessProduct };
