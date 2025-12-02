import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const N8N_CONFIG = {
  url: process.env.N8N_URL || 'https://automation.zeroazul.com/',
  apiKey: process.env.N8N_API_KEY || ''
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    
    // Aumentar límite para workflows
    const paramsObj = Object.fromEntries(searchParams);
    if (path === 'workflows' && !paramsObj.limit) {
      paramsObj.limit = '100'; // Reducido de 200 a 100
    }
    
    const response = await axios.get(`${N8N_CONFIG.url}api/v1/${path}`, {
      headers: {
        'X-N8N-API-KEY': N8N_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      params: paramsObj,
      timeout: 60000 // 60 segundos
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    const path = params.path.join('/');
    console.error('Error en n8n API:', error.message);
    console.error('URL:', `${N8N_CONFIG.url}api/v1/${path}`);
    console.error('Error completo:', error);
    
    return NextResponse.json(
      { 
        error: error.message,
        details: error.response?.data || 'No hay detalles adicionales'
      },
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
    
    const response = await axios.put(`${N8N_CONFIG.url}api/v1/${path}`, body, {
      headers: {
        'X-N8N-API-KEY': N8N_CONFIG.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    const path = params.path.join('/');
    console.error('[N8N API] Error en PUT:', error.message);
    console.error('[N8N API] URL:', `${N8N_CONFIG.url}api/v1/${path}`);
    console.error('[N8N API] Error completo:', error);
    
    return NextResponse.json(
      { 
        error: error.message,
        details: error.response?.data || 'No hay detalles adicionales'
      },
      { status: error.response?.status || 500 }
    );
  }
}

