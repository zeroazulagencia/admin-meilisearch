import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const version = '2026-03-25-1';
    const filePath = path.join(process.cwd(), 'plugins', 'za-plate-assistant.zip');
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="za-plate-assistant-${version}.zip"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'No se encontro el ZIP del plugin' },
      { status: 404 }
    );
  }
}
