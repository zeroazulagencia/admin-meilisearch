import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const AVATARS_DIR = join(process.cwd(), 'public', 'agent-avatars');

// Asegurar que el directorio existe
async function ensureDir() {
  if (!existsSync(AVATARS_DIR)) {
    await mkdir(AVATARS_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (1 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede ser mayor a 1 MB' }, { status: 400 });
    }

    await ensureDir();

    // Generar nombre único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${extension}`;
    const filePath = join(AVATARS_DIR, fileName);

    // Convertir a buffer y guardar
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Retornar la URL pública
    const publicUrl = `/agent-avatars/${fileName}`;

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      fileName 
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}

