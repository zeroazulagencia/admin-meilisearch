import { NextRequest, NextResponse } from 'next/server';

// Importar pdf-parse usando require para compatibilidad
function loadPdfParse() {
  // @ts-ignore - pdf-parse no tiene tipos de TypeScript adecuados
  return require('pdf-parse');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }
    
    // Convertir archivo a buffer directamente (no necesitamos guardarlo en disco)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parsear PDF directamente del buffer
    const pdfParseFunc = loadPdfParse();
    const pdfData = await pdfParseFunc(buffer);
    
    // Verificar si hay texto extraído
    const text = pdfData.text?.trim() || '';
    
    if (!text || text.length === 0) {
      return NextResponse.json({
        success: false,
        text: 'Error: No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.',
        error: 'No se encontró texto en el PDF'
      });
    }
    
    return NextResponse.json({
      success: true,
      text: text,
      pages: pdfData.numpages || 0,
      info: pdfData.info || {}
    });
    
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    
    // Verificar si es un error de texto no encontrado
    if (error.message?.includes('No text') || error.message?.includes('no text')) {
      return NextResponse.json({
        success: false,
        text: 'Error: No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.',
        error: 'No se encontró texto en el PDF'
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al procesar el PDF',
        text: 'Error: No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.'
      },
      { status: 500 }
    );
  }
}

