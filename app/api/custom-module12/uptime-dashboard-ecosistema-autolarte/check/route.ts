import { NextResponse } from 'next/server';
import { SERVICE_SECTIONS } from '@/modules-custom/uptime-dashboard-ecosistema-autolarte/utils/services';
import { getModuleConfig } from '@/modules-custom/uptime-dashboard-ecosistema-autolarte/utils/config';

function sanitizeRoute(route: string): string {
  if (!route) return '';
  return route.replace(/\.php/g, '').replace(/=([^&]+)/g, '=XXX');
}

async function checkHttpService(url: string, timeout: number = 5, options: {
  method?: string;
  accept_codes?: number[];
  accept_400?: boolean;
  headers?: Record<string, string>;
} = {}): Promise<{ status: string; http_code: number; response_time_ms: number; error: string | null }> {
  const startTime = Date.now();
  try {
    const headers: Record<string, string> = options.headers || {};
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: { 'User-Agent': 'Autolarte-StatusPanel/1.0', ...headers },
      signal: AbortSignal.timeout(timeout * 1000)
    };

    const response = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;
    const httpCode = response.status;
    const acceptCodes = options.accept_codes || [];
    const isOnline = (httpCode >= 200 && httpCode < 400) ||
      (options.accept_400 && httpCode === 400) ||
      acceptCodes.includes(httpCode);

    return { status: isOnline ? 'online' : 'offline', http_code: httpCode, response_time_ms: responseTime, error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, error: error.message };
  }
}

async function checkChatWebhook(url: string, timeout: number = 15, message: string = 'Hola'): Promise<any> {
  const startTime = Date.now();
  try {
    const urlWithAction = url.includes('?') ? `${url}&action=sendMessage` : `${url}?action=sendMessage`;
    const response = await fetch(urlWithAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '1118e592-0b84-459e-bf19-39131f578869', chatInput: message }),
      signal: AbortSignal.timeout(timeout * 1000)
    });
    const responseTime = Date.now() - startTime;
    const httpCode = response.status;
    const responseText = await response.text();
    const isOk = httpCode >= 200 && httpCode < 400;

    let reply = null;
    try {
      const parsed = JSON.parse(responseText);
      reply = parsed.output || parsed.message || parsed.text || parsed.reply || parsed.response || null;
      if (reply === null) reply = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
    } catch { reply = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText; }

    return { status: isOk ? 'online' : 'offline', http_code: httpCode, response_time_ms: responseTime, chat_response: reply, error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, chat_response: null, error: error.message };
  }
}

async function checkN8nWorkflowActive(baseUrl: string, workflowId: string, apiKey: string, timeout: number = 10): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeout * 1000)
    });
    if (response.status !== 200) return { active: false, error: `status_code=${response.status}`, status_code: response.status };
    const data = await response.json();
    const wf = data.data || data;
    const active = wf.active === true || wf.active === 1 || wf.active === '1';
    return { active, error: null, status_code: response.status };
  } catch (error: any) { return { active: false, error: error.message, status_code: null }; }
}

async function getN8nLastExecution(baseUrl: string, workflowId: string, apiKey: string, timeout: number = 10): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/executions?workflowId=${workflowId}&limit=1`, {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeout * 1000)
    });
    if (response.status !== 200) return { status: null, finished_at: null, error: true };
    const data = await response.json();
    const executions = data.data || data.results || [];
    if (executions.length > 0) {
      const last = executions[0];
      return { status: last.status || last.executionStatus || null, finished_at: last.stoppedAt || last.finishedAt || null, error: false };
    }
    return { status: null, finished_at: null, error: true };
  } catch { return { status: null, finished_at: null, error: true }; }
}

async function verifyService(service: any, sectionIndex: number, serviceIndex: number): Promise<any> {
  const baseResult = {
    section_index: sectionIndex, service_index: serviceIndex,
    name: service.name, type: service.type,
    route: sanitizeRoute(service.route || service.endpoint || ''),
    description: service.description || '', en_desarrollo: service.en_desarrollo || false
  };

  if (service.en_desarrollo) return { ...baseResult, status: 'en_desarrollo', response_time_ms: null, error: null };

  if (service.type === 'http') {
    if (service.test_chat) {
      const result = await checkChatWebhook(service.endpoint, service.timeout, service.chat_message);
      return { ...baseResult, ...result, test_chat: true };
    }

    const headers: Record<string, string> = {};
    if (service.headers) {
      for (const [key, value] of Object.entries(service.headers)) {
        if (typeof value === 'string' && !value.includes('require')) headers[key] = value;
      }
    }

    const result: any = await checkHttpService(service.endpoint, service.timeout, {
      method: service.method, accept_codes: service.accept_codes, accept_400: service.accept_400, headers
    });

    if (service.fetch_executions) {
      const n8nApiKey = await getModuleConfig('n8n_api_key');
      if (n8nApiKey) {
        const exec = await getN8nLastExecution(service.executions_base_url || 'https://automation.zeroazul.com', service.workflow_id || '', n8nApiKey, service.timeout);
        result.last_execution_status = exec.status;
        result.last_execution_at = exec.finished_at;
        result.last_execution_error = exec.error ? 'Error al obtener' : null;
        result.fetch_executions = true;
      }
    }

    return { ...baseResult, ...result };
  }

  return { ...baseResult, status: 'unknown', response_time_ms: null, error: 'Tipo no soportado' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionIndex = parseInt(searchParams.get('section') || '-1');
    const serviceIndex = parseInt(searchParams.get('service') || '-1');

    if (sectionIndex < 0 || serviceIndex < 0) {
      return NextResponse.json({ success: false, error: 'Parametros invalidos' }, { status: 400 });
    }

    if (!SERVICE_SECTIONS[sectionIndex] || !SERVICE_SECTIONS[sectionIndex].services[serviceIndex]) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    const service = SERVICE_SECTIONS[sectionIndex].services[serviceIndex];
    if (!service.enabled) {
      return NextResponse.json({ success: false, error: 'Servicio deshabilitado' }, { status: 400 });
    }

    const result = await verifyService(service, sectionIndex, serviceIndex);

    return NextResponse.json({ success: true, service: result, checked_at: new Date().toISOString() });
  } catch (error: any) {
    console.error('[AUTOLARTE-CHECK]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
