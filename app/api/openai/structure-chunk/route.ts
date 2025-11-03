import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { chunkText, fields } = await request.json();
    
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

    const systemMessage = `Eres un asistente experto en estructurar información de documentos PDF en formato JSON. Tu tarea es analizar el texto proporcionado y extraer la información relevante para cada campo especificado. 

CRÍTICO - REGLAS DE TIPOS DE DATOS:
- Si un campo es de tipo "array", DEBES devolver un array JSON válido. Ejemplo: ["item1", "item2", "item3"] - NUNCA un string separado por comas
- Si encuentras una lista separada por comas en el texto, conviértela en un array JSON real
- Si un campo es de tipo "object", debes devolver un objeto JSON válido como {"key": "value"}
- Si un campo es de tipo "boolean", devuelve true o false (NUNCA strings como "true" o "false")
- Si un campo es de tipo "integer" o "number", devuelve el número directamente como número (NUNCA como string)
- Si un campo es de tipo "string", devuelve un string

VALORES POR DEFECTO:
- Si un campo es obligatorio y no encuentras información, usa valores por defecto:
  * string: "" (string vacío)
  * array: [] (array vacío)
  * object: {} (objeto vacío)
  * integer/number: 0
  * boolean: false

FORMATO DE RESPUESTA:
- Debes devolver SOLO un objeto JSON válido, sin texto adicional antes o después
- El JSON debe ser válido y parseable
- Si encuentras información pero el campo no está en la lista, no lo incluyas en el JSON
- Extrae toda la información relevante del texto, incluso si está en diferentes partes`;

    const userMessage = `Analiza el siguiente texto y estructura la información según estos campos:

CAMPOS DISPONIBLES:
${fieldsDescription}

TEXTO A ANALIZAR:
${chunkText}

Devuelve SOLO un objeto JSON con los campos especificados. Asegúrate de que:
- Los arrays sean arrays JSON reales (ej: ["item1", "item2"])
- Los objetos sean objetos JSON reales (ej: {"key": "value"})
- Los números sean números (no strings)
- Los booleanos sean true/false (no strings)
- Todos los campos obligatorios estén presentes`;

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
        temperature: 0.3
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
    let structuredData;
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
        // Campo no presente en la respuesta
        if (field.required) {
          // Valores por defecto para campos requeridos
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
          // Campos opcionales sin valor no se incluyen
          finalData[field.name] = undefined;
        }
      }
    });
    
    // Remover campos undefined
    Object.keys(finalData).forEach(key => {
      if (finalData[key] === undefined) {
        delete finalData[key];
      }
    });
    
    structuredData = finalData;

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

