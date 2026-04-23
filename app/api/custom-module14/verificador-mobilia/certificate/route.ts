import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation');
    const year = searchParams.get('year');
    const documentCode = searchParams.get('documentCode');
    const enableSendingIncomeCertificate = searchParams.get('enableSendingIncomeCertificate') !== 'false';
    
    const [rows] = await query<any>(
      'SELECT config_value FROM modulos_mobilia_14_config WHERE config_key IN ("mobilia_token", "mobilia_api_url")',
      []
    );
    
    const config: Record<string, string> = {};
    for (const row of rows || []) {
      config[row.config_key] = row.config_value;
    }
    
    const token = config.mobilia_token;
    const apiUrl = config.mobilia_api_url;
    
    if (!token || !apiUrl) {
      return NextResponse.json({ ok: false, error: 'Token o URL no configurados' }, { status: 400 });
    }
    
    if (operation === 'getIncomeCertificate') {
      const url = `${apiUrl}/MiAcrecer?operation=getIncomeCertificate&year=${year}&documentCode=${documentCode}&enableSendingIncomeCertificate=${enableSendingIncomeCertificate}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      return NextResponse.json({ ok: true, data });
    }
    
    return NextResponse.json({ ok: false, error: 'Operación no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}