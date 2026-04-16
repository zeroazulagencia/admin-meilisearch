import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [inventarioPromise, vehiculosPromise] = await Promise.allSettled([
      fetch('https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json', { signal: AbortSignal.timeout(15000) }),
      fetch('https://autolarte.com.co/wp-json/jet-cct/cct_vehiculos_usados', { signal: AbortSignal.timeout(15000) })
    ]);

    let inventarioCount = 0;
    let vehiculosCount = 0;

    if (inventarioPromise.status === 'fulfilled') {
      try {
        const response = inventarioPromise.value;
        const data = await response.json().catch(() => null);
        if (data && data.mdx_inventario_usadosResult) {
          inventarioCount = Array.isArray(data.mdx_inventario_usadosResult) ? data.mdx_inventario_usadosResult.length : 0;
        } else if (Array.isArray(data)) {
          inventarioCount = data.length;
        }
      } catch {}
    }

    if (vehiculosPromise.status === 'fulfilled') {
      try {
        const response = vehiculosPromise.value;
        const data = await response.json().catch(() => null);
        if (Array.isArray(data)) vehiculosCount = data.length;
      } catch {}
    }

    return NextResponse.json({ inventario: inventarioCount, vehiculos: vehiculosCount });
  } catch (error: any) {
    console.error('[AUTOLARTE-TOTALS]', error);
    return NextResponse.json({ inventario: 0, vehiculos: 0 });
  }
}
