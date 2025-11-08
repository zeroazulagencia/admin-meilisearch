import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { MEILISEARCH_CONFIG } from '@/utils/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    
    // Remover parámetros de cache-busting antes de enviar a Meilisearch
    const meilisearchParams: any = {};
    searchParams.forEach((value, key) => {
      if (key !== '_t') { // Ignorar timestamp de cache-busting
        meilisearchParams[key] = value;
      }
    });
    
    const response = await axios.get(`${MEILISEARCH_CONFIG.url}${path}`, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      params: Object.keys(meilisearchParams).length > 0 ? meilisearchParams : undefined
    });

    // Agregar headers para evitar caché en la respuesta
    const responseHeaders = new Headers();
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    return NextResponse.json(response.data, { headers: responseHeaders });
  } catch (error: any) {
    console.error('Meilisearch API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params
    });
    
    return NextResponse.json(
      { 
        error: error.message,
        details: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    const response = await axios.post(`${MEILISEARCH_CONFIG.url}${path}`, body, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    // Si estamos actualizando embedders, agregar automáticamente la API key de OpenAI desde variables de entorno
    if (path.includes('/settings/embedders') && body && typeof body === 'object') {
      const embedders = body;
      const openaiApiKey = process.env.OPENAI_API_KEY || '';
      
      // Si hay un embedder de OpenAI sin API key o con API key vacía, agregarla
      Object.keys(embedders).forEach(key => {
        const embedder = embedders[key];
        if (embedder && (embedder.source === 'openAi' || embedder.source === 'openai')) {
          if (!embedder.apiKey || embedder.apiKey === '') {
            embedder.apiKey = openaiApiKey;
          }
        }
      });
    }
    
    // Para settings usar PATCH, para documentos usar PUT
    const isSettingsPath = path.includes('/settings');
    const method = isSettingsPath ? 'patch' : 'put';
    
    const response = await axios[method](`${MEILISEARCH_CONFIG.url}${path}`, body, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    const response = await axios.put(`${MEILISEARCH_CONFIG.url}${path}`, body, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    
    const response = await axios.delete(`${MEILISEARCH_CONFIG.url}${path}`, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

