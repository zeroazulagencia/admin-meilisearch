import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { chunkText, fields } = await request.json();
    
    console.log('[OPENAI-STRUCTURE] Recibiendo solicitud:', {
      chunkTextLength: chunkText?.length || 0,
      fieldsCount: fields?.length || 0,
      requiredFields: fields?.filter((f: any) => f.required).length || 0
    });
    
    if (!chunkText || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'chunkText y fields son requeridos' },
        { status: 400 }
      );
    }

    // Construir descripción de campos para el prompt
    const fieldsDescription = fields.map((field: any) => {
      let desc = `- ${field.name} (${field.type})`;
      if (field.required) {
        desc += ' [OBLIGATORIO]';
      }
      return desc;
    }).join('\n');

    // Separar campos requeridos y opcionales
    const requiredFields = fields.filter((f: any) => f.required);
    const optionalFields = fields.filter((f: any) => !f.required);
    
    // Buscar patrones comunes en el texto para ayudar a OpenAI
    const categoriaMatch = chunkText.match(/CATEGORIA:\s*(.+?)(?:\n|$)/i);
    const productoMatch = chunkText.match(/PRODUCTO:\s*(.+?)(?:\n|$)/i);
    const palabrasMatch = chunkText.match(/PALABRAS[:\s]*(.+?)(?:\n|$)/i);
    
    // Separar campos requeridos y opcionales para mejor formato
    const requiredFieldsList = fields.filter((f: any) => f.required);
    const optionalFieldsList = fields.filter((f: any) => !f.required);
    
    const systemMessage = `Eres un asistente experto en extraer información estructurada de documentos de productos.

TU TAREA:
Analizar el texto proporcionado y extraer información específica para cada campo solicitado.

REGLAS ABSOLUTAS CRÍTICAS:
1. Debes devolver UNICAMENTE un objeto JSON válido. NADA más, sin texto, sin explicaciones, sin markdown.
2. El objeto JSON DEBE contener TODOS los campos listados abajo, sin excepción.
3. ⚠️ CAMPOS OBLIGATORIOS: NO pueden estar vacíos, null, undefined o faltar. SIEMPRE deben tener un valor válido según su tipo.
4. Si un campo obligatorio no tiene información directa en el texto, DEBES INFERIR un valor apropiado del contexto o usar el valor por defecto especificado.
5. Los campos opcionales pueden omitirse si no hay información relevante.

CAMPOS OBLIGATORIOS (DEBEN TENER VALOR SIEMPRE):
${requiredFieldsList.map((field: any) => {
  let hint = '';
  let formatHint = '';
  
  // Agregar pistas sobre dónde buscar la información
  if (field.name.toLowerCase().includes('categoria')) {
    hint = ' - Busca líneas que digan "CATEGORIA:" o "Categoría:"';
  } else if (field.name.toLowerCase().includes('producto')) {
    hint = ' - Busca líneas que digan "PRODUCTO:" o "Producto:"';
  } else if (field.name.toLowerCase().includes('descripcion')) {
    hint = ' - Busca secciones que digan "DESCRIPCION:" o "Descripción:" o "DESCRIPCIÓN:"';
  } else if (field.name.toLowerCase().includes('palabra')) {
    hint = ' - Busca secciones que digan "PALABRAS:" o "ASOCIACIONES:" o listas separadas por comas';
  } else if (field.name.toLowerCase().includes('indicacion')) {
    hint = ' - Busca secciones que digan "INDICACIONES:" o "USO:" o "Instrucciones:"';
  } else if (field.name.toLowerCase().includes('textura')) {
    hint = ' - Busca líneas que digan "TEXTURA:" o "Consistencia:"';
  } else if (field.name.toLowerCase().includes('edad') || field.name.toLowerCase().includes('momento')) {
    hint = ' - Busca secciones que digan "EDAD:" o "MOMENTO:" o "Para:"';
  } else if (field.name.toLowerCase().includes('condicion')) {
    hint = ' - Busca secciones que digan "CONTRAINDICACIONES:" o "CONDICIONES:"';
  } else if (field.name.toLowerCase().includes('necesidad')) {
    hint = ' - Busca secciones que digan "NECESIDADES:" o "INTERESES:"';
  }
  
  // Agregar formato específico según el tipo
  if (field.type === 'array') {
    formatHint = ' - FORMATO: Array JSON ["item1", "item2"]. Si no encuentras lista, usa []. NUNCA null o undefined.';
  } else if (field.type === 'object') {
    formatHint = ' - FORMATO: Objeto JSON {"key": "value"}. Si no encuentras datos, usa {}. NUNCA null o undefined.';
  } else if (field.type === 'number' || field.type === 'integer') {
    formatHint = ' - FORMATO: Número (ej: 123). Si no encuentras número, usa 0. NUNCA null, undefined o string vacío.';
  } else if (field.type === 'boolean') {
    formatHint = ' - FORMATO: true o false. Si no encuentras indicación, usa false. NUNCA null o undefined.';
  } else {
    formatHint = ' - FORMATO: String con texto. Si no encuentras información, INFIERE del contexto o usa "". NUNCA null o undefined.';
  }
  
  return `- ${field.name} (${field.type}): ⚠️ OBLIGATORIO${hint}${formatHint}`;
}).join('\n')}

CAMPOS OPCIONALES (incluir solo si hay información relevante):
${optionalFieldsList.map((field: any) => {
  return `- ${field.name} (${field.type}): Opcional`;
}).join('\n')}

REGLAS DE TIPOS DE DATOS:
${fields.map((field: any) => {
  if (field.type === 'array') {
    return `- ${field.name}: DEBE ser un array JSON. Si encuentras lista separada por comas, conviértela a array. Ejemplo: ["item1", "item2"] ✅ NO: "item1, item2" ❌`;
  } else if (field.type === 'object') {
    return `- ${field.name}: DEBE ser un objeto JSON. Ejemplo: {"key": "value"} ✅`;
  } else if (field.type === 'number' || field.type === 'integer') {
    return `- ${field.name}: DEBE ser un número. Ejemplo: 123 ✅ NO: "123" ❌`;
  } else if (field.type === 'boolean') {
    return `- ${field.name}: DEBE ser true o false. NO strings.`;
  } else {
    return `- ${field.name}: DEBE ser un string con la información extraída del texto.`;
  }
}).join('\n')}

INSTRUCCIONES DE EXTRACCIÓN:
1. Lee TODO el texto cuidadosamente
2. Para cada campo, busca la sección relevante en el texto
3. Extrae la información específica, no todo el texto
4. Si un campo obligatorio no tiene información clara, usa tu mejor juicio o valor por defecto
5. Para campos opcionales, inclúyelos solo si encuentras información relevante

VALORES POR DEFECTO PARA CAMPOS OBLIGATORIOS (usar SOLO si no encuentras información):
- String: "" (cadena vacía) - PERO intenta INFERIR del contexto antes de usar vacío
- Array: [] (array vacío) - PERO intenta extraer lista del texto antes de usar vacío
- Number/Integer: 0 - PERO intenta encontrar número en el texto antes de usar 0
- Boolean: false - PERO intenta inferir del contexto antes de usar false
- Object: {} - PERO intenta extraer datos estructurados antes de usar vacío

⚠️ IMPORTANTE: Los campos marcados como OBLIGATORIOS DEBEN aparecer SIEMPRE en el JSON con un valor válido según su tipo. 
NO uses null, undefined, o omitas campos obligatorios. Si no encuentras información directa, INFIERE del contexto del texto.`;

    const userMessage = `Extrae la información del siguiente texto y estructura en un objeto JSON con TODOS los campos especificados.

⚠️ RECUERDA: Los campos marcados como OBLIGATORIOS deben tener SIEMPRE un valor válido. No pueden estar vacíos, null o undefined.

TEXTO:
${chunkText}

Responde SOLO con el objeto JSON, sin texto adicional. Incluye TODOS los campos listados, especialmente los obligatorios con valores válidos.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices[0]?.message?.content || '{}';
    
    // Intentar parsear el JSON
    let structuredData: Record<string, any>;
    try {
      structuredData = JSON.parse(content);
    } catch (parseError) {
      // Si falla el parseo, intentar extraer JSON del texto
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON válido de la respuesta');
      }
    }

    // Asegurar que TODOS los campos estén presentes con valores por defecto si faltan
    const finalData: Record<string, any> = {};
    
    fields.forEach((field: any) => {
      if (structuredData.hasOwnProperty(field.name)) {
        let value = structuredData[field.name];
        
        // Normalizar según el tipo esperado
        if (field.type === 'array') {
          if (Array.isArray(value)) {
            finalData[field.name] = value;
          } else if (typeof value === 'string') {
            // Intentar parsear como JSON primero
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                finalData[field.name] = parsed;
              } else {
                // Si no es JSON válido, tratar como string separado por comas
                finalData[field.name] = value.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
              }
            } catch {
              // Si no es JSON válido, tratar como string separado por comas
              finalData[field.name] = value.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
            }
          } else {
            // Si no es array ni string, convertir a array
            finalData[field.name] = [String(value)];
          }
        } else if (field.type === 'integer') {
          if (typeof value === 'number') {
            finalData[field.name] = Math.floor(value);
          } else if (typeof value === 'string') {
            const num = parseInt(value, 10);
            finalData[field.name] = isNaN(num) ? (field.required ? 0 : undefined) : num;
          } else {
            finalData[field.name] = field.required ? 0 : undefined;
          }
        } else if (field.type === 'number') {
          if (typeof value === 'number') {
            finalData[field.name] = value;
          } else if (typeof value === 'string') {
            const num = parseFloat(value);
            finalData[field.name] = isNaN(num) ? (field.required ? 0 : undefined) : num;
          } else {
            finalData[field.name] = field.required ? 0 : undefined;
          }
        } else if (field.type === 'boolean') {
          if (typeof value === 'boolean') {
            finalData[field.name] = value;
          } else if (typeof value === 'string') {
            finalData[field.name] = value.toLowerCase() === 'true' || value === '1';
          } else {
            finalData[field.name] = field.required ? false : undefined;
          }
        } else if (field.type === 'object') {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            finalData[field.name] = value;
          } else if (typeof value === 'string') {
            try {
              finalData[field.name] = JSON.parse(value);
            } catch {
              finalData[field.name] = field.required ? {} : undefined;
            }
          } else {
            finalData[field.name] = field.required ? {} : undefined;
          }
        } else {
          // String o tipo desconocido
          finalData[field.name] = String(value || '');
        }
      } else {
        // Campo no presente en la respuesta de OpenAI
        if (field.required) {
          // Intentar extraer del texto usando patrones comunes antes de usar valor por defecto
          let extractedValue: string | undefined = undefined;
          
          // Buscar en el texto del chunk
          const fieldNameLower = field.name.toLowerCase();
          
          if (fieldNameLower.includes('categoria')) {
            const match = chunkText.match(/CATEGORIA:\s*(.+?)(?:\n|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('producto')) {
            const match = chunkText.match(/PRODUCTO:\s*(.+?)(?:\n|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('descripcion')) {
            const match = chunkText.match(/DESCRIPCION[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('palabra') || fieldNameLower.includes('clave')) {
            const match = chunkText.match(/PALABRAS[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) {
              const palabras = match[1].split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
              if (palabras.length > 0) {
                finalData[field.name] = palabras;
                extractedValue = undefined; // Marcar como ya procesado
              }
            }
          } else if (fieldNameLower.includes('indicacion')) {
            const match = chunkText.match(/INDICACIONES[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('textura')) {
            const match = chunkText.match(/TEXTURA:\s*(.+?)(?:\n|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('edad') || fieldNameLower.includes('momento')) {
            const match = chunkText.match(/EDAD[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('condicion')) {
            const match = chunkText.match(/CONDICIONES[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) extractedValue = match[1].trim();
          } else if (fieldNameLower.includes('necesidad')) {
            const match = chunkText.match(/NECESIDADES[:\s]*([\s\S]+?)(?:\n\n|3\.1\.|$)/i);
            if (match) extractedValue = match[1].trim();
          }
          
          if (extractedValue && field.type === 'string') {
            finalData[field.name] = extractedValue;
          } else if (fieldNameLower.includes('palabra') || fieldNameLower.includes('clave') || fieldNameLower.includes('tag')) {
            // Ya procesado arriba, usar array vacío si no se encontró
            if (!finalData[field.name]) {
              finalData[field.name] = [];
            }
          } else {
            // Valores por defecto para campos requeridos - NUNCA null o undefined
            if (field.type === 'array') {
              finalData[field.name] = [];
            } else if (field.type === 'object') {
              finalData[field.name] = {};
            } else if (field.type === 'boolean') {
              finalData[field.name] = false;
            } else if (field.type === 'integer' || field.type === 'number') {
              finalData[field.name] = 0;
            } else {
              // Para strings, usar cadena vacía en lugar de null/undefined
              finalData[field.name] = '';
            }
          }
        } else {
          // Campos opcionales sin valor no se incluyen
          finalData[field.name] = undefined;
        }
      }
    });
    
    // VALIDACIÓN FINAL: Asegurar que todos los campos obligatorios tengan valores válidos
    fields.forEach((field: any) => {
      if (field.required) {
        if (!finalData.hasOwnProperty(field.name) || 
            finalData[field.name] === null || 
            finalData[field.name] === undefined) {
          // Campo obligatorio faltante o con valor inválido
          console.warn(`[OPENAI-STRUCTURE] Campo obligatorio "${field.name}" faltante o inválido, asignando valor por defecto`);
          
          if (field.type === 'array') {
            finalData[field.name] = [];
          } else if (field.type === 'object') {
            finalData[field.name] = {};
          } else if (field.type === 'boolean') {
            finalData[field.name] = false;
          } else if (field.type === 'integer' || field.type === 'number') {
            finalData[field.name] = 0;
          } else {
            finalData[field.name] = '';
          }
        } else {
          // Validar que el valor no esté vacío según el tipo
          const value = finalData[field.name];
          const isEmpty = (field.type === 'string' && value === '') ||
                         (field.type === 'array' && (!Array.isArray(value) || value.length === 0)) ||
                         (field.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0));
          
          if (isEmpty) {
            console.warn(`[OPENAI-STRUCTURE] Campo obligatorio "${field.name}" está vacío, asignando valor por defecto`);
            
            if (field.type === 'array') {
              finalData[field.name] = [];
            } else if (field.type === 'object') {
              finalData[field.name] = {};
            } else {
              finalData[field.name] = '';
            }
          }
        }
      }
    });
    
    // Remover campos undefined (solo opcionales)
    Object.keys(finalData).forEach(key => {
      const field = fields.find((f: any) => f.name === key);
      if (finalData[key] === undefined && (!field || !field.required)) {
        delete finalData[key];
      }
    });
    
    structuredData = finalData;
    
    console.log('[OPENAI-STRUCTURE] Resultado final:', {
      fieldsCount: Object.keys(structuredData).length,
      fields: Object.keys(structuredData),
      sampleValues: Object.keys(structuredData).slice(0, 5).reduce((acc, key) => {
        acc[key] = typeof structuredData[key] === 'string' 
          ? structuredData[key].substring(0, 50) 
          : structuredData[key];
        return acc;
      }, {} as Record<string, any>)
    });

    return NextResponse.json({ 
      success: true,
      structuredData 
    });
  } catch (error: any) {
    console.error('Error estructurando chunk con OpenAI:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al estructurar chunk con IA',
        structuredData: null
      },
      { status: 500 }
    );
  }
}

