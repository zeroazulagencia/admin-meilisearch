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
    
    const response = await axios.get(`${MEILISEARCH_CONFIG.url}${path}`, {
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      params: Object.fromEntries(searchParams)
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
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

