import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'El prompt es requerido' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      );
    }

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
        { error: errorData.error?.message || 'Error al generar imagen con OpenAI' },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    const imageUrl = responseData.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No se recibió URL de imagen de OpenAI' },
        { status: 500 }
      );
    }

    // Descargar la imagen y subirla al servidor usando upload-agent-avatar
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Error al descargar imagen de OpenAI');
      }

      const imageBlob = await imageResponse.blob();
      const bytes = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Crear FormData para subir la imagen
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: `ai-generated-${Date.now()}.png`,
        contentType: 'image/png',
      });

      // Llamar al endpoint de upload-agent-avatar
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/upload-agent-avatar`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Error al subir imagen');
      }

      return NextResponse.json({ 
        ok: true, 
        url: uploadData.url 
      });
    } catch (uploadError: any) {
      console.error('Error uploading generated image:', uploadError);
      // Si falla la subida, devolver la URL directa de OpenAI
      return NextResponse.json({ 
        ok: true, 
        url: imageUrl,
        warning: 'Imagen generada pero no subida al servidor. Se usará URL temporal.'
      });
    }
  } catch (error: any) {
    console.error('Error generating image with OpenAI:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar imagen con IA' },
      { status: 500 }
    );
  }
}

