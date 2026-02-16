import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { getConfig } from '@/utils/modulos/suvi-leads/config';

// Desactivar caché completamente
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = parseInt(params.id);
    console.log(`[API SUVI LEADS] [CONSULT META] Lead ID: ${leadId}`);

    // Obtener el lead
    const [leads] = await query<any>(
      'SELECT * FROM modulos_suvi_12_leads WHERE id = ?',
      [leadId]
    );

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    const lead = leads[0];

    // Verificar si ya tiene datos de Facebook
    if (lead.facebook_cleaned_data && lead.facebook_cleaned_data !== '{}') {
      return NextResponse.json({
        ok: true,
        message: 'Lead ya tiene datos de Facebook',
        lead: {
          id: lead.id,
          facebook_raw_data: JSON.parse(lead.facebook_raw_data || '{}'),
          facebook_cleaned_data: JSON.parse(lead.facebook_cleaned_data || '{}')
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Obtener credenciales de Facebook
    const accessToken = await getConfig('facebook_access_token');
    
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Access Token de Facebook no configurado' },
        { status: 400 }
      );
    }

    // Consultar Facebook Graph API
    const url = `https://graph.facebook.com/v18.0/${lead.leadgen_id}?access_token=${accessToken}`;
    
    console.log(`[API SUVI LEADS] Consultando Facebook para leadgen_id: ${lead.leadgen_id}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API SUVI LEADS] Facebook API error:`, errorText);
      return NextResponse.json(
        { ok: false, error: `Facebook API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const facebookData = await response.json();
    console.log(`[API SUVI LEADS] Datos recibidos de Facebook:`, JSON.stringify(facebookData, null, 2));

    // Limpiar y estructurar los datos del formulario
    const cleanedData: Record<string, any> = {};
    const fieldData = facebookData.field_data || [];

    fieldData.forEach((field: any) => {
      const fieldName = field.name || 'unknown';
      const fieldValues = field.values || [];
      
      if (fieldValues.length === 1) {
        cleanedData[fieldName] = fieldValues[0];
      } else if (fieldValues.length > 1) {
        cleanedData[fieldName] = fieldValues;
      }
    });

    // Agregar metadata
    if (facebookData.created_time) {
      cleanedData._created_time = facebookData.created_time;
    }
    if (facebookData.id) {
      cleanedData._leadgen_id = facebookData.id;
    }

    // Actualizar en la base de datos
    await query<any>(
      `UPDATE modulos_suvi_12_leads 
       SET facebook_raw_data = ?, 
           facebook_cleaned_data = ?,
           processing_status = 'consultando_facebook',
           current_step = 'Datos consultados desde Facebook',
           facebook_fetched_at = NOW()
       WHERE id = ?`,
      [
        JSON.stringify(facebookData),
        JSON.stringify(cleanedData),
        leadId
      ]
    );

    console.log(`[API SUVI LEADS] Datos actualizados en BD para lead ${leadId}`);

    return NextResponse.json({
      ok: true,
      message: 'Datos consultados y guardados exitosamente',
      lead: {
        id: leadId,
        facebook_raw_data: facebookData,
        facebook_cleaned_data: cleanedData
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('[API SUVI LEADS] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}
