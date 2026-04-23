import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation');
    const year = searchParams.get('year') || '2025';
    const documentCode = searchParams.get('documentCode');
    const enableSendingIncomeCertificate = searchParams.get('enableSendingIncomeCertificate') === 'true';
    
    const [rows] = await query<any>(
      'SELECT config_value FROM modulos_mobilia_14_config WHERE config_key = "mobilia_token"',
      []
    );
    
    const token = rows?.[0]?.config_value;
    const apiUrl = 'http://bienraiz.mbp.com.co/bienraiz-mobilia/ws';
    
    console.log('[CERTIFICATE] Token from query:', token ? 'exists' : 'missing', token?.substring(0, 20));
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token no configurado. Genera uno primero.' }, { status: 400 });
    }
    
    const url = `${apiUrl}/MiAcrecer?operation=getIncomeCertificate&year=${year}&documentCode=${documentCode}&enableSendingIncomeCertificate=${enableSendingIncomeCertificate}`;
    
    console.log('[CERTIFICATE] Calling:', url);
    
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log('[CERTIFICATE] Response status:', response.status);
      console.log('[CERTIFICATE] Content-Type:', response.headers.get('content-type'));
      console.log('[CERTIFICATE] Content-Length:', response.headers.get('content-length'));
      
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return NextResponse.json({ 
          ok: true, 
          message: 'Certificado Procesado',
          note: 'El certificado se ha procesado exitosamente. Returns 204 Empty desde Mobilia API.'
        });
      }
      
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificado_${documentCode}_${year}.pdf"`,
        },
      });
    } catch (e: any) {
      console.error('[CERTIFICATE] Fetch error:', e.message);
      return NextResponse.json({ ok: false, error: 'Error al llamar API: ' + e.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}