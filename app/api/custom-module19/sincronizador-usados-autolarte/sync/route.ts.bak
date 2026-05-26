import { NextResponse } from 'next/server';
import { getRuntimeConfig, setConfig } from '@/utils/modulos/sincronizador-usados-autolarte-19/config';
import { insertLog } from '@/utils/modulos/sincronizador-usados-autolarte-19/logs';

const MEILISEARCH_URL = 'https://server-search.zeroazul.com';
const REPORTS_INDEX = 'bd_reports_dworkers';

interface InvVehicle {
  placa: string;
  status: number;
  costo: string | number;
  descripcion: string;
  marca: string;
  modelo_ano: number;
  kilometraje: string | number;
  cc: string | number;
  colorin: string;
  tipo_combustible: string;
  puertas?: string | number;
  ciudad: string;
  valor_unitario: string | number;
  descuento: string | number;
  bonificacion?: string;
  Prenda?: string;
  Linea?: string;
  modeloano?: string;
  Direccion?: string;
  Garantia?: string;
  estado?: string;
  tipo_caja?: string;
  familia?: string;
  imgs?: Record<string, { src: string }>;
  id: string;
  tipo_vh?: string;
}

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function fetchWithTimeout(url: string, options?: RequestInit, timeout = 30000) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  return res;
}

// Para reportes en MeiliSearch: necesita MEILISEARCH_API_KEY del .env
function getMeiliKey(): string {
  return process.env.MEILISEARCH_API_KEY || '';
}

async function saveReportToMeiliSearch(reportHtml: string, resumen: string, total: number, okCount: number, errCount: number) {
  const key = getMeiliKey();
  if (!key) return;
  const now = new Date();
  const doc = {
    id: `autolarte-sync-${now.getTime()}`,
    type: 'RPA',
    datetime: now.toISOString(),
    agent: 'usados_autolarte',
    report: reportHtml,
  };
  try {
    await fetchJSON(`${MEILISEARCH_URL}/indexes/${REPORTS_INDEX}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify([doc]),
    });
  } catch (e) {
    console.error('[SYNC] Error saving report to MeiliSearch:', e);
  }
}

function escapeJsonStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

export const maxDuration = 300;

export async function POST() {
  const results: { placa: string; operacion: string; resultado: string; status: string; detalle?: string }[] = [];
  const startTime = Date.now();

  try {
    // 1. Cargar config
    const cfg = await getRuntimeConfig();
    const wpUrl = cfg.wp_url || 'https://autolarte.com.co';
    const wpAuth = cfg.wp_auth || '';
    const inventarioUrl = cfg.inventario_url || 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json';
    // const replicateKey = cfg.replicate_key || ''; // Para futuro uso con Replicate

    if (cfg.enabled === '0') {
      return NextResponse.json({ ok: false, error: 'Modulo deshabilitado' }, { status: 400 });
    }

    // 2. Fetch inventory
    const invData = await fetchJSON(inventarioUrl);
    const inventario: InvVehicle[] = invData.mdx_inventario_usadosResult || [];

    const headers: Record<string, string> = {};
    if (wpAuth) headers['Authorization'] = wpAuth;

    const placasEnInventario: Set<string> = new Set();

    // 3. Procesar cada vehículo activo (status=1, costo>0)
    for (const v of inventario) {
      if (v.status !== 1 || !v.costo || Number(v.costo) <= 0) continue;

      const placa = v.placa?.trim().toUpperCase();
      if (!placa) continue;
      placasEnInventario.add(placa);

      try {
        // Verificar si ya existe en WordPress
        const existentes = await fetchJSON(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados?placa=${placa}`, { headers });
        const existe = Array.isArray(existentes) && existentes.length > 0;

        // Procesar imágenes
        let imagenPrincipal = '';
        let galeria = '';
        const imagenesTem: string[] = [];

        if (v.imgs && typeof v.imgs === 'object') {
          const imgKeys = Object.keys(v.imgs);
          for (const key of imgKeys) {
            const src = v.imgs[key]?.src;
            if (!src) continue;

            if (key === 'frontright') {
              imagenPrincipal = src;
              imagenesTem.push(src);
            } else if (key === 'frontleft') {
              imagenesTem.push(src);
            } else {
              imagenesTem.push(src);
            }
          }
          galeria = imagenesTem.join(',');
        }

        if (!imagenPrincipal) {
          imagenPrincipal = `${wpUrl}/wp-content/uploads/imagen-no-disponible-autolarte-1.png`;
        }

        const estadoImagen = imagenPrincipal.includes('imagen-no-disponible') ? 'no' : 'si';
        const imagenesProcesadas = v.imgs && Object.keys(v.imgs).length > 0 ? 'no' : 'no';

        const body = JSON.stringify({
          cct_status: 'publish',
          titulo: v.descripcion || '',
          modelo: String(v.modelo_ano || ''),
          kilometraje: String(v.kilometraje || ''),
          cilindraje: String(v.cc || ''),
          color: v.colorin || '',
          placa: placa,
          marca: v.marca || '',
          combustible: v.tipo_combustible || '',
          puertas: String(v.puertas ?? ''),
          ciudad: v.ciudad || '',
          precio_lista: String(v.valor_unitario || '0'),
          descuento: String(v.descuento || '0'),
          costo: String(v.costo || '0'),
          bonificacion: String(v.bonificacion ?? ''),
          prenda: String((v as any).Prenda ?? ''),
          linea: String((v as any).Linea ?? ''),
          version: v.modeloano || '',
          direccion: String((v as any).Direccion ?? ''),
          garantia: String((v as any).Garantia ?? ''),
          estado: String(v.estado ?? ''),
          caja: v.tipo_caja || '',
          familia: String((v as any).familia ?? ''),
          imagen_principal: imagenPrincipal,
          galeria: galeria,
          estado_imagen: estadoImagen,
          imagenes_procesadas: imagenesProcesadas,
        });

        if (Array.isArray(existentes) && existentes.length >= 2) {
          // Duplicado: eliminar el segundo
          const dupId = (existentes[1] as any)._ID;
          if (dupId) {
            await fetchWithTimeout(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados/${dupId}`, {
              method: 'DELETE',
              headers,
            }, 15000);
          }
          // Actualizar el primero
          const firstId = (existentes[0] as any)._ID;
          await fetchWithTimeout(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados/${firstId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body,
          }, 30000);

          results.push({ placa, operacion: 'update', resultado: 'Duplicado eliminado y vehiculo actualizado', status: 'ok' });
        } else if (existe) {
          // Actualizar existente
          const existingId = (existentes[0] as any)._ID;
          await fetchWithTimeout(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados/${existingId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body,
          }, 30000);

          results.push({ placa, operacion: 'update', resultado: 'Vehiculo actualizado', status: 'ok' });
        } else {
          // Crear nuevo
          await fetchWithTimeout(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados/`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body,
          }, 30000);

          results.push({ placa, operacion: 'create', resultado: 'Vehiculo nuevo registrado', status: 'ok' });
        }
      } catch (err: any) {
        results.push({ placa, operacion: 'error', resultado: err?.message || 'Error desconocido', status: 'error' });
      }
    }

    // 4. Eliminar vehículos que ya no están en inventario
    try {
      const todosExistentes = await fetchJSON(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados`, { headers });
      if (Array.isArray(todosExistentes)) {
        for (const existente of todosExistentes) {
          const placa = (existente as any).placa?.trim().toUpperCase();
          if (placa && !placasEnInventario.has(placa)) {
            const id = (existente as any)._ID;
            if (id) {
              await fetchWithTimeout(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados/${id}`, {
                method: 'DELETE',
                headers,
              }, 15000);
              results.push({ placa, operacion: 'delete', resultado: 'Eliminado. Ya no esta en inventario', status: 'ok' });
            }
          }
        }
      }
    } catch (err: any) {
      // No bloqueante si falla la limpieza
    }

    // 5. TEST: probar imágenes de 10 placas al azar
    const testResults: {
      placa: string;
      imagenPrincipal: string;
      frontalStatus: string;
      lateralStatus: string;
      galeriaCount: number;
      galeriaAccessibles: number;
      error?: string;
    }[] = [];

    const platesToTest = results
      .filter(r => r.operacion !== 'delete' && r.status === 'ok')
      .map(r => r.placa)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    if (platesToTest.length > 0) {
      for (const placa of platesToTest) {
        try {
          const wpData = await fetchJSON(`${wpUrl}/wp-json/jet-cct/cct_vehiculos_usados?placa=${placa}`, { headers });
          const vehiculo = Array.isArray(wpData) && wpData.length > 0 ? wpData[0] as any : null;

          if (!vehiculo) {
            testResults.push({ placa, imagenPrincipal: '', frontalStatus: 'no_data', lateralStatus: 'no_data', galeriaCount: 0, galeriaAccessibles: 0, error: 'Vehiculo no encontrado en WP tras sync' });
            continue;
          }

          const imgPrincipal = vehiculo.imagen_principal || '';
          const galeria = vehiculo.galeria || '';
          const galeriaUrls = galeria ? galeria.split(',').filter((u: string) => u.trim()) : [];

          let frontalStatus = 'pendiente';
          let lateralStatus = 'pendiente';

          // Test imagen principal (frontright/frontal)
          if (imgPrincipal) {
            try {
              const headRes = await fetchWithTimeout(imgPrincipal, { method: 'HEAD' }, 10000);
              frontalStatus = headRes.ok ? `ok(${headRes.status})` : `error(${headRes.status})`;
            } catch (e: any) {
              frontalStatus = `error(${e?.message || 'timeout'})`;
            }
          } else {
            frontalStatus = 'no_image';
          }

          // Buscar frontleft en galería
          const frontLeftUrls = galeriaUrls.filter((u: string) => u.includes('frontleft'));
          if (frontLeftUrls.length > 0) {
            try {
              const headRes = await fetchWithTimeout(frontLeftUrls[0], { method: 'HEAD' }, 10000);
              lateralStatus = headRes.ok ? `ok(${headRes.status})` : `error(${headRes.status})`;
            } catch (e: any) {
              lateralStatus = `error(${e?.message || 'timeout'})`;
            }
          } else {
            lateralStatus = 'no_image';
          }

          // Contar galerías accesibles
          let galeriaAccessibles = 0;
          for (const url of galeriaUrls.slice(0, 6)) {
            try {
              const gr = await fetchWithTimeout(url.trim(), { method: 'HEAD' }, 8000);
              if (gr.ok) galeriaAccessibles++;
            } catch { /* skip */ }
          }

          // Log del test
          await insertLog({
            placa,
            operacion: 'test_imagenes',
            resultado: `Frontal:${frontalStatus} | Lateral:${lateralStatus} | Galeria:${galeriaAccessibles}/${galeriaUrls.length}`,
            status: frontalStatus.startsWith('ok') && lateralStatus.startsWith('ok') ? 'ok' : 'error',
            detalle: `img_principal:${imgPrincipal.substring(0, 100)}`,
          });

          testResults.push({
            placa,
            imagenPrincipal: imgPrincipal,
            frontalStatus,
            lateralStatus,
            galeriaCount: galeriaUrls.length,
            galeriaAccessibles,
          });
        } catch (err: any) {
          testResults.push({ placa, imagenPrincipal: '', frontalStatus: 'error', lateralStatus: 'error', galeriaCount: 0, galeriaAccessibles: 0, error: err?.message || 'Error en test' });
        }
      }
    }

    // 6. Guardar logs en BD de la sincronización
    for (const r of results) {
      await insertLog({
        placa: r.placa,
        operacion: r.operacion,
        resultado: r.resultado,
        status: r.status,
        detalle: r.detalle,
      });
    }

    // 7. Actualizar timestamp última sincronización
    const now = new Date();
    await setConfig('ultima_sincronizacion', now.toISOString());

    // 8. Generar reporte HTML para MeiliSearch
    const total = results.length;
    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status !== 'ok').length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const testOk = testResults.filter(t => t.frontalStatus.startsWith('ok') && t.lateralStatus.startsWith('ok')).length;
    const testErr = testResults.filter(t => !t.frontalStatus.startsWith('ok') || !t.lateralStatus.startsWith('ok')).length;

    const reportHtml = generateReportHtml(results, total, okCount, errCount, elapsed, testResults, testOk, testErr);
    await saveReportToMeiliSearch(reportHtml, '', total, okCount, errCount);

    return NextResponse.json({
      ok: true,
      total,
      okCount,
      errCount,
      elapsedSec: elapsed,
      results: results.slice(0, 50),
      testResults: {
        tested: testResults.length,
        ok: testOk,
        errores: testErr,
        detalle: testResults,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Error en sincronizacion',
    }, { status: 500 });
  }
}

function generateReportHtml(
  results: { placa: string; operacion: string; resultado: string; status: string }[],
  total: number, okCount: number, errCount: number, elapsed: string,
  testResults: {
    placa: string;
    imagenPrincipal: string;
    frontalStatus: string;
    lateralStatus: string;
    galeriaCount: number;
    galeriaAccessibles: number;
    error?: string;
  }[],
  testOk: number,
  testErr: number
): string {
  const rows = results.map(r =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${escapeJsonStr(r.placa)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">
        <span style="padding:2px 8px;border-radius:4px;font-size:12px;${
          r.operacion === 'create' ? 'background:#d4edda;color:#155724' :
          r.operacion === 'update' ? 'background:#cce5ff;color:#004085' :
          r.operacion === 'delete' ? 'background:#fff3cd;color:#856404' :
          'background:#f8d7da;color:#721c24'
        }">${r.operacion.toUpperCase()}</span>
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeJsonStr(r.resultado)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">
        <span style="color:${r.status === 'ok' ? '#28a745' : '#dc3545'};font-weight:bold">${r.status === 'ok' ? 'OK' : 'ERROR'}</span>
      </td>
    </tr>`
  ).join('\n');

  return `<html>
<head><meta charset="utf-8"><title>Sincronizacion Usados Autolarte</title>
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0}
.container{max-width:900px;margin:auto;background:white;padding:30px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h1{color:#2c3e50;border-bottom:3px solid #3498db;padding-bottom:10px}
h2{color:#34495e;margin-top:25px}
h3{color:#2c3e50;margin-top:20px}
.card{background:#f8f9fa;padding:15px;border-radius:5px;margin:10px 0}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#f8f9fa;color:#555;font-size:13px}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold}
.tag-ok{background:#d4edda;color:#155724}
.tag-err{background:#f8d7da;color:#721c24}
.tag-warn{background:#fff3cd;color:#856404}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid #ddd;text-align:center;color:#7f8c8d;font-size:14px}
</style></head><body>
<div class="container">
<h1>Reporte de Sincronizacion - Usados Autolarte</h1>
<div class="card">
<p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
<p><strong>Duracion:</strong> ${elapsed}s</p>
<p><strong>Total vehiculos procesados:</strong> ${total}</p>
<p><span style="color:#28a745;font-weight:bold">Exitosos: ${okCount}</span> | <span style="color:#dc3545;font-weight:bold">Errores: ${errCount}</span></p>
</div>
<h2>Detalle por vehiculo</h2>
<table>
<thead><tr><th>Placa</th><th>Operacion</th><th>Resultado</th><th>Estado</th></tr></thead>
<tbody>${rows}</tbody>
</table>${testResults.length > 0 ? `
<h2>Test de imagenes (${testResults.length} placas al azar)</h2>
<div class="card">
<p><span style="color:#28a745;font-weight:bold">Imagenes OK: ${testOk}</span> | <span style="color:#dc3545;font-weight:bold">Fallos: ${testErr}</span></p>
</div>
<table>
<thead><tr><th>Placa</th><th>Frontal</th><th>Lateral</th><th>Galeria</th><th>Diagnostico</th></tr></thead>
<tbody>${testResults.map(t => {
  const ambosOk = t.frontalStatus.startsWith('ok') && t.lateralStatus.startsWith('ok');
  const parcialOk = t.frontalStatus.startsWith('ok') || t.lateralStatus.startsWith('ok');
  const diagClass = ambosOk ? 'tag-ok' : (parcialOk ? 'tag-warn' : 'tag-err');
  const diagText = ambosOk ? 'OK' : (parcialOk ? 'PARCIAL' : (t.error || 'FALLO'));
  return `<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${escapeJsonStr(t.placa)}</td>
    <td style="padding:8px;border-bottom:1px solid #eee"><span class="tag ${t.frontalStatus.startsWith('ok') ? 'tag-ok' : 'tag-err'}">${t.frontalStatus}</span></td>
    <td style="padding:8px;border-bottom:1px solid #eee"><span class="tag ${t.lateralStatus.startsWith('ok') ? 'tag-ok' : 'tag-err'}">${t.lateralStatus}</span></td>
    <td style="padding:8px;border-bottom:1px solid #eee">${t.galeriaAccessibles}/${t.galeriaCount}</td>
    <td style="padding:8px;border-bottom:1px solid #eee"><span class="tag ${diagClass}">${diagText}</span></td>
  </tr>`;
}).join('\\n')}</tbody>
</table>` : ''}
<div class="footer"><p>Generado automaticamente por el modulo Sincronizador Usados Autolarte</p></div>
</div></body></html>`;
}