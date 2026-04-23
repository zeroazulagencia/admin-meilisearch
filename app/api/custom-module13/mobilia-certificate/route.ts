import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') || '2025';
    const documentCode = searchParams.get('documentCode');
    
    const [rows] = await query<any>(
      'SELECT config_value FROM modulos_mobilia_14_config WHERE config_key = "mobilia_token"',
      []
    );
    
    const token = rows?.[0]?.config_value;
    const apiUrl = 'http://bienraiz.mbp.com.co/bienraiz-mobilia/ws';
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token no generado' }, { status: 400 });
    }
    
    const url = `${apiUrl}/MiAcrecer?operation=getIncomeCertificate&year=${year}&documentCode=${documentCode}&enableSendingIncomeCertificate=false`;
    
    try {
      const mobiliaRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      
      const status = mobiliaRes.status;
      const contentType = mobiliaRes.headers.get('content-type') || '';
      const contentLength = mobiliaRes.headers.get('content-length');
      
      if (status === 204 || contentLength === '0' || !contentLength) {
        return NextResponse.json({ 
          ok: true, 
          result: 'no_certificate',
          mobilia: { status, contentType, contentLength },
          message: 'No existe certificado'
        });
      }
      
      if (contentType.includes('pdf') || status === 200) {
        const buffer = await mobiliaRes.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificado_${documentCode}_${year}.pdf"`,
          },
        });
      }
      
      const text = await mobiliaRes.text();
      return NextResponse.json({ 
        ok: true, 
        mobilia: { status, contentType, contentLength, body: text } 
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}