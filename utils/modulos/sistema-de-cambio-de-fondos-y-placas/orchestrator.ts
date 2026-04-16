import fs from 'fs';
import path from 'path';
import { getConfig } from './config';
import { createLog } from './logs';
import { generateBackground } from './replicate';
import { processRapidApi } from './rapidapi';
import { wpGetBase64, wpListLarge, wpOverrideImage, wpUploadImage } from './wp-api';
import { getWpTablePrefix, queryWp } from './wp-db';

type VehicleRow = {
  placa: string;
  titulo?: string | null;
};

function loadCategoryPrompt(description: string, categoryPath: string, fallbackPrompt: string) {
  try {
    const raw = fs.readFileSync(categoryPath, 'utf8');
    const categories = JSON.parse(raw) as Array<{ modelo: string; prompt: string }>;
    const match = categories.find((cat) => description.includes(cat.modelo));
    return match?.prompt || fallbackPrompt;
  } catch {
    return fallbackPrompt;
  }
}

async function getBaseUrl() {
  const base = await getConfig('autolarte_base_url');
  return (base || 'https://autolarte.com.co').replace(/\/$/, '');
}

async function getSideImageUrl(plate: string, side: string) {
  const base = await getBaseUrl();
  return `${base}/wp-content/uploads/usados/${plate}-${side}.png`;
}

type ImageSource = { input: string; detail?: string };
type TraceEvent = { step: string; status: string; detail?: string };
type TraceFn = (event: TraceEvent) => void;

type InventoryVehicle = {
  placa?: string;
  descripcion?: string;
  imgs?: Record<string, { src?: string }> | Array<{ key?: string; src?: string }>;
};

let inventoryCache: { loadedAt: number; list: InventoryVehicle[] } | null = null;

async function getInventoryUrl() {
  const configured = await getConfig('concesionario_json_url');
  return configured || 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json';
}

async function fetchInventoryList() {
  const now = Date.now();
  if (inventoryCache && now - inventoryCache.loadedAt < 5 * 60 * 1000) {
    return inventoryCache.list;
  }
  const baseUrl = await getInventoryUrl();
  const random = Math.floor(10000000 + Math.random() * 90000000);
  const url = baseUrl.includes('{timestamp}')
    ? baseUrl.replace('{timestamp}', String(random))
    : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}timestamp=${random}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Inventario error HTTP ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  const list = Array.isArray(json?.mdx_inventario_usadosResult) ? json.mdx_inventario_usadosResult : [];
  inventoryCache = { loadedAt: now, list };
  return list;
}

async function findInventoryVehicle(plate: string) {
  const list = await fetchInventoryList();
  return list.find((item: InventoryVehicle) => String(item?.placa || '').trim() === plate) || null;
}

function getInventoryImageSrc(vehicle: InventoryVehicle | null, side: string) {
  if (!vehicle?.imgs) return null;
  if (Array.isArray(vehicle.imgs)) {
    const match = vehicle.imgs.find((img) => String(img?.key || '').trim() === side);
    return match?.src || null;
  }
  const record = vehicle.imgs as Record<string, { src?: string }>;
  return record?.[side]?.src || null;
}

async function maskPlateOrThrow(params: { plate: string; side: string; flow: string; imageUrl: string }) {
  try {
    return await processRapidApi(params.imageUrl);
  } catch (error: any) {
    await createLog({
      plate: params.plate,
      flow: params.flow,
      side: params.side,
      status: 'error',
      step: 'plate_mask',
      input_url: params.imageUrl,
      error_message: error?.message || 'error',
    });
    throw error;
  }
}

async function resolveReplicateInput(plate: string, side: string, inputUrl: string, trace?: TraceFn): Promise<ImageSource> {
  trace?.({ step: 'fetch_original_start', status: 'start', detail: inputUrl });
  try {
    const res = await fetch(inputUrl, { method: 'GET', redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.startsWith('image/')) {
      trace?.({ step: 'fetch_original', status: 'ok', detail: contentType });
      trace?.({ step: 'resolved_source', status: 'ok', detail: 'original_url' });
      return { input: inputUrl, detail: `url:${contentType}` };
    }
    trace?.({ step: 'fetch_original', status: 'error', detail: `status=${res.status} type=${contentType || 'unknown'}` });
  } catch (error: any) {
    trace?.({ step: 'fetch_original', status: 'error', detail: error?.message || 'fetch_failed' });
  }

  const filename = `${plate}-${side}.png`;
  trace?.({ step: 'wp_base64', status: 'start', detail: filename });
  const fallback = await wpGetBase64({ filename });
  if (!fallback.ok || !fallback.data?.base64) {
    trace?.({ step: 'wp_base64', status: 'error', detail: fallback.data?.error || `status=${fallback.status || 'n/a'}` });
    try {
      const vehicle = await findInventoryVehicle(plate);
      if (!vehicle) {
        trace?.({ step: 'inventory_lookup', status: 'error', detail: 'Inventario sin placa' });
        throw new Error('Inventario sin placa');
      }
      const originalUrl = getInventoryImageSrc(vehicle, side);
      if (!originalUrl) {
        trace?.({ step: 'inventory_lookup', status: 'error', detail: 'Inventario sin imagen' });
        throw new Error('Inventario sin imagen');
      }
      trace?.({ step: 'inventory_lookup', status: 'ok', detail: originalUrl });
      const upload = await wpUploadImage({ plate, side, imageUrl: originalUrl });
      trace?.({
        step: 'inventory_upload',
        status: upload.ok ? 'ok' : 'error',
        detail: upload.ok ? 'subida_exitosa' : JSON.stringify(upload.data || {}),
      });
      if (!upload.ok) {
        trace?.({ step: 'resolved_source', status: 'ok', detail: 'inventory_url_wp_upload_error' });
        return { input: originalUrl, detail: 'inventory_url_wp_upload_error' };
      }
      trace?.({ step: 'resolved_source', status: 'ok', detail: 'inventory_url' });
      return { input: originalUrl, detail: 'inventory_url' };
    } catch (error: any) {
      const status = fallback.status || 'n/a';
      const base64Error = fallback.data?.error || 'no_base64';
      const inventoryError = error?.message || 'inventario_error';
      trace?.({ step: 'resolved_source', status: 'error', detail: inventoryError });
      throw new Error(`Imagen invalida: ${status} ${base64Error} (${inventoryError})`);
    }
  }
  const mime = fallback.data?.mime || 'image/png';
  trace?.({ step: 'wp_base64', status: 'ok', detail: mime });
  trace?.({ step: 'resolved_source', status: 'ok', detail: 'base64' });
  return { input: `data:${mime};base64,${fallback.data.base64}`, detail: 'base64' };
}

async function getCategoryPath() {
  const configured = await getConfig('category_json_path');
  if (!configured) return '';
  if (configured.startsWith('/')) return configured;
  return path.resolve(configured);
}

async function markProcessed(plate: string) {
  const prefix = await getWpTablePrefix();
  const table = `${prefix}jet_cct_cct_vehiculos_usados`;
  await queryWp(
    `UPDATE ${table} SET imagenes_procesadas = 'si' WHERE placa = ?`,
    [plate]
  );
}

const buildRunSummary = (items: Array<{ plate?: string; status?: string; error?: string }>) => {
  return items.map((item, index) => ({
    plate: item.plate || `item-${index + 1}`,
    status: item.status || 'info',
    detail: item.error || '',
  }));
};

export async function runAuto(limit = 50) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 50)));
  const prefix = await getWpTablePrefix();
  const table = `${prefix}jet_cct_cct_vehiculos_usados`;
  const inventoryList = await fetchInventoryList();
  const inventoryMap = new Map<string, InventoryVehicle>();
  for (const vehicle of inventoryList) {
    const plate = String(vehicle?.placa || '').trim();
    if (plate) inventoryMap.set(plate, vehicle);
  }
  const rows = await queryWp<VehicleRow>(
    `SELECT placa, titulo FROM ${table}
      WHERE imagenes_procesadas IS NULL OR imagenes_procesadas = '' OR imagenes_procesadas = 'no'
      LIMIT ${safeLimit}`
  );

  const promptDefault = (await getConfig('prompt_default')) || 'In the city, clean background, no text, no people, no other vehicles';
  const categoryPath = await getCategoryPath();

  const results: Array<{ plate: string; status: string; error?: string }> = [];

  if (!rows.length) {
    await createLog({
      plate: 'system',
      flow: 'auto',
      status: 'skipped',
      step: 'run_auto',
      error_message: 'Sin pendientes con imagenes_procesadas = no',
    });
    return {
      count: 0,
      results,
      summary: {
        totalRows: 0,
        processed: 0,
        errors: 0,
        details: [],
      },
      message: 'No se encontraron placas pendientes para procesar',
    };
  }
  for (const row of rows) {
    const plate = String(row.placa || '').trim();
    if (!plate) continue;
    const description = String(row.titulo || '');
    const prompt = loadCategoryPrompt(description, categoryPath, promptDefault);
    const vehicle = inventoryMap.get(plate) || null;
    const hasInventoryImage = !!(
      vehicle && (getInventoryImageSrc(vehicle, 'frontright') || getInventoryImageSrc(vehicle, 'frontleft'))
    );


    if (!hasInventoryImage) {
      await createLog({
        plate,
        flow: 'auto',
        status: 'error',
        step: 'inventory',
        error_message: 'Inventario sin imagen',
      });
      results.push({ plate, status: 'error', error: 'Inventario sin imagen' });
      continue;
    }

    for (const side of ['frontright', 'frontleft']) {
      const inputUrl = await getSideImageUrl(plate, side);

      let resolved: ImageSource;
      try {
        resolved = await resolveReplicateInput(plate, side, inputUrl);
      } catch (error: any) {
        await createLog({
          plate,
          flow: 'auto',
          side,
          status: 'error',
          step: 'replicate_input',
          input_url: inputUrl,
          error_message: error?.message || 'error',
        });
        results.push({ plate, status: 'error', error: error?.message || 'Entrada inválida' });
        continue;
      }

      let imageUrl: string;
      try {
        imageUrl = await generateBackground(resolved.input, prompt);
      } catch (error: any) {
        await createLog({
          plate,
          flow: 'auto',
          side,
          status: 'error',
          step: 'replicate',
          input_url: inputUrl,
          error_message: error?.message || 'error',
        });
        results.push({ plate, status: 'error', error: error?.message || 'Replicate falló' });
        continue;
      }

      let maskedBase64: string;
      try {
        maskedBase64 = await maskPlateOrThrow({ plate, side, flow: 'auto', imageUrl });
      } catch (error: any) {
        results.push({ plate, status: 'error', error: error?.message || 'Mask falló' });
        continue;
      }

      const upload = await wpUploadImage({ plate, side, imageBase64: maskedBase64 });
      if (!upload.ok) {
        await createLog({
          plate,
          flow: 'auto',
          side,
          status: 'error',
          step: 'wp_upload',
          input_url: inputUrl,
          output_url: imageUrl,
          error_message: JSON.stringify(upload.data || {}),
        });
        results.push({ plate, status: 'error', error: 'WordPress no aceptó la imagen' });
        continue;
      }

      await createLog({
        plate,
        flow: 'auto',
        side,
        status: 'success',
        step: 'completed',
        input_url: inputUrl,
        output_url: upload.data?.url || imageUrl,
      });
      results.push({ plate, status: 'success' });
    }

    try {
      await markProcessed(plate);
    } catch (error: any) {
      await createLog({
        plate,
        flow: 'auto',
        status: 'error',
        step: 'mark_processed',
        error_message: error?.message || 'error',
      });
    }
  }

  return {
    count: rows.length,
    results,
    summary: {
      totalRows: rows.length,
      processed: results.filter((r) => r.status === 'success').length,
      errors: results.filter((r) => r.status === 'error').length,
      details: buildRunSummary(results),
    },
    message: results.length
      ? `${results.filter((r) => r.status === 'success').length} lados procesados, ${results.filter((r) => r.status === 'error').length} con error`
      : 'No se encontraron placas con imágenes pendientes',
  };
}

export async function runManual(plates: string[]) {
  const promptDefault = (await getConfig('prompt_default')) || 'In the city, clean background, no text, no people, no other vehicles';
  const categoryPath = await getCategoryPath();
  const results: Array<{ plate: string; status: string; error?: string }> = [];

  if (!plates.length) {
    await createLog({
      plate: 'system',
      flow: 'manual',
      status: 'skipped',
      step: 'run_manual',
      error_message: 'Sin placas proporcionadas',
    });
    return {
      count: 0,
      results,
      summary: {
        totalRows: 0,
        processed: 0,
        errors: 0,
        details: [],
      },
      message: 'No se ingresaron placas a procesar',
    };
  }

  for (const plateRaw of plates) {
    const plate = String(plateRaw || '').trim();
    if (!plate) continue;
    const prompt = loadCategoryPrompt('', categoryPath, promptDefault);

    for (const side of ['frontright', 'frontleft']) {
      const inputUrl = await getSideImageUrl(plate, side);

      let resolved: ImageSource;
      try {
        resolved = await resolveReplicateInput(plate, side, inputUrl);
      } catch (error: any) {
        await createLog({
          plate,
          flow: 'manual',
          side,
          status: 'error',
          step: 'replicate_input',
          input_url: inputUrl,
          error_message: error?.message || 'error',
        });
        results.push({ plate, status: 'error', error: error?.message || 'Entrada inválida' });
        continue;
      }

      let imageUrl: string;
      try {
        imageUrl = await generateBackground(resolved.input, prompt);
      } catch (error: any) {
        await createLog({
          plate,
          flow: 'manual',
          side,
          status: 'error',
          step: 'replicate',
          input_url: inputUrl,
          error_message: error?.message || 'error',
        });
        results.push({ plate, status: 'error', error: error?.message || 'Replicate falló' });
        continue;
      }

      let maskedBase64: string;
      try {
        maskedBase64 = await maskPlateOrThrow({ plate, side, flow: 'manual', imageUrl });
      } catch (error: any) {
        results.push({ plate, status: 'error', error: error?.message || 'Mask falló' });
        continue;
      }

      const upload = await wpUploadImage({ plate, side, imageBase64: maskedBase64 });
      if (!upload.ok) {
        await createLog({
          plate,
          flow: 'manual',
          side,
          status: 'error',
          step: 'wp_upload',
          input_url: inputUrl,
          output_url: imageUrl,
          error_message: JSON.stringify(upload.data || {}),
        });
        results.push({ plate, status: 'error', error: 'WordPress no aceptó la imagen' });
        continue;
      }

      await createLog({
        plate,
        flow: 'manual',
        side,
        status: 'success',
        step: 'completed',
        input_url: inputUrl,
        output_url: upload.data?.url || imageUrl,
      });
      results.push({ plate, status: 'success' });
    }
  }

  return {
    count: plates.length,
    results,
    summary: {
      totalRows: plates.length,
      processed: results.filter((r) => r.status === 'success').length,
      errors: results.filter((r) => r.status === 'error').length,
      details: buildRunSummary(results),
    },
    message: results.length
      ? `${results.filter((r) => r.status === 'success').length} lados procesados, ${results.filter((r) => r.status === 'error').length} con error`
      : 'No hay placas válidas para procesar',
  };
}

export async function runCompress(limit = 50) {
  const list = await wpListLarge(600);
  if (!list.ok) {
    throw new Error(JSON.stringify(list.data || {}));
  }
  const files = list.data?.files || [];
  const base = await getBaseUrl();
  const results: Array<{ filename: string; status: string; error?: string }> = [];

  for (const file of files.slice(0, limit)) {
    const filename = file.filename || file;
    const imageUrl = `${base}/wp-content/uploads/usados/${filename}`;
    try {
      const base64 = await processRapidApi(imageUrl);
      const override = await wpOverrideImage({ filename, imageBase64: base64 });
      if (!override.ok) {
        await createLog({
          plate: filename,
          flow: 'compress',
          status: 'error',
          step: 'wp_override',
          input_url: imageUrl,
          error_message: JSON.stringify(override.data || {}),
        });
        results.push({ filename, status: 'error', error: 'wp_override' });
        continue;
      }
      await createLog({
        plate: filename,
        flow: 'compress',
        status: 'success',
        step: 'completed',
        input_url: imageUrl,
        output_url: override.data?.url || imageUrl,
      });
      results.push({ filename, status: 'success' });
    } catch (error: any) {
      await createLog({
        plate: filename,
        flow: 'compress',
        status: 'error',
        step: 'rapidapi',
        input_url: imageUrl,
        error_message: error?.message || 'error',
      });
      results.push({ filename, status: 'error', error: error?.message || 'rapidapi' });
    }
  }

  return { count: files.length, results };
}

export async function runTest() {
  const steps: Array<{ step: string; status: string; detail?: string }> = [];
  const fetchImageInfo = async (url: string) => {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      const contentType = res.headers.get('content-type') || '';
      const length = Number(res.headers.get('content-length')) || 0;
      return {
        ok: res.ok,
        status: res.status,
        contentType,
        length,
      };
    } catch (error: any) {
      return { ok: false, status: 0, contentType: '', length: 0, error: error?.message || 'fetch_failed' };
    }
  };
  const prefix = await getWpTablePrefix();
  const table = `${prefix}jet_cct_cct_vehiculos_usados`;
  const inventoryList = await fetchInventoryList();
  const inventoryMap = new Map<string, InventoryVehicle>();
  for (const vehicle of inventoryList) {
    const plate = String(vehicle?.placa || '').trim();
    if (plate) inventoryMap.set(plate, vehicle);
  }

  const pendingRows = await queryWp<VehicleRow>(
    `SELECT placa, titulo FROM ${table}
     WHERE imagenes_procesadas IS NULL OR imagenes_procesadas = '' OR imagenes_procesadas = 'no'
     LIMIT 200`
  );

  if (!pendingRows.length) {
    steps.push({ step: 'select_vehicle', status: 'skipped', detail: 'No hay vehículos pendientes' });
    return { ok: true, steps };
  }

  let row: VehicleRow | null = null;
  let hasInventoryImage = false;
  let selectedInventoryPlate: string | null = null;
  let selectionSource: 'pending' | 'fallback' | 'inventory' = 'pending';
  for (const candidate of pendingRows) {
    const candidatePlate = String(candidate.placa || '').trim();
    if (!candidatePlate) continue;
    const vehicle = inventoryMap.get(candidatePlate) || null;
    const sideHasImage = !!(
      vehicle && (getInventoryImageSrc(vehicle, 'frontright') || getInventoryImageSrc(vehicle, 'frontleft'))
    );
    if (!row) {
      row = candidate;
      hasInventoryImage = sideHasImage;
      if (sideHasImage) {
        selectedInventoryPlate = candidatePlate;
      }
    }
    if (sideHasImage) {
      row = candidate;
      hasInventoryImage = true;
      selectedInventoryPlate = candidatePlate;
      break;
    }
  }

  if (!hasInventoryImage) {
    const fallbackRows = await queryWp<VehicleRow>(
      `SELECT placa, titulo FROM ${table}
       ORDER BY placa DESC
       LIMIT 200`
    );
    for (const candidate of fallbackRows) {
      const candidatePlate = String(candidate.placa || '').trim();
      if (!candidatePlate) continue;
      const vehicle = inventoryMap.get(candidatePlate) || null;
      const sideHasImage = !!(
        vehicle && (getInventoryImageSrc(vehicle, 'frontright') || getInventoryImageSrc(vehicle, 'frontleft'))
      );
      if (!row) {
        row = candidate;
      }
      if (sideHasImage) {
        row = candidate;
        hasInventoryImage = true;
        selectionSource = 'fallback';
        selectedInventoryPlate = candidatePlate;
        break;
      }
    }
  }

  if (!row) {
    steps.push({ step: 'select_vehicle', status: 'error', detail: 'No se encontró placa válida' });
    return { ok: false, steps };
  }

  if (!hasInventoryImage) {
    for (const vehicle of inventoryList) {
      const invPlate = String(vehicle?.placa || '').trim();
      if (!invPlate) continue;
      if (inventoryMap.has(invPlate)) {
        const existingVehicle = inventoryMap.get(invPlate);
        const sideHasImage = !!(
          existingVehicle &&
          (getInventoryImageSrc(existingVehicle, 'frontright') || getInventoryImageSrc(existingVehicle, 'frontleft'))
        );
        if (!sideHasImage) continue;
        row = { placa: invPlate, titulo: existingVehicle?.descripcion || '' };
        hasInventoryImage = true;
        selectionSource = 'inventory';
        selectedInventoryPlate = invPlate;
        break;
      }
    }
  }

  if (!hasInventoryImage) {
    steps.push({ step: 'select_vehicle', status: 'error', detail: 'No hay placas con imágenes en inventario' });
    return { ok: false, steps };
  }

  const plate = String(row.placa || '').trim();
  const description = String(row.titulo || '');
  const promptDefault = (await getConfig('prompt_default')) || 'In the city, clean background, no text, no people, no other vehicles';
  const categoryPath = await getCategoryPath();
  const prompt = loadCategoryPrompt(description, categoryPath, promptDefault);

  steps.push({ step: 'select_vehicle', status: 'ok', detail: `${plate} (${selectionSource})` });
  steps.push({
    step: 'inventory_check',
    status: hasInventoryImage ? 'ok' : 'warning',
    detail: hasInventoryImage
      ? `Inventario con imgs (placa ${selectedInventoryPlate || plate})`
      : 'Inventario sin imgs, se usará fallback',
  });
  steps.push({ step: 'prompt', status: 'ok', detail: prompt });

  for (const side of ['frontright', 'frontleft']) {
    const inputUrl = await getSideImageUrl(plate, side);
    const imageInfo = await fetchImageInfo(inputUrl);
    if (imageInfo.ok) {
      steps.push({
        step: `image_check_${side}`,
        status: 'ok',
        detail: `status=${imageInfo.status} type=${imageInfo.contentType || 'unknown'} size=${imageInfo.length}`,
      });
    } else {
      steps.push({
        step: `image_check_${side}`,
        status: 'error',
        detail: `status=${imageInfo.status || 'n/a'} error=${(imageInfo as any).error || 'fetch_failed'}`,
      });
    }
    const trace: TraceFn = (event) => {
      steps.push({ step: `${event.step}_${side}`, status: event.status, detail: event.detail });
    };
    let resolved: ImageSource | null = null;
    try {
      resolved = await resolveReplicateInput(plate, side, inputUrl, trace);
      steps.push({ step: `replicate_input_${side}`, status: 'ok', detail: resolved.detail || 'url' });
    } catch (error: any) {
      steps.push({ step: `replicate_input_${side}`, status: 'error', detail: error?.message || 'input_failed' });
    }
    steps.push({ step: `replicate_${side}`, status: 'start', detail: inputUrl });
    if (!resolved) {
      steps.push({ step: `replicate_${side}`, status: 'skipped', detail: 'input_invalido' });
      await createLog({
        plate,
        flow: 'test',
        side,
        status: 'error',
        step: 'input',
        input_url: inputUrl,
        error_message: 'input_invalido',
      });
      continue;
    }

    let imageUrl: string;
    try {
      imageUrl = await generateBackground(resolved?.input || inputUrl, prompt);
      steps.push({ step: `replicate_${side}`, status: 'ok', detail: imageUrl });
    } catch (error: any) {
      const firstError = error?.message || 'error';
      steps.push({ step: `replicate_${side}`, status: 'error', detail: firstError });
      await createLog({
        plate,
        flow: 'test',
        side,
        status: 'error',
        step: 'replicate',
        input_url: inputUrl,
        error_message: firstError,
      });
      continue;
    }

    steps.push({ step: `plate_mask_${side}`, status: 'start', detail: imageUrl });
    let maskedBase64: string;
    try {
      maskedBase64 = await processRapidApi(imageUrl);
      steps.push({ step: `plate_mask_${side}`, status: 'ok', detail: 'rapidapi' });
    } catch (error: any) {
      const maskError = error?.message || 'plate_mask_error';
      steps.push({ step: `plate_mask_${side}`, status: 'error', detail: maskError });
      await createLog({
        plate,
        flow: 'test',
        side,
        status: 'error',
        step: 'plate_mask',
        input_url: imageUrl,
        error_message: maskError,
      });
      continue;
    }

    const upload = await wpUploadImage({ plate, side, imageBase64: maskedBase64 });
    if (!upload.ok) {
      steps.push({ step: `wp_upload_${side}`, status: 'error', detail: JSON.stringify(upload.data || {}) });
      await createLog({
        plate,
        flow: 'test',
        side,
        status: 'error',
        step: 'wp_upload',
        input_url: inputUrl,
        output_url: imageUrl,
        error_message: JSON.stringify(upload.data || {}),
      });
      continue;
    }
    steps.push({ step: `wp_upload_${side}`, status: 'ok', detail: upload.data?.url || imageUrl });
    await createLog({
      plate,
      flow: 'test',
      side,
      status: 'success',
      step: 'completed',
      input_url: inputUrl,
      output_url: upload.data?.url || imageUrl,
    });
  }

  return { ok: true, steps };
}
