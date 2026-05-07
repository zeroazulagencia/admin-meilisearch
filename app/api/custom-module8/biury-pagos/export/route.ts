import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(_request: NextRequest) {
  try {
    const [rows] = await query<any>(
      `SELECT id, payment_id, receipt_document_id, customer_document, product_name, gateway, total, status, created_at
       FROM modulos_biury_8_logs
       ORDER BY created_at DESC`
    );

    const header = [
      'id',
      'payment_id',
      'receipt_document_id',
      'customer_document',
      'product_name',
      'gateway',
      'total',
      'status',
      'created_at',
    ];

    const lines = [header.join(',')];
    for (const row of rows || []) {
      lines.push([
        row.id,
        row.payment_id,
        row.receipt_document_id,
        row.customer_document,
        row.product_name,
        row.gateway,
        row.total,
        row.status,
        row.created_at,
      ].map(escapeCsv).join(','));
    }

    const csv = lines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="biury-pagos-logs.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Error al exportar CSV' },
      { status: 500 }
    );
  }
}
