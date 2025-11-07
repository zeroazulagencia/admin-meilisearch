import { NextRequest, NextResponse } from 'next/server';

// Función para convertir HTML a Markdown simple
function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Remover scripts y estilos
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convertir headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Convertir párrafos
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Convertir listas
  markdown = markdown.replace(/<ul[^>]*>/gi, '');
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '');
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Convertir links
  markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Eliminar imágenes (no convertir a markdown)
  markdown = markdown.replace(/<img[^>]*>/gi, '');
  
  // Convertir texto en negrita
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  
  // Convertir texto en cursiva
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Convertir código
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```');
  
  // Convertir blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1');
  
  // Remover tags HTML restantes
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Decodificar entidades HTML
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  
  // Limpiar espacios múltiples y saltos de línea
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/[ \t]+/g, ' ');
  markdown = markdown.trim();
  
  return markdown;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ninguna URL' },
        { status: 400 }
      );
    }
    
    // Validar que sea una URL válida
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL inválida' },
        { status: 400 }
      );
    }
    
    console.log('[WEB-PARSE] Iniciando parseo de URL:', url);
    
    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
    
    // Hacer fetch de la URL con configuración mejorada
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('[WEB-PARSE] Error en fetch:', fetchError);
      
      let errorMessage = 'Error de conexión';
      if (fetchError.name === 'AbortError') {
        errorMessage = 'La solicitud tardó demasiado. Intenta con otra URL o verifica tu conexión.';
      } else if (fetchError.message) {
        errorMessage = fetchError.message;
      } else if (fetchError.cause) {
        errorMessage = fetchError.cause.message || 'Error de conexión';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Error al obtener la URL: ${errorMessage}. Verifica que la URL sea accesible públicamente y no requiera autenticación.` 
        },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Error al obtener la URL: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const html = await response.text();
    console.log('[WEB-PARSE] HTML obtenido, longitud:', html.length);
    
    // Extraer contenido principal (intentar encontrar el contenido más relevante)
    let content = html;
    
    // Intentar extraer el contenido del body o main
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    }
    
    // Intentar extraer contenido de article, main, o content
    const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      content = articleMatch[1];
    } else {
      const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) {
        content = mainMatch[1];
      }
    }
    
    // Convertir HTML a Markdown
    const markdown = htmlToMarkdown(content);
    
    console.log('[WEB-PARSE] Markdown generado, longitud:', markdown.length);
    
    if (!markdown || markdown.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo extraer contenido de la URL' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      markdown: markdown,
      url: url
    });
    
  } catch (error: any) {
    console.error('[WEB-PARSE] Error parsing web:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al procesar la URL',
        markdown: `Error: No se pudo obtener el contenido de la URL. ${error.message || 'Error desconocido'}`
      },
      { status: 500 }
    );
  }
}

