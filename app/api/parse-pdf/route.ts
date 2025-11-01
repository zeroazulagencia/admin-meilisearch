import { NextRequest, NextResponse } from 'next/server';

// Importar pdf-parse usando require para compatibilidad con Node.js
function loadPdfParse() {
  try {
    // @ts-ignore - pdf-parse no tiene tipos de TypeScript adecuados
    const pdfParse = require('pdf-parse');
    
    console.log('[PDF-PARSE] pdf-parse cargado:', {
      type: typeof pdfParse,
      isFunction: typeof pdfParse === 'function',
      hasDefault: pdfParse && typeof pdfParse.default === 'function'
    });
    
    // pdf-parse exporta directamente como función en versiones recientes
    if (typeof pdfParse === 'function') {
      console.log('[PDF-PARSE] pdf-parse es función directa');
      return pdfParse;
    }
    
    // Si tiene default (para compatibilidad)
    if (pdfParse && typeof pdfParse.default === 'function') {
      console.log('[PDF-PARSE] pdf-parse está en default');
      return pdfParse.default;
    }
    
    // Buscar cualquier función en el objeto
    if (pdfParse && typeof pdfParse === 'object') {
      for (const key of Object.keys(pdfParse)) {
        if (typeof pdfParse[key] === 'function') {
          console.log('[PDF-PARSE] Encontrada función en clave:', key);
          return pdfParse[key];
        }
      }
    }
    
    console.error('[PDF-PARSE] No se encontró función válida en pdf-parse:', pdfParse);
    throw new Error('pdf-parse no exporta una función válida');
  } catch (error: any) {
    console.error('[PDF-PARSE] Error cargando pdf-parse:', error);
    console.error('[PDF-PARSE] Error stack:', error.stack);
    throw new Error(`No se pudo cargar pdf-parse: ${error.message || error}`);
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
    
    console.log('[PDF-PARSE] Convirtiendo archivo a buffer...');
    // Convertir archivo a buffer (pdf-parse funciona con Buffer)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('[PDF-PARSE] Buffer creado:', {
      bufferLength: buffer.length,
      bufferType: buffer.constructor.name,
      firstBytes: buffer.slice(0, 20).toString('hex')
    });
    
    console.log('[PDF-PARSE] Cargando función de parseo...');
    // Cargar pdf-parse
    const pdfParseFunc = loadPdfParse();
    
    console.log('[PDF-PARSE] Función de parseo cargada:', {
      type: typeof pdfParseFunc,
      isFunction: typeof pdfParseFunc === 'function',
      name: pdfParseFunc?.name || 'anonymous'
    });
    
    if (typeof pdfParseFunc !== 'function') {
      console.error('[PDF-PARSE] ERROR: pdf-parse no es una función:', pdfParseFunc);
      throw new Error(`pdf-parse no es una función, es: ${typeof pdfParseFunc}`);
    }
    
    console.log('[PDF-PARSE] Iniciando parseo del PDF...');
    // Parsear PDF usando pdf-parse
    const pdfData = await pdfParseFunc(buffer);
    
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

