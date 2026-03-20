interface TreliPaymentData {
  payment_id: string;
  billing: {
    document: string;
    [key: string]: any;
  };
  totals: {
    total: number;
  };
  payment_gateway_name: string;
  items: Array<{
    name: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface SiigoVoucherResponse {
  id?: number;
  number?: string;
  error?: string;
  message?: string;
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

export async function createSiigoVoucher(
  paymentData: TreliPaymentData,
  siigoToken: string
): Promise<{ success: boolean; response: SiigoVoucherResponse; error?: string }> {
  const gateway = paymentData.payment_gateway_name;
  const account = gateway === 'Wompi' ? '11200501' : '11100501';
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

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await waitForSiigoSlot();
      const response = await fetch('https://api.siigo.com/v1/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${siigoToken}`,
          'Partner-Id': 'biury',
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type');
      let responseData: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        responseData = { ...responseData, request: body, status: response.status };
      } else {
        const textResponse = await response.text();
        responseData = { error: textResponse, request: body, status: response.status };
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
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
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

export function shouldProcessProduct(productName: string): boolean {
  return productName.toLowerCase().includes('biurybox trimestre');
}

function parseRetrySeconds(responseData: any): number | null {
  const message = responseData?.Errors?.[0]?.Message || responseData?.message || '';
  const match = String(message).match(/(\d+)\s*second/);
  if (match) {
    const seconds = parseInt(match[1], 10);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds;
  }
  return null;
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
