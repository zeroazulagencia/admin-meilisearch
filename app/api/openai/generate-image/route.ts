import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-image-1';
const AVATARS_DIR = join(process.cwd(), 'public', 'agent-avatars');
const MAX_SIZE = 800; // Máximo 800x800px

// Asegurar que el directorio existe
async function ensureDir() {
  if (!existsSync(AVATARS_DIR)) {
    await mkdir(AVATARS_DIR, { recursive: true });
  }
}

// Función para descargar, redimensionar y guardar imagen
async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  try {
    // Descargar la imagen
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Error al descargar la imagen');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Usar sharp si está disponible, sino usar canvas o simplemente guardar
    // Por ahora, guardamos directamente y el frontend puede procesarla si es necesario
    // En el futuro se puede agregar sharp para procesamiento en servidor
    
    await ensureDir();
    
    // Generar nombre único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${randomString}-ai.jpg`;
    const filePath = join(AVATARS_DIR, fileName);
    
    // Guardar la imagen
    await writeFile(filePath, buffer);
    
    // Retornar la URL pública usando la API route
    const publicUrl = `/api/agent-avatars/${fileName}`;
    return publicUrl;
  } catch (error: any) {
    console.error('Error procesando imagen:', error);
    throw new Error('Error al procesar y guardar la imagen');
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
    console.log('OpenAI API response:', JSON.stringify(data, null, 2));
    
    // Intentar diferentes estructuras de respuesta
    let imageUrl = data.data?.[0]?.url || data.url || data.image_url || data.imageUrl;
    
    // Si no hay URL, verificar si hay base64
    if (!imageUrl && data.data?.[0]?.b64_json) {
      const base64Image = data.data[0].b64_json;
      imageUrl = `data:image/png;base64,${base64Image}`;
    }

    if (!imageUrl) {
      console.error('Estructura de respuesta inesperada:', data);
      return NextResponse.json(
        { error: 'No se recibió URL de imagen de OpenAI. Estructura de respuesta: ' + JSON.stringify(data) },
        { status: 500 }
      );
    }

    // Descargar, procesar y guardar la imagen en el sistema de archivos
    const savedImageUrl = await downloadAndSaveImage(imageUrl);

    // Retornar la ruta del archivo guardado junto con información del modelo
    return NextResponse.json({ 
      ok: true, 
      url: savedImageUrl,
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

