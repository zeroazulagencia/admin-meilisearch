import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'El prompt es requerido' },
        { status: 400 }
      );
    }

    // Llamar a la API de OpenAI DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.trim(),
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Error al generar la imagen' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No se recibió URL de imagen de OpenAI' },
        { status: 500 }
      );
    }

    // Retornar la URL directa de OpenAI
    // La imagen se subirá automáticamente cuando el usuario guarde el agente
    return NextResponse.json({ 
      ok: true, 
      url: imageUrl
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}

