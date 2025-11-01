import { NextRequest, NextResponse } from 'next/server';

// Importar pdfjs-dist dinámicamente para evitar problemas de bundling
async function loadPdfJs() {
  try {
    // @ts-ignore - pdfjs-dist no tiene tipos completos
    const pdfjs = await import('pdfjs-dist');
    
    // En Node.js no necesitamos configurar worker, pdfjs-dist funciona sin él
    // Simplemente no configuramos GlobalWorkerOptions
    
    console.log('[PDF-PARSE] pdfjs-dist cargado:', {
      version: pdfjs.version,
      hasGetDocument: typeof pdfjs.getDocument === 'function',
      hasGlobalWorkerOptions: !!pdfjs.GlobalWorkerOptions
    });
    
    return pdfjs;
  } catch (error: any) {
    console.error('[PDF-PARSE] Error cargando pdfjs-dist:', error);
    throw new Error(`No se pudo cargar pdfjs-dist: ${error.message || error}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[PDF-PARSE] Iniciando parseo de PDF...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    console.log('[PDF-PARSE] File recibido:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      lastModified: file?.lastModified
    });
    
    if (!file) {
      console.error('[PDF-PARSE] Error: No se proporcionó ningún archivo');
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }
    
    if (file.type !== 'application/pdf') {
      console.error('[PDF-PARSE] Error: Tipo de archivo incorrecto:', file.type);
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }
    
    console.log('[PDF-PARSE] Convirtiendo archivo a Uint8Array...');
    // Convertir archivo directamente a Uint8Array (pdfjs-dist requiere Uint8Array, no Buffer)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[PDF-PARSE] Uint8Array creado:', {
      arrayLength: uint8Array.length,
      arrayType: uint8Array.constructor.name,
      firstBytes: Array.from(uint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('')
    });
    
    console.log('[PDF-PARSE] Cargando PDF con pdfjs-dist...');
    // Cargar pdfjs-dist dinámicamente
    const pdfjsLib = await loadPdfJs();
    
    // En Node.js no necesitamos configurar worker, pdfjs-dist funcionará sin él
    // Parsear PDF usando pdfjs-dist (requiere Uint8Array, no Buffer)
    // Usar useSystemFonts: true y disableAutoFetch: true para mejor compatibilidad en servidor
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      useSystemFonts: true,
      disableAutoFetch: true,
      disableStream: false
    });
    const pdf = await loadingTask.promise;
    
    console.log('[PDF-PARSE] PDF cargado, número de páginas:', pdf.numPages);
    
    // Extraer texto de todas las páginas
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`[PDF-PARSE] Extrayendo texto de página ${pageNum}/${numPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Concatenar todos los items de texto
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      console.log(`[PDF-PARSE] Página ${pageNum}: ${pageText.length} caracteres extraídos`);
    }
    
    // Obtener metadatos del PDF
    let pdfInfo: any = null;
    try {
      const metadata = await pdf.getMetadata();
      if (metadata && metadata.info) {
        const info = metadata.info as any;
        pdfInfo = {
          Title: info.Title || null,
          Author: info.Author || null,
          Subject: info.Subject || null,
          Creator: info.Creator || null,
          Producer: info.Producer || null,
          CreationDate: info.CreationDate || null,
          ModDate: info.ModDate || null
        };
      }
    } catch (metaError) {
      console.log('[PDF-PARSE] No se pudieron obtener metadatos:', metaError);
    }
    
    const pdfData = {
      text: fullText,
      numpages: numPages,
      info: pdfInfo || {},
      metadata: null
    };
    
    console.log('[PDF-PARSE] PDF parseado exitosamente');
    
    console.log('[PDF-PARSE] PDF parseado exitosamente:', {
      numpages: pdfData.numpages,
      textLength: pdfData.text?.length || 0,
      textPreview: pdfData.text?.substring(0, 200) || '(sin texto)',
      hasText: !!pdfData.text,
      textIsEmpty: !pdfData.text || pdfData.text.trim().length === 0,
      info: pdfData.info || null,
      metadata: pdfData.metadata || null
    });
    
    console.log('[PDF-PARSE] Texto completo (primeros 500 caracteres):', pdfData.text?.substring(0, 500));
    console.log('[PDF-PARSE] Texto completo (últimos 500 caracteres):', pdfData.text?.substring(Math.max(0, (pdfData.text?.length || 0) - 500)));
    
    // Verificar si hay texto extraído
    const text = pdfData.text?.trim() || '';
    
    console.log('[PDF-PARSE] Texto después de trim:', {
      originalLength: pdfData.text?.length || 0,
      trimmedLength: text.length,
      isEmpty: text.length === 0
    });
    
    if (!text || text.length === 0) {
      console.error('[PDF-PARSE] Error: No se encontró texto en el PDF');
      console.error('[PDF-PARSE] Datos completos del PDF:', JSON.stringify({
        numpages: pdfData.numpages,
        text: pdfData.text,
        info: pdfData.info,
        metadata: pdfData.metadata
      }, null, 2));
      
      return NextResponse.json({
        success: false,
        text: 'Error: No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.',
        error: 'No se encontró texto en el PDF',
        debug: {
          numpages: pdfData.numpages,
          textLength: pdfData.text?.length || 0,
          hasText: !!pdfData.text,
          info: pdfData.info
        }
      });
    }
    
    console.log('[PDF-PARSE] Éxito: Texto extraído correctamente, longitud:', text.length);
    
    return NextResponse.json({
      success: true,
      text: text,
      pages: pdfData.numpages || 0,
      info: pdfData.info || {}
    });
    
  } catch (error: any) {
    console.error('[PDF-PARSE] Error parsing PDF:', error);
    console.error('[PDF-PARSE] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      toString: error.toString()
    });
    
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
        text: `Error: No se pudo extraer texto del PDF. ${error.message || 'Error desconocido'}`,
        debug: {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 500)
        }
      },
      { status: 500 }
    );
  }
}

