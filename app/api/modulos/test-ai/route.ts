import { NextRequest, NextResponse } from 'next/server';
import { processWithAI } from '@/utils/modulos/suvi-leads/processors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cleanedData } = body;

    if (!cleanedData) {
      return NextResponse.json(
        { ok: false, error: 'cleanedData es requerido' },
        { status: 400 }
      );
    }

    // Llamar a la función de IA sin actualizar BD (pasamos -1 como leadId)
    const result = await processWithAI(cleanedData, -1);

    return NextResponse.json({
      ok: true,
      data: result,
      message: 'Procesamiento con IA exitoso'
    });
  } catch (error: any) {
    console.error('Error en test-ai:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
