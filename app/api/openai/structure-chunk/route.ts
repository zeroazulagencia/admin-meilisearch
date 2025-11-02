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

IMPORTANTE:
- Debes devolver SOLO un objeto JSON válido, sin texto adicional antes o después
- Si un campo es de tipo "array", debes devolver un array JSON, no un string
- Si un campo es de tipo "object", debes devolver un objeto JSON válido
- Si un campo es de tipo "boolean", devuelve true o false (no strings)
- Si un campo es de tipo "integer" o "number", devuelve el número directamente (no string)
- Si un campo es obligatorio y no encuentras información, usa un valor por defecto apropiado (string vacío para strings, [] para arrays, {} para objects, 0 para números, false para boolean)
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

