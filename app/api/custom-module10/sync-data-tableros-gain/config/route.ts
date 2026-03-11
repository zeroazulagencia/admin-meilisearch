import { NextRequest, NextResponse } from 'next/server';
import { getConfigValue, setConfigValue, getHiddenProjects, setHiddenProjects } from '@/utils/modulos/sync-data-tableros-gain/config';
import { maskSensitiveValue } from '@/utils/encryption';

export const dynamic = 'force-dynamic';

function maskToken(v: string | null): string | null {
  if (!v) return null;
  const masked = maskSensitiveValue(v, 4);
  return masked || '****';
}

export async function GET() {
  try {
    const csvUrl = await getConfigValue('csv_url');
    const hiddenProjects = await getHiddenProjects();
    const n8nApiKey = await getConfigValue('n8n_api_key');
    const n8nBaseUrl = await getConfigValue('n8n_base_url');
    const n8nWorkflowUrl = await getConfigValue('n8n_workflow_url');
    const n8nMergeNodeName = await getConfigValue('n8n_merge_node_name');
    return NextResponse.json({
      ok: true,
      config: {
        csv_url: csvUrl,
        hidden_projects: hiddenProjects,
        n8n_api_key: n8nApiKey ? maskToken(n8nApiKey) : null,
        n8n_base_url: n8nBaseUrl,
        n8n_workflow_url: n8nWorkflowUrl,
        n8n_merge_node_name: n8nMergeNodeName,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.csv_url !== undefined) {
      const nextUrl = body.csv_url ? String(body.csv_url).trim() : '';
      await setConfigValue('csv_url', nextUrl || null);
    }
    if (body.n8n_api_key !== undefined) {
      const nextKey = body.n8n_api_key ? String(body.n8n_api_key).trim() : '';
      await setConfigValue('n8n_api_key', nextKey || null);
    }
    if (body.n8n_base_url !== undefined) {
      const nextBase = body.n8n_base_url ? String(body.n8n_base_url).trim() : '';
      await setConfigValue('n8n_base_url', nextBase || null);
    }
    if (body.n8n_workflow_url !== undefined) {
      const nextWorkflow = body.n8n_workflow_url ? String(body.n8n_workflow_url).trim() : '';
      await setConfigValue('n8n_workflow_url', nextWorkflow || null);
    }
    if (body.n8n_merge_node_name !== undefined) {
      const nextNode = body.n8n_merge_node_name ? String(body.n8n_merge_node_name).trim() : '';
      await setConfigValue('n8n_merge_node_name', nextNode || null);
    }
    if (body.hidden_projects !== undefined) {
      const list: unknown[] = Array.isArray(body.hidden_projects) ? body.hidden_projects : [];
      await setHiddenProjects(list.map((v: unknown) => String(v)));
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
