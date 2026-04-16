import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://autolarte.com.co/wp-json/jet-cct/cct_vehiculos_usados', {
      signal: AbortSignal.timeout(15000)
    });
    const vehicles = await response.json().catch(() => []);

    if (!Array.isArray(vehicles) || vehicles.length < 2) {
      return NextResponse.json({ fondos_image: null, placas_image: null });
    }

    const shuffled = [...vehicles].sort(() => Math.random() - 0.5);
    const v1 = shuffled[0];
    const v2 = shuffled[1];

    return NextResponse.json({
      fondos_image: v1?.imagen_principal || null,
      placas_image: v2?.imagen_principal || null
    });
  } catch (error: any) {
    console.error('[AUTOLARTE-VEHICLES]', error);
    return NextResponse.json({ fondos_image: null, placas_image: null });
  }
}
