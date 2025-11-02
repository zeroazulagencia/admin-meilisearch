import { NextRequest, NextResponse } from 'next/server';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Usar pdf-text-extract que es más simple y estable
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pages: number; info: any }> {
  return new Promise((resolve, reject) => {
    // @ts-ignore - pdf-text-extract no tiene tipos
    const pdfTextExtract = require('pdf-text-extract');
    
    // pdf-text-extract requiere un archivo temporal
    const tempFilePath = join(tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    
    // Escribir buffer a archivo temporal
    writeFile(tempFilePath, buffer)
      .then(() => {
        console.log('[PDF-PARSE] Archivo temporal creado:', tempFilePath);
        
        // Extraer texto del PDF
        pdfTextExtract(tempFilePath, (err: any, pages: string[]) => {
          // Limpiar archivo temporal
          unlink(tempFilePath).catch((unlinkErr: any) => {
            console.warn('[PDF-PARSE] Error eliminando archivo temporal:', unlinkErr);
          });
          
          if (err) {
            console.error('[PDF-PARSE] Error extrayendo texto:', err);
            reject(err);
            return;
          }
          
          if (!pages || pages.length === 0) {
            reject(new Error('No se encontró texto en el PDF'));
            return;
          }
          
          // Concatenar todas las páginas
          const fullText = pages.join('\n\n').trim();
          
          console.log('[PDF-PARSE] Texto extraído:', {
            pages: pages.length,
            textLength: fullText.length
          });
          
          resolve({
            text: fullText,
            pages: pages.length,
            info: {}
          });
        });
      })
      .catch((writeErr: any) => {
        console.error('[PDF-PARSE] Error escribiendo archivo temporal:', writeErr);
        reject(writeErr);
      });
  });
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
    
    console.log('[PDF-PARSE] Iniciando extracción de texto del PDF...');
    // Extraer texto usando pdf-text-extract
    const pdfData = await extractTextFromPdf(buffer);
    
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

