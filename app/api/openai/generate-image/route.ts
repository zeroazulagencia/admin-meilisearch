import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-image-1';

// Función para redimensionar y comprimir imagen usando Canvas API del navegador
// Como estamos en el servidor, usaremos una aproximación con fetch y conversión a base64
async function processImage(imageUrl: string): Promise<string> {
  try {
    // Descargar la imagen
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Error al descargar la imagen');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // Retornar la imagen en base64 (el procesamiento de redimensionado se hará en el frontend)
    return dataUrl;
  } catch (error: any) {
    console.error('Error procesando imagen:', error);
    throw new Error('Error al procesar la imagen');
  }
}

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

    // Llamar a la API de OpenAI GPT Image 1
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt.trim(),
        n: 1,
        size: '1024x1024'
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

    // Procesar la imagen: descargar y convertir a base64
    const processedImage = await processImage(imageUrl);

    // Retornar la imagen procesada en base64 junto con información del modelo
    return NextResponse.json({ 
      ok: true, 
      url: processedImage,
      model: MODEL,
      originalUrl: imageUrl
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}

