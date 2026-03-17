import { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN = '723462523478hjkweghk892874771234';
const API_BASE = 'https://tarjetav.co/api/birthday';
const API_AUTH = 'Basic YXV0b2xhcnRlQHplcm9henVsLmNvbTpaZXJvMTIzKg==';
const CORS_ORIGIN = 'https://intranet.autolarte.com.co';

function withCors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', CORS_ORIGIN);
  return res;
}

export async function OPTIONS() {
  return withCors(
    new NextResponse(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' },
    })
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token || token !== ACCESS_TOKEN) {
    return withCors(NextResponse.json({ error: 'Token requerido o inválido' }, { status: 403 }));
  }

  // Usar mes del query o el mes actual (America/Bogota)
  const mesParam = searchParams.get('mes');
  const mes = mesParam
    ? String(mesParam).padStart(2, '0')
    : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
        .getMonth() + 1 < 10
      ? `0${new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).getMonth() + 1}`
      : `${new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).getMonth() + 1}`;

  try {
    const res = await fetch(`${API_BASE}/${mes}`, {
      headers: {
        Authorization: API_AUTH,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return withCors(
        NextResponse.json(
          { error: 'Error obteniendo la información de cumpleaños' },
          { status: 500 }
        )
      );
    }

    const empleados: any[] = await res.json();

    const empleadosMap = empleados.reduce((acc: any, emp: any) => {
      acc[emp.id] = {
        datos_personales: {
          nombre_completo: emp.name,
          fecha_nacimiento: emp.birthday,
        },
        contratos: [],
      };
      return acc;
    }, {});

    return withCors(
      NextResponse.json({
        cantidad_registros: empleados.length,
        empleados: [empleadosMap],
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        { error: 'Error obteniendo la información de cumpleaños' },
        { status: 500 }
      )
    );
  }
}
