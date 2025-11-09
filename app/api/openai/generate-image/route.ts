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

    // Descargar la imagen y subirla a nuestro servidor
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Error al descargar la imagen generada');
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      
      // Crear FormData para subir la imagen
      const formData = new FormData();
      formData.append('file', imageBlob, 'ai-generated-avatar.png');
      formData.append('folder', 'agents');

      // Subir la imagen usando nuestro endpoint de upload
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json().catch(() => ({ error: 'Error al subir imagen' }));
        throw new Error(uploadError.error || 'Error al subir la imagen');
      }

      const uploadData = await uploadResponse.json();
      
      if (uploadData.ok && uploadData.url) {
        return NextResponse.json({ 
          ok: true, 
          url: uploadData.url 
        });
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (uploadError: any) {
      console.error('Error uploading generated image:', uploadError);
      // Si falla la subida, retornar la URL directa de OpenAI como fallback
      return NextResponse.json({ 
        ok: true, 
        url: imageUrl,
        warning: 'La imagen se generó pero no se pudo subir al servidor. Se usará la URL temporal de OpenAI.'
      });
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}

