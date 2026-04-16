import { NextResponse } from 'next/server';
import { getAllModuleConfig, setModuleConfig } from '@/modules-custom/uptime-dashboard-ecosistema-autolarte/utils/config';

export async function GET() {
  try {
    const config = await getAllModuleConfig();
    const masked: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(config)) {
      if (value && key.includes('key') || key.includes('secret') || key.includes('clave')) {
        masked[key] = value ? '********' : null;
      } else {
        masked[key] = value;
      }
    }

    return NextResponse.json({ success: true, config: masked });
  } catch (error: any) {
    console.error('[AUTOLARTE-CONFIG-GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { n8n_api_key, sigha_email, sigha_clave, outlook_client_id, outlook_client_secret } = body;

    if (n8n_api_key !== undefined) await setModuleConfig('n8n_api_key', n8n_api_key || null);
    if (sigha_email !== undefined) await setModuleConfig('sigha_email', sigha_email || null);
    if (sigha_clave !== undefined) await setModuleConfig('sigha_clave', sigha_clave || null);
    if (outlook_client_id !== undefined) await setModuleConfig('outlook_client_id', outlook_client_id || null);
    if (outlook_client_secret !== undefined) await setModuleConfig('outlook_client_secret', outlook_client_secret || null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AUTOLARTE-CONFIG-PUT]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
