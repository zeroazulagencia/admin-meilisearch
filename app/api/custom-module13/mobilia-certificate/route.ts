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
      
      const buffer = await mobiliaRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const startsWithPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      
      if (startsWithPdf) {
        await query(
          `INSERT INTO modulos_mobilia_14_logs (log_data) VALUES (?)`,
          [JSON.stringify({ type: 'pdf_download', documentCode, year, status, contentType, size: buffer.byteLength })]
        );
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificado_${documentCode}_${year}.pdf"`,
          },
        });
      }
      
      if (status === 204 || buffer.byteLength === 0) {
        await query(
          `INSERT INTO modulos_mobilia_14_logs (log_data) VALUES (?)`,
          [JSON.stringify({ type: 'no_certificate', documentCode, year, status, contentType })]
        );
        return NextResponse.json({ 
          ok: true, 
          result: 'no_certificate',
          mobilia: { status, contentType, size: buffer.byteLength },
          message: 'No existe certificado'
        });
      }
      
      await query(
        `INSERT INTO modulos_mobilia_14_logs (log_data) VALUES (?)`,
        [JSON.stringify({ type: 'response', documentCode, year, status, contentType, size: buffer.byteLength })]
      );
      return NextResponse.json({ 
        ok: true, 
        result: 'response_received',
        mobilia: { status, contentType, size: buffer.byteLength },
        message: 'Respuesta recibida'
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}