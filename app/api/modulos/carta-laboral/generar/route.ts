import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { jsPDF } from 'jspdf';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CARTAS_DIR = join(process.cwd(), 'cartas-pdf', 'autolarte');

async function getConfig(): Promise<Record<string, string>> {
  const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_lucas_9_config');
  return Object.fromEntries(rows.map((r: any) => [r.config_key, r.config_value]));
}

async function getSighaToken(config: Record<string, string>): Promise<string> {
  const res = await fetch(config.sigha_login_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.sigha_email, clave: config.sigha_clave }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('No se pudo obtener token de sigha.com.co');
  return data.token;
}

async function getEmpleado(config: Record<string, string>, token: string, nit: string): Promise<any> {
  const params = new URLSearchParams({
    datos_generales: '',
    nit_cliente: config.sigha_nit_cliente,
    incluir_retirados: 'S',
    desde_que_fecha: '2023-01-01',
    nit_empleado: nit,
  });
  const res = await fetch(`${config.sigha_empleados_url}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'Accept-Charset': 'UTF-8' },
  });
  const text = await res.text();
  const clean = text.replace(/[^\x20-\x7F\xC0-\xFF]/g, '');
  const data = JSON.parse(clean);
  if (!data.empleados || data.empleados.length === 0) throw new Error('Empleado no encontrado para el NIT indicado');
  return data.empleados[0][nit];
}

function numeroAMes(n: number): string {
  return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][n - 1];
}

function formatearSalario(valor: number): string {
  return new Intl.NumberFormat('es-CO').format(valor);
}

async function generarPDF(empleado: any, nit: string, config: Record<string, string>): Promise<string> {
  const personal = empleado.datos_personales;
  const contrato = empleado.contratos[0][Object.keys(empleado.contratos[0])[0]].datos_contrato;

  const hoy = new Date();
  const fecha = `Medellin, ${hoy.getDate()} de ${numeroAMes(hoy.getMonth() + 1)} de ${hoy.getFullYear()}`;
  const fechaIngreso = new Date(contrato.fecha_ingreso).toLocaleDateString('es-CO');
  const salario = formatearSalario(contrato.salario_mes);

  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const margin = 25;
  const width = 216 - margin * 2;
  let y = 20;

  // Logo
  try {
    const logoRes = await fetch(`https://workers.zeroazul.com/${config.logo_path}`);
    if (logoRes.ok) {
      const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
      const logoB64 = logoBuffer.toString('base64');
      doc.addImage(logoB64, 'PNG', margin, y, 50, 18);
    }
  } catch {}
  y += 28;

  // Fecha
  doc.setFontSize(11);
  doc.text(fecha, 216 - margin, y, { align: 'right' });
  y += 16;

  // Titulo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICACION LABORAL', 216 / 2, y, { align: 'center' });
  y += 14;

  // Parrafo 1
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const p1 = 'La empresa AUTOLARTE S.A., identificada con NIT 890.900.081, certifica que:';
  const p1Lines = doc.splitTextToSize(p1, width);
  doc.text(p1Lines, margin, y);
  y += p1Lines.length * 7 + 6;

  // Parrafo empleado
  const textoEmpleado = `${personal.nombre_completo}, identificado(a) con ${personal.tipo_documento} No. ${personal.numero_documento}, hace parte de nuestra empresa desde el ${fechaIngreso} hasta la fecha, ocupando el cargo de ${contrato.desc_cargo} con contrato de tipo ${String(contrato.tipo_contrato).toLowerCase()} y un salario mensual de $${salario} pesos colombianos.`;
  const empLines = doc.splitTextToSize(textoEmpleado, width);
  doc.text(empLines, margin, y);
  y += empLines.length * 7 + 10;

  // Parrafo final
  const p3 = 'Este certificado se expide a solicitud del interesado para los fines que este estime convenientes.';
  const p3Lines = doc.splitTextToSize(p3, width);
  doc.text(p3Lines, margin, y);
  y += p3Lines.length * 7 + 14;

  // Saludo
  doc.text('Cordialmente,', margin, y);
  y += 8;

  // Firma
  try {
    const firmaRes = await fetch(config.firma_imagen_url);
    if (firmaRes.ok) {
      const firmaBuffer = Buffer.from(await firmaRes.arrayBuffer());
      const firmaB64 = firmaBuffer.toString('base64');
      doc.addImage(firmaB64, 'JPEG', margin, y, 45, 16);
      y += 20;
    }
  } catch {}

  // Nombre firmante
  doc.setFont('helvetica', 'bold');
  doc.text(config.firma_nombre, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(config.firma_cargo, margin, y);
  y += 7;
  doc.text('AUTOLARTE S.A.', margin, y);

  // Guardar
  if (!existsSync(CARTAS_DIR)) mkdirSync(CARTAS_DIR, { recursive: true });
  const filePath = join(CARTAS_DIR, `${nit}.pdf`);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  writeFileSync(filePath, pdfBuffer);
  return filePath;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nit = body.nit || new URL(req.url).searchParams.get('nit');
    if (!nit) return NextResponse.json({ status: 'error', message: 'El parametro nit es requerido' }, { status: 400 });

    const config = await getConfig();
    const token = await getSighaToken(config);
    const empleado = await getEmpleado(config, token, nit);

    const personal = empleado.datos_personales;
    const nombreCompleto = personal.nombre_completo;
    const email = personal.mail || '';

    await generarPDF(empleado, nit, config);

    // Log en DB
    const contrato = empleado.contratos[0][Object.keys(empleado.contratos[0])[0]].datos_contrato;
    await query(
      `INSERT INTO modulos_lucas_9_cartas 
        (empleado_nombre, empleado_cedula, empleado_cargo, empleado_salario, empleado_tipo_contrato, empleado_fecha_ingreso, carta_generada_por, estado, solicitado_via)
       VALUES (?, ?, ?, ?, ?, ?, 'IA', 'generada', 'api')
       ON DUPLICATE KEY UPDATE estado='generada', empleado_nombre=VALUES(empleado_nombre), updated_at=NOW()`,
      [nombreCompleto, nit, contrato.desc_cargo, contrato.salario_mes, contrato.tipo_contrato, contrato.fecha_ingreso]
    );

    const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://workers.zeroazul.com'}/api/modulos/carta-laboral/pdf?nit=${nit}`;

    return NextResponse.json({
      status: 'ok',
      message: 'Carta laboral generada correctamente',
      nit_consultado: nit,
      nombre_completo: nombreCompleto,
      mail: email,
      pdf_url: pdfUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
