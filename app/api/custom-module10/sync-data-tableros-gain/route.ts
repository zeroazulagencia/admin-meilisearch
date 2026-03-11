import { NextRequest, NextResponse } from 'next/server';
import { getConfigValue, getHiddenProjects } from '@/utils/modulos/sync-data-tableros-gain/config';

export const dynamic = 'force-dynamic';

type CsvRow = Record<string, string>;
type ProcessedRow = Record<string, string | Record<string, string> | Record<string, Record<string, string>>> & {
  nombre?: string;
  licitaciones_detalle: Record<string, Record<string, string>>;
  cpm_detalle: Record<string, string>;
};

type N8nExecution = {
  id: string;
  status?: string;
  finished?: boolean;
  startedAt?: string;
  data?: {
    resultData?: {
      runData?: Record<string, Array<{ data?: { main?: Array<Array<{ json?: Record<string, unknown> }>> } }>>;
    };
  };
};

function toNumber(value: string | undefined): number {
  if (value == null) return 0;
  const normalized = String(value).replace(/\s+/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function getWorkflowId(workflowUrl: string): string | null {
  const match = workflowUrl.match(/\/workflow\/([^/]+)/);
  return match ? match[1] : null;
}

function ensureBaseUrl(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function normalizeRow(json: Record<string, unknown>): CsvRow {
  const out: CsvRow = {};
  Object.entries(json).forEach(([key, value]) => {
    if (value == null) out[key] = '';
    else out[key] = String(value);
  });
  if (!out.nombre && out.proyecto) out.nombre = out.proyecto;
  return out;
}

async function getLatestSuccessfulExecution(baseUrl: string, apiKey: string, workflowId: string): Promise<N8nExecution | null> {
  const url = `${ensureBaseUrl(baseUrl)}api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&limit=10&includeData=true`;
  const res = await fetch(url, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const executions: N8nExecution[] = Array.isArray(json?.data) ? json.data : [];
  const success = executions.find((exec) => exec?.status === 'success' && exec?.finished === true);
  return success || null;
}

function groupLicitaciones(project: CsvRow): Record<string, Record<string, string>> {
  const licitaciones: Record<string, Record<string, string>> = {};
  Object.entries(project).forEach(([key, value]) => {
    const match = key.match(/^lic(\d+)_(.+)$/);
    if (!match) return;
    if (value == null || value === '') return;
    const licNum = match[1];
    const fieldName = match[2];
    if (!licitaciones[licNum]) licitaciones[licNum] = {};
    licitaciones[licNum][fieldName] = value;
  });
  return Object.fromEntries(Object.entries(licitaciones).filter(([, v]) => Object.keys(v).length > 0));
}

function groupCPM(project: CsvRow): Record<string, string> {
  const cpm: Record<string, string> = {};
  Object.entries(project).forEach(([key, value]) => {
    if (!key.startsWith('cpm_')) return;
    const fieldName = key.slice(4);
    cpm[fieldName] = value;
  });
  return cpm;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get('include_hidden') === 'true';
    const n8nApiKey = await getConfigValue('n8n_api_key');
    const n8nBaseUrl = await getConfigValue('n8n_base_url');
    const n8nWorkflowUrl = await getConfigValue('n8n_workflow_url');
    const n8nMergeNodeName = (await getConfigValue('n8n_merge_node_name')) || 'Merge';
    const hiddenProjects = includeHidden ? [] : await getHiddenProjects();

    if (!n8nApiKey || !n8nBaseUrl || !n8nWorkflowUrl) {
      return NextResponse.json({ success: false, error: 'Configuracion de n8n incompleta' }, { status: 400 });
    }

    const workflowId = getWorkflowId(n8nWorkflowUrl);
    if (!workflowId) {
      return NextResponse.json({ success: false, error: 'No se pudo leer el workflow ID' }, { status: 400 });
    }

    const execution = await getLatestSuccessfulExecution(n8nBaseUrl, n8nApiKey, workflowId);
    if (!execution) {
      return NextResponse.json({ success: false, error: 'No hay ejecuciones exitosas' }, { status: 404 });
    }

    const runData = execution.data?.resultData?.runData || {};
    const mergeData = runData[n8nMergeNodeName];
    const mainData = mergeData?.[0]?.data?.main?.[0] || [];
    const data: CsvRow[] = mainData
      .map((item) => item?.json)
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeRow(item));

    const processedData: ProcessedRow[] = data.map((project) => ({
      ...(project as Record<string, string>),
      licitaciones_detalle: groupLicitaciones(project),
      cpm_detalle: groupCPM(project),
    }));

    const filteredData = includeHidden
      ? processedData
      : processedData.filter((project) => {
          const projectName = typeof project.nombre === 'string'
            ? project.nombre
            : typeof project['nombre'] === 'string'
              ? project['nombre']
              : typeof project['proyecto'] === 'string'
                ? project['proyecto']
                : '';
          return !hiddenProjects.includes(projectName);
        });

    const sum = (key: string) =>
      filteredData.reduce((acc, project) => {
        const value = project[key];
        return acc + toNumber(typeof value === 'string' ? value : undefined);
      }, 0);

    const response = {
      success: true,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      metadata: {
        total_projects: filteredData.length,
        csv_source: 'n8n',
        columns_count: Object.keys(data[0] || {}).length,
        new_features: {
          licitaciones_detalle: 'Datos agrupados por licitacion (lic1_, lic2_, etc.)',
          cpm_detalle: 'Datos detallados de CPM agrupados',
        },
      },
      indicadores_cpm: {
        entidades_presentan_ideas: sum('entidades_presentan_ideas'),
        ideas_recibidas: sum('ideas_recibidas'),
        entrevistas_realizadas: sum('entrevistas_realizadas'),
        licitaciones_realizadas: sum('licitaciones_realizadas'),
        importe_total_licitaciones: sum('importe_total_licitaciones'),
        importe_total_adjudicado: sum('importe_adjudicado'),
      },
      indicadores_inversion_uso: {
        inversion_idi_total: sum('inversion_i_d_i'),
        numero_usuarios_total: sum('usuarios'),
        posicionamiento_galicia_total: sum('posicionamiento_galicia'),
        potencial_extension_total: sum('potencial_extension'),
      },
      indicadores_empleo: {
        empleo_tecnico_generado: sum('empleo_tecnico_generado'),
        empleo_tecnico_mantenido: sum('empleo_tecnico_mantenido'),
      },
      otros_impactos_estrategicos: {
        inversion_idi_inducida: sum('inversion_i_d_i_inducida'),
        exportaciones: sum('exportaciones'),
      },
      data: filteredData,
    };

    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
