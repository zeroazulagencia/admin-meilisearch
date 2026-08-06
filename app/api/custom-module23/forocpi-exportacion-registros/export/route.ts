import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig } from '@/utils/modulos/forocpi-exportacion-registros-23/module23-config';
import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('id');
    if (!formId) {
      return NextResponse.json({ ok: false, error: 'Parametro id requerido' }, { status: 400 });
    }

    const config = await getAllConfig();
    const host = config.server_ip || '';
    const user = config.db_user || '';
    const password = config.db_password || '';
    const database = config.db_name || '';

    if (!host || !user || !password || !database) {
      return NextResponse.json({ ok: false, error: 'Configuracion DB incompleta' }, { status: 400 });
    }

    const conn = await mysql.createConnection({
      host,
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    // Get all records for this form
    const [records] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id, user_id, from_content_id, status, ip_address, referrer, submit_type, created_at FROM tar_jet_fb_records WHERE form_id = ? ORDER BY created_at DESC',
      [parseInt(formId, 10)]
    );

    // Get all fields for these records
    const recordIds = records.map((r) => r.id);
    let fieldRows: mysql.RowDataPacket[] = [];
    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => '?').join(',');
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT record_id, field_name, field_value FROM tar_jet_fb_records_fields WHERE record_id IN (${placeholders}) ORDER BY id`,
        recordIds
      );
      fieldRows = rows;
    }

    await conn.end();

    // Collect all unique field names in order they appear
    const fieldNames: string[] = [];
    const fieldSet = new Set<string>();
    for (const f of fieldRows) {
      if (!fieldSet.has(f.field_name)) {
        fieldSet.add(f.field_name);
        fieldNames.push(f.field_name);
      }
    }

    // Build rows for Excel
    const cols = ['ID', 'Formulario ID', 'Usuario ID', 'Estado', 'IP', 'Referente', 'Tipo', 'Fecha'];
    for (const fn of fieldNames) cols.push(fn);

    const excelRows: Record<string, string | number>[] = records.map((r) => {
      const row: Record<string, string | number> = {
        'ID': r.id,
        'Formulario ID': parseInt(formId, 10),
        'Usuario ID': r.user_id || '',
        'Estado': r.status || '',
        'IP': r.ip_address || '',
        'Referente': r.referrer || '',
        'Tipo': r.submit_type || '',
        'Fecha': r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : '',
      };
      // Fill field values
      for (const fn of fieldNames) row[fn] = '';
      const recordFields = fieldRows.filter((f) => f.record_id === r.id);
      for (const f of recordFields) {
        row[f.field_name] = f.field_value || '';
      }
      return row;
    });

    // Generate Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    // Auto-fit column widths
    const maxLen: Record<string, number> = {};
    excelRows.forEach((row) => {
      Object.entries(row).forEach(([k, v]) => {
        const len = String(v).length;
        if (!maxLen[k] || len > maxLen[k]) maxLen[k] = len;
      });
    });
    ws['!cols'] = cols.map((c) => ({ wch: Math.min(Math.max((maxLen[c] || c.length) + 2, 12), 60) }));

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `formulario-${formId}-registros-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}