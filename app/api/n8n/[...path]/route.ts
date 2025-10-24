import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const N8N_CONFIG = {
  url: 'https://automation.zeroazul.com/',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MTg1NjI0Yy1hNTRhLTQ4ZGItYTUwYS0wM2JjYzQ1MmY1ZjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzExNTQzfQ.RoRE5QTzrE-K_e0FKov5apD7We_9TN4eH2Wed72PCvA'
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

