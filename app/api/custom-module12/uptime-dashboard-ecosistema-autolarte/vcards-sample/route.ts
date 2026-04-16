import { NextResponse } from 'next/server';
import { getModuleConfig } from '@/modules-custom/uptime-dashboard-ecosistema-autolarte/utils/config';

export async function GET() {
  try {
    const tarjetavAuth = await getModuleConfig('tarjetav_basic_auth') || 'YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
    const response = await fetch('https://tarjetav.co/api/vcards?order=random&limit=1', {
      headers: { 'Authorization': `Basic ${tarjetavAuth}` },
      signal: AbortSignal.timeout(15000)
    });

    const vcards = await response.json().catch(() => []);

    if (!Array.isArray(vcards) || vcards.length === 0) {
      return NextResponse.json({});
    }

    const v = vcards[0];
    return NextResponse.json({
      id: v.id,
      name: v.name,
      role: v.role || v.cargo || '',
      active_text: v.activo === 1 || v.activo === true ? 'activo' : 'inactivo',
      view_url: v.id ? `https://tarjetav.co/autolarte/vcard/${v.id}` : null
    });
  } catch (error: any) {
    console.error('[AUTOLARTE-VCARDS]', error);
    return NextResponse.json({});
  }
}
