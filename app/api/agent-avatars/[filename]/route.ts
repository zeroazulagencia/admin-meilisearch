import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const AVATAR_DIR = '/root/admin-meilisearch/public/agent-avatars';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    
    if (!filename || !/^[\w\-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return new NextResponse('Invalid filename', { status: 400 });
    }
    
    const filePath = path.join(AVATAR_DIR, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse('Not found', { status: 404 });
    }
    
    // Serve resized JPEG with max 500px dimension
    const buffer = await sharp(filePath)
      .resize(500, 500, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
        'ETag': `"${buffer.length}-${Date.now()}"`,
      },
    });
  } catch (e) {
    console.error('Agent avatar serve error:', e);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
