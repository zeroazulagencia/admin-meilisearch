import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig } from '@/utils/modulos/forocpi-exportacion-registros-23/module23-config';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const config = await getAllConfig();
    const wpUrl = config.wp_url || '';
    const wpUser = config.wp_user || '';
    const wpAppPassword = config.wp_app_password || '';

    if (!wpUrl || !wpUser || !wpAppPassword) {
      return NextResponse.json({
        ok: false,
        message: 'Configuracion incompleta: wp_url, wp_user y wp_app_password son requeridos',
      }, { status: 400 });
    }

    // Test WordPress REST API
    const baseUrl = wpUrl.replace(/\/+$/, '');
    const auth = btoa(`${wpUser}:${wpAppPassword}`);

    const wpRes = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Workers-ZeroAzul/1.0',
      },
    });

    if (!wpRes.ok) {
      const text = await wpRes.text().catch(() => 'sin detalle');
      return NextResponse.json({
        ok: false,
        message: `WordPress API respondio ${wpRes.status}: ${text.slice(0, 200)}`,
      }, { status: 502 });
    }

    const data = await wpRes.json();

    return NextResponse.json({
      ok: true,
      message: `Conexion exitosa con WordPress (${baseUrl}) — usuario: ${data.name || data.slug || wpUser}`,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      message: 'Error de conexion: ' + (e.message || 'desconocido'),
    }, { status: 502 });
  }
}