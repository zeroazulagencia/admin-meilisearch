import { NextRequest, NextResponse } from 'next/server';

// Prefer OpenRouter (workers already has a working key). Fallback to OpenAI.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { data, nodeName, isError } = await request.json();

    const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    let systemMessage = '';
    let userMessage = '';

    if (isError) {
      systemMessage =
        'Eres un asistente técnico que explica errores de n8n de forma clara y profesional en español. Sé específico con los datos reales: nombres, valores, IDs. Explica qué salió mal y cómo solucionarlo de forma directa.';
      userMessage = `El nodo "${nodeName}" en n8n falló con este error. Analízalo y explícalo de forma clara y directa, mencionando los datos específicos:\n\n${dataString}`;
    } else {
      systemMessage =
        'Eres un asistente técnico que explica qué hace cada nodo de n8n de forma clara y profesional en español. Describe qué datos procesó el nodo, mencionando nombres de usuarios, mensajes, valores específicos, y cómo contribuye al flujo. Si es un agente de IA, explica qué información procesó y cómo la interpretó. Sé directo y claro.';
      userMessage = `El nodo "${nodeName}" en n8n ejecutó exitosamente estos datos. Explica qué significa esta respuesta de forma clara y directa, mencionando los datos específicos como nombres, mensajes, valores, etc.:\n\n${dataString}`;
    }

    const useOpenRouter = Boolean(OPENROUTER_API_KEY);
    const endpoint = useOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-3.5-turbo';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key de IA no configurada en workers' },
        { status: 500 },
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(useOpenRouter
          ? {
              'HTTP-Referer': 'https://workers.zeroazul.com',
              'X-Title': 'DWORKERS Explain',
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI explain upstream error', response.status, errText.slice(0, 300));
      throw new Error(`AI API error (${response.status})`);
    }

    const responseData = await response.json();
    const explanation =
      responseData.choices?.[0]?.message?.content ||
      'No se pudo generar una explicación';

    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error('Error explaining with AI:', error);
    return NextResponse.json(
      { error: error.message || 'Error al explicar con IA' },
      { status: 500 },
    );
  }
}
