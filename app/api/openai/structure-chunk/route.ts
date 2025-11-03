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

    // Separar campos requeridos y opcionales
    const requiredFields = fields.filter((f: any) => f.required);
    const optionalFields = fields.filter((f: any) => !f.required);
    
    const systemMessage = `Eres un asistente experto en estructurar información de documentos PDF en formato JSON.

INSTRUCCIONES CRÍTICAS:
1. Debes devolver UNICAMENTE un objeto JSON válido, sin texto adicional, sin explicaciones, sin markdown, SIN código backticks.
2. El objeto JSON DEBE contener TODOS los campos especificados, sin excepción.
3. Si un campo obligatorio no tiene información en el texto, usa el valor por defecto según su tipo.

CAMPOS OBLIGATORIOS (DEBEN estar presentes siempre):
${requiredFields.map((field: any) => `- ${field.name}: tipo ${field.type} - DEBE tener un valor. Si no hay información, usa valor por defecto.`).join('\n')}

CAMPOS OPCIONALES (incluir solo si hay información relevante):
${optionalFields.map((field: any) => `- ${field.name}: tipo ${field.type}`).join('\n')}

REGLAS CRÍTICAS DE TIPOS DE DATOS:
${fields.map((field: any) => {
  if (field.type === 'array') {
    return `- ${field.name}: DEBE ser un array JSON válido. Ejemplo: ["item1", "item2"] ✅. NUNCA usar strings como "item1, item2" ❌`;
  } else if (field.type === 'object') {
    return `- ${field.name}: DEBE ser un objeto JSON válido. Ejemplo: {"key": "value"} ✅. NUNCA usar strings ❌`;
  } else if (field.type === 'number' || field.type === 'integer') {
    return `- ${field.name}: DEBE ser un número. Ejemplo: 123 ✅. NUNCA usar strings como "123" ❌`;
  } else if (field.type === 'boolean') {
    return `- ${field.name}: DEBE ser un booleano. Ejemplo: true o false ✅. NUNCA usar strings como "true" ❌`;
  } else {
    return `- ${field.name}: DEBE ser un string. Ejemplo: "texto" ✅`;
  }
}).join('\n')}

VALORES POR DEFECTO (para campos obligatorios sin información):
- String: "" (cadena vacía)
- Array: [] (array vacío)
- Number/Integer: 0 (cero)
- Boolean: false
- Object: {} (objeto vacío)

FORMATO DE RESPUESTA:
- SOLO JSON válido, empezando con { y terminando con }
- NO incluyas texto antes o después del JSON
- NO uses markdown code blocks
- NO uses explicaciones
- Ejemplo correcto: {"campo1": "valor1", "campo2": ["item1", "item2"], "campo3": 123}`;

    const userMessage = `Analiza el siguiente texto y extrae/estructura TODA la información disponible en un objeto JSON con TODOS los campos especificados.

TEXTO A ANALIZAR:
${chunkText}

IMPORTANTE: 
- Responde SOLO con el objeto JSON, sin texto adicional.
- Incluye TODOS los campos especificados, sin excepción.
- Para campos obligatorios sin información, usa valores por defecto según el tipo.`;

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

