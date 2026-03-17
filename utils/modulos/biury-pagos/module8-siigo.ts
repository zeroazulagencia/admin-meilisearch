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

export async function createSiigoVoucher(
  paymentData: TreliPaymentData,
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
        'Authorization': `Bearer ${siigoToken}`,
        'Partner-Id': 'biury',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    let responseData: any = {};
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      responseData = { error: textResponse };
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
    return {
      success: false,
      response: {},
      error: error.message || 'Error desconocido',
    };
  }
}

export function shouldProcessProduct(productName: string): boolean {
  return productName.toLowerCase().includes('biurybox trimestre');
}
