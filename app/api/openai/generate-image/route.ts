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

    // Descargar la imagen y subirla al servidor
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Error al descargar imagen de OpenAI');
      }

      const imageBlob = await imageResponse.blob();
      const bytes = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Guardar directamente en el servidor usando el mismo método que upload-agent-avatar
      const { writeFile, mkdir } = require('fs/promises');
      const { join } = require('path');
      const { existsSync } = require('fs');
      
      const AVATARS_DIR = join(process.cwd(), 'public', 'agent-avatars');
      
      // Asegurar que el directorio existe
      if (!existsSync(AVATARS_DIR)) {
        await mkdir(AVATARS_DIR, { recursive: true });
      }
      
      // Generar nombre único
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${randomString}.png`;
      const filePath = join(AVATARS_DIR, fileName);
      
      // Guardar el archivo
      await writeFile(filePath, buffer);
      
      // Retornar la URL pública
      const publicUrl = `/api/agent-avatars/${fileName}`;
      
      return NextResponse.json({ 
        ok: true, 
        url: publicUrl
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

