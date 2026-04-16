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
  post_body?: string;
} = {}): Promise<{ status: string; http_code: number; response_time_ms: number; error: string | null }> {
  const startTime = Date.now();
  try {
    const headers: Record<string, string> = options.headers || {};
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: { 'User-Agent': 'Autolarte-StatusPanel/1.0', ...headers },
      signal: AbortSignal.timeout(timeout * 1000)
    };

    if (fetchOptions.method === 'POST' && options.post_body) {
      fetchOptions.body = options.post_body;
    }

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
    const responseText = await response.text();
    const isOk = response.status >= 200 && response.status < 400;
    let reply = null;
    try {
      const parsed = JSON.parse(responseText);
      reply = parsed.output || parsed.message || parsed.text || parsed.reply || parsed.response || null;
      if (reply === null) reply = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
    } catch { reply = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText; }

    return { status: isOk ? 'online' : 'offline', http_code: response.status, response_time_ms: responseTime, chat_response: reply, error: null };
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

async function checkCartaLaboral(cartaUrl: string, timeout: number = 30, nit: string = '1095796088'): Promise<any> {
  const startTime = Date.now();
  const checks: any[] = [];
  const n8nApiKey = await getModuleConfig('n8n_api_key');
  const sighaEmail = await getModuleConfig('sigha_email');
  const sighaClave = await getModuleConfig('sigha_clave');
  const workflowId = '2LrNwecu8iJmjLjW';
  const baseN8n = 'https://automation.zeroazul.com';

  const wfUrl = `${baseN8n}/workflow/${workflowId}`;
  const wfCheck = n8nApiKey ? await checkN8nWorkflowActive(baseN8n, workflowId, n8nApiKey, 10) : { active: false, error: 'Sin API key', status_code: null };
  checks.push({ label: '1) Workflow (API)', ok: wfCheck.active, url: wfUrl, error: wfCheck.active ? null : (wfCheck.error || 'inactivo'), status_code: wfCheck.status_code });

  const sighaLoginUrl = 'https://sigha.com.co/api/login/';
  try {
    const sighaResponse = await fetch(sighaLoginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sighaEmail, clave: sighaClave }),
      signal: AbortSignal.timeout(10000)
    });
    const sighaCode = sighaResponse.status;
    const sighaOk = (sighaCode >= 200 && sighaCode < 300) || sighaCode === 201;
    checks.push({ label: '2) Sigha', ok: sighaOk, url: sighaLoginUrl, error: sighaOk ? null : `status_code=${sighaCode}`, status_code: sighaCode });
  } catch (e: any) {
    checks.push({ label: '2) Sigha', ok: false, url: sighaLoginUrl, error: e.message, status_code: null });
  }

  let cartaCode = 0;
  let parsed = null;
  try {
    const cartaApiKey = await getModuleConfig('carta_api_key');
    const cartaResponse = await fetch(cartaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cartaApiKey || '' },
      body: JSON.stringify({ nit }),
      signal: AbortSignal.timeout((timeout - 15) * 1000)
    });
    cartaCode = cartaResponse.status;
    const cartaText = await cartaResponse.text();
    parsed = cartaText ? JSON.parse(cartaText) : null;
    const cartaOk = cartaCode >= 200 && cartaCode < 400;
    checks.push({ label: '3) carta-laboral', ok: cartaOk, url: cartaUrl, error: cartaOk ? null : (parsed?.message || `status_code=${cartaCode}`), status_code: cartaCode });
  } catch (e: any) {
    checks.push({ label: '3) carta-laboral', ok: false, url: cartaUrl, error: e.message, status_code: cartaCode || null });
  }

  const allOk = checks.every(c => c.ok);
  return {
    status: allOk ? 'online' : 'offline',
    http_code: cartaCode || checks[checks.length - 1]?.status_code || 0,
    response_time_ms: Date.now() - startTime,
    carta_checks: checks,
    carta_response: allOk ? (parsed?.message || 'Carta generada') : null,
    error: allOk ? null : checks.find(c => !c.ok)?.error || null
  };
}

async function checkConocimientoGeneral(url: string, timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  try {
    const bearer = await getModuleConfig('meilisearch_bearer') || 'Seph1rot*.*Cloud';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'autolarte', limit: 20, hybrid: { embedder: 'openai' } }),
      signal: AbortSignal.timeout(timeout * 1000)
    });
    const isOk = response.status >= 200 && response.status < 400;
    return { status: isOk ? 'online' : 'offline', http_code: response.status, response_time_ms: Date.now() - startTime, error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, error: error.message };
  }
}

async function checkConocimientoMarcas(urls: string[], timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  const checks: any[] = [];
  const timeoutPerUrl = Math.floor(timeout / urls.length);
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutPerUrl * 1000) });
      const ok = response.status === 200;
      const host = new URL(url).hostname;
      checks.push({ label: `${i + 1}) ${host}`, ok, url, error: ok ? null : `status_code=${response.status}`, status_code: response.status });
    } catch (e: any) {
      const host = new URL(url).hostname;
      checks.push({ label: `${i + 1}) ${host}`, ok: false, url, error: e.message, status_code: null });
    }
  }
  const allOk = checks.every(c => c.ok);
  return { status: allOk ? 'online' : 'offline', http_code: checks[checks.length - 1]?.status_code || 0, response_time_ms: Date.now() - startTime, conocimiento_marcas_checks: checks, error: null };
}

async function checkWebSeguridad(url: string, timeout: number = 10): Promise<any> {
  const startTime = Date.now();
  const checks: any[] = [];
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout * 1000) });
    checks.push({ label: 'Web', ok: response.status === 200, url, error: response.status === 200 ? null : `status_code=${response.status}`, status_code: response.status });
  } catch (e: any) {
    checks.push({ label: 'Web', ok: false, url, error: e.message, status_code: null });
  }

  let badCount = 0;
  const badCodes: number[] = [];
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeout * 1000) });
      if (response.status !== 200) { badCount++; badCodes.push(response.status); }
    } catch { badCount++; }
  }
  checks.push({ label: 'Redireccion (5 llamadas)', ok: badCount === 0, url, error: badCount === 0 ? null : `${badCount} de 5 sin 200`, status_code: badCount === 0 ? 200 : (badCodes[0] || null) });

  const allOk = checks.every(c => c.ok);
  return { status: allOk ? 'online' : 'offline', http_code: checks[0]?.status_code || 0, response_time_ms: Date.now() - startTime, web_seguridad_checks: checks, error: null };
}

async function checkConocimientoIntranet(baseUrl: string, timeout: number = 15, search: string = 'test'): Promise<any> {
  const startTime = Date.now();
  const checks: any[] = [];
  const n8nApiKey = await getModuleConfig('n8n_api_key');
  const workflowId = 'Jh7DY8mOcgT5YlSB';
  const baseN8n = 'https://automation.zeroazul.com';
  const wfUrl = `${baseN8n}/workflow/${workflowId}`;
  const wfCheck = n8nApiKey ? await checkN8nWorkflowActive(baseN8n, workflowId, n8nApiKey, 10) : { active: false, error: 'Sin API key', status_code: null };
  checks.push({ label: '1) Workflow (API)', ok: wfCheck.active, url: wfUrl, error: wfCheck.active ? null : (wfCheck.error || 'inactivo'), status_code: wfCheck.status_code });

  try {
    const intranetAuth = await getModuleConfig('intranet_basic_auth') || 'emVyb2F6dWw6SzkjbVA3JHZMMkBuUTUheFI4';
    const url = `${baseUrl}?search=${encodeURIComponent(search)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${intranetAuth}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout((timeout - 5) * 1000)
    });
    const apiOk = response.status >= 200 && response.status < 400;
    checks.push({ label: '2) API Intranet', ok: apiOk, url, error: apiOk ? null : `status_code=${response.status}`, status_code: response.status });
  } catch (e: any) {
    checks.push({ label: '2) API Intranet', ok: false, url: baseUrl, error: e.message, status_code: null });
  }

  const allOk = checks.every(c => c.ok);
  return { status: allOk ? 'online' : 'offline', http_code: checks[checks.length - 1]?.status_code || 0, response_time_ms: Date.now() - startTime, conocimiento_checks: checks, error: allOk ? null : checks.find(c => !c.ok)?.error || null };
}

async function checkBirthdaySearch(baseUrl: string, timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  const checks: any[] = [];
  const n8nApiKey = await getModuleConfig('n8n_api_key');
  const workflowId = 'ahoBHp5FvWhlbZwq';
  const baseN8n = 'https://automation.zeroazul.com';
  const wfUrl = `${baseN8n}/workflow/${workflowId}`;
  const wfCheck = n8nApiKey ? await checkN8nWorkflowActive(baseN8n, workflowId, n8nApiKey, 10) : { active: false, error: 'Sin API key', status_code: null };
  checks.push({ label: '1) Workflow (API)', ok: wfCheck.active, url: wfUrl, error: wfCheck.active ? null : (wfCheck.error || 'inactivo'), status_code: wfCheck.status_code });

  const month = new Date().getMonth() + 1;
  try {
    const tarjetavAuth = await getModuleConfig('tarjetav_basic_auth') || 'YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
    const url = `${baseUrl}/${month}/`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${tarjetavAuth}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout((timeout - 5) * 1000)
    });
    const apiOk = response.status === 200;
    checks.push({ label: '2) API birthday', ok: apiOk, url, error: apiOk ? null : `status_code=${response.status}`, status_code: response.status });
  } catch (e: any) {
    checks.push({ label: '2) API birthday', ok: false, url: baseUrl, error: e.message, status_code: null });
  }

  const allOk = checks.every(c => c.ok);
  return { status: allOk ? 'online' : 'offline', http_code: checks[checks.length - 1]?.status_code || 0, response_time_ms: Date.now() - startTime, birthday_checks: checks, error: allOk ? null : checks.find(c => !c.ok)?.error || null };
}

async function checkDatosUsuarios(url: string, timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  try {
    const tarjetavAuth = await getModuleConfig('tarjetav_basic_auth') || 'YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${tarjetavAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: 'Juan ballesteros' }),
      signal: AbortSignal.timeout(timeout * 1000)
    });
    return { status: response.status >= 200 && response.status < 400 ? 'online' : 'offline', http_code: response.status, response_time_ms: Date.now() - startTime, datos_usuarios_search_term: 'Juan ballesteros', error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, datos_usuarios_search_term: 'Juan ballesteros', error: error.message };
  }
}

async function checkVcardsSearch(url: string, timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  let searchName = 'test';
  const tarjetavAuth = await getModuleConfig('tarjetav_basic_auth') || 'YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
  try {
    const vcardsResponse = await fetch('https://tarjetav.co/api/vcards?order=random', { headers: { 'Authorization': `Basic ${tarjetavAuth}` }, signal: AbortSignal.timeout(10000) });
    const vcards = await vcardsResponse.json().catch(() => []);
    if (Array.isArray(vcards) && vcards.length > 0) {
      const v = vcards[Math.floor(Math.random() * vcards.length)];
      searchName = v.name || 'test';
    }
  } catch {}

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${tarjetavAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: searchName }),
      signal: AbortSignal.timeout(timeout * 1000)
    });
    return { status: response.status >= 200 && response.status < 400 ? 'online' : 'offline', http_code: response.status, response_time_ms: Date.now() - startTime, vcards_search_term: searchName, error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, vcards_search_term: searchName, error: error.message };
  }
}

async function checkFormularioVcard(baseUrl: string, timeout: number = 15): Promise<any> {
  const startTime = Date.now();
  const tarjetavAuth = await getModuleConfig('tarjetav_basic_auth') || 'YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
  let vcardId: string | null = null;
  try {
    const vcardsResponse = await fetch('https://tarjetav.co/api/vcards?order=random', { headers: { 'Authorization': `Basic ${tarjetavAuth}` }, signal: AbortSignal.timeout(10000) });
    const vcards = await vcardsResponse.json().catch(() => []);
    if (Array.isArray(vcards) && vcards.length > 0) {
      const v = vcards[Math.floor(Math.random() * vcards.length)];
      vcardId = v.id?.toString() || null;
    }
  } catch {}

  if (!vcardId) return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, error: 'No se obtuvo id de vcards' };

  try {
    const response = await fetch(`${baseUrl}${vcardId}`, { method: 'HEAD', signal: AbortSignal.timeout(timeout * 1000) });
    return { status: response.status >= 200 && response.status < 400 ? 'online' : 'offline', http_code: response.status, response_time_ms: Date.now() - startTime, error: null };
  } catch (error: any) {
    return { status: 'offline', http_code: 0, response_time_ms: Date.now() - startTime, error: error.message };
  }
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
    if (service.test_chat) { const result = await checkChatWebhook(service.endpoint, service.timeout, service.chat_message); return { ...baseResult, ...result, test_chat: true }; }
    if (service.test_carta_laboral) { const result = await checkCartaLaboral(service.endpoint, service.timeout, service.carta_nit); return { ...baseResult, ...result, test_carta_laboral: true }; }
    if (service.test_conocimiento_general) { const result = await checkConocimientoGeneral(service.endpoint, service.timeout); return { ...baseResult, ...result, test_conocimiento_general: true }; }
    if (service.test_conocimiento_marcas) { const result = await checkConocimientoMarcas(service.conocimiento_marcas_urls || [], service.timeout); return { ...baseResult, ...result, test_conocimiento_marcas: true }; }
    if (service.test_web_seguridad) { const result = await checkWebSeguridad(service.endpoint, service.timeout); return { ...baseResult, ...result, test_web_seguridad: true }; }
    if (service.test_conocimiento_intranet) { const result = await checkConocimientoIntranet(service.endpoint, service.timeout, 'test'); return { ...baseResult, ...result, test_conocimiento_intranet: true }; }
    if (service.test_birthday_search) { const result = await checkBirthdaySearch(service.endpoint, service.timeout); return { ...baseResult, ...result, test_birthday_search: true }; }
    if (service.test_datos_usuarios) { const result = await checkDatosUsuarios(service.endpoint, service.timeout); return { ...baseResult, ...result, test_datos_usuarios: true }; }
    if (service.test_vcards_search) { const result = await checkVcardsSearch(service.endpoint, service.timeout); return { ...baseResult, ...result, test_vcards_search: true }; }
    if (service.test_formulario_vcard) { const result = await checkFormularioVcard(service.endpoint, service.timeout); return { ...baseResult, ...result, test_formulario_vcard: true }; }

    const headers: Record<string, string> = {};
    if (service.headers) {
      for (const [key, value] of Object.entries(service.headers as Record<string, string>)) {
        if (typeof value === 'string' && !value.includes('require')) headers[key] = value;
      }
    }

    const result: any = await checkHttpService(service.endpoint, service.timeout, { method: service.method, accept_codes: service.accept_codes, accept_400: service.accept_400, headers });

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
