export interface ServiceConfig {
  name: string;
  type: 'http' | 'tcp' | 'outlook';
  endpoint: string;
  route?: string;
  description?: string;
  timeout: number;
  enabled: boolean;
  method?: 'GET' | 'POST' | 'HEAD';
  accept_codes?: number[];
  accept_400?: boolean;
  headers?: Record<string, string>;
  test_chat?: boolean;
  chat_message?: string;
  test_carta_laboral?: boolean;
  carta_nit?: string;
  test_formulario_vcard?: boolean;
  test_conocimiento_intranet?: boolean;
  test_datos_usuarios?: boolean;
  test_vcards_search?: boolean;
  test_birthday_search?: boolean;
  test_web_seguridad?: boolean;
  test_conocimiento_marcas?: boolean;
  conocimiento_marcas_urls?: string[];
  test_conocimiento_general?: boolean;
  fetch_executions?: boolean;
  workflow_id?: string;
  executions_base_url?: string;
  n8n_auth?: 'apikey' | 'bearer';
  en_desarrollo?: boolean;
}

export interface ServiceSection {
  title: string;
  services: ServiceConfig[];
}

export interface CheckResult {
  name: string;
  type: string;
  route: string;
  description: string;
  status: 'online' | 'offline' | 'en_desarrollo' | 'unknown';
  http_code?: number;
  response_time_ms?: number;
  error?: string | null;
  test_chat?: boolean;
  chat_response?: string;
  test_carta_laboral?: boolean;
  carta_checks?: CheckItem[];
  carta_response?: string;
  test_conocimiento_intranet?: boolean;
  conocimiento_checks?: CheckItem[];
  test_datos_usuarios?: boolean;
  datos_usuarios_search_term?: string;
  test_vcards_search?: boolean;
  vcards_search_term?: string;
  test_birthday_search?: boolean;
  birthday_checks?: CheckItem[];
  test_web_seguridad?: boolean;
  web_seguridad_checks?: CheckItem[];
  test_conocimiento_marcas?: boolean;
  conocimiento_marcas_checks?: CheckItem[];
  test_conocimiento_general?: boolean;
  last_execution_status?: string;
  last_execution_at?: string;
  last_execution_error?: string;
  fetch_executions?: boolean;
  en_desarrollo?: boolean;
}

export interface CheckItem {
  label: string;
  ok: boolean;
  url: string;
  error?: string | null;
  status_code?: number | null;
}

export interface ServiceSectionResult {
  title: string;
  services: CheckResult[];
}

export interface TotalsResult {
  inventario: number;
  vehiculos: number;
}

export interface VehicleSampleResult {
  fondos_image: string | null;
  placas_image: string | null;
}

export interface VcardSampleResult {
  id?: number;
  name?: string;
  role?: string;
  active_text?: string;
  view_url?: string;
}
