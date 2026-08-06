import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig } from '@/utils/modulos/forocpi-exportacion-registros-23/module23-config';

export const dynamic = 'force-dynamic';

async function wpFetch(path: string) {
  const config = await getAllConfig();
  const wpUrl = config.wp_url || '';
  const wpUser = config.wp_user || '';
  const wpAppPassword = config.wp_app_password || '';

  if (!wpUrl || !wpUser || !wpAppPassword) {
    throw new Error('Configuracion incompleta');
  }

  const baseUrl = wpUrl.replace(/\/+$/, '');
  const auth = btoa(`${wpUser}:${wpAppPassword}`);

  const url = `${baseUrl}/wp-json/wp/v2/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'Workers-ZeroAzul/1.0',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WordPress respondio ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('id');
    const perPage = searchParams.get('per_page') || '20';
    const page = searchParams.get('page') || '1';
    const search = searchParams.get('search') || '';
    const year = searchParams.get('year') || '';

    let data;

    if (postId) {
      // Single post with meta
      data = await wpFetch(`jet-form-builder/${postId}?_fields=id,date,title,meta`);
    } else {
      // List posts
      let path = `jet-form-builder?_fields=id,date,title,meta&per_page=${perPage}&page=${page}&orderby=date&order=desc`;
      if (search) path += `&search=${encodeURIComponent(search)}`;
      if (year) path += `&after=${year}-01-01T00:00:00&before=${year}-12-31T23:59:59`;
      data = await wpFetch(path);
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}