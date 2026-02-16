import { getConfig, updateLeadLog } from './config';

// PASO 2: Consultar lead de Facebook Graph API
export async function consultFacebookLead(leadgenId: string, leadId: number) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'consultando_facebook',
      current_step: 'Consultando Facebook Graph API',
      facebook_fetched_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    const appId = await getConfig('facebook_app_id');
    const appSecret = await getConfig('facebook_app_secret');
    
    if (!appId || !appSecret) {
      throw new Error('Credenciales de Facebook no configuradas');
    }

    const accessToken = `${appId}|${appSecret}`;
    const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Consultando Facebook',
    });
    throw e;
  }
}

// PASO 3: Limpiar datos de Facebook
export async function cleanFacebookData(rawData: any, leadId: number) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'limpiando_datos',
      current_step: 'Limpiando datos de Facebook',
    });

    const fields: Record<string, any> = {};
    const fieldData = rawData.field_data || [];

    fieldData.forEach((entry: any) => {
      const value = entry.values && entry.values.length > 0 ? entry.values[0] : null;
      fields[entry.name] = value;
    });

    await updateLeadLog(leadId, {
      facebook_cleaned_data: fields,
    });

    return fields;
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Limpiando datos',
    });
    throw e;
  }
}

// PASO 4: Procesar con IA (OpenAI)
export async function processWithAI(cleanedData: any, leadId: number) {
  try {
    // Solo actualizar BD si leadId es válido (modo prueba usa -1)
    if (leadId > 0) {
      await updateLeadLog(leadId, {
        processing_status: 'enriqueciendo_ia',
        current_step: 'Procesando con OpenAI',
      });
    }

    const apiKey = await getConfig('openai_api_key');
    if (!apiKey) {
      throw new Error('OpenAI API Key no configurada');
    }

    const prompt = `Analiza este resultado:
${JSON.stringify(cleanedData)}

Devuelve exclusivamente este JSON sin capas adicionales:

{
  "data": {
    "campaingn_name": "",
    "form_name": "",
    "fullname": "",
    "email": "",
    "phone": "",
    "lastname": "",
    "firstname": "",
    "pais_salesforce": "",
    "state": "",
    "prefijo": "",
    "proyecto_de_interes": "",
    "servicio_de_interes": "",
    "description": ""
  }
}

Reglas:
1. "campaingn_name" ➔ Nombre de la campaña.
2. "form_name" ➔ Nombre del formulario.
3. "fullname" ➔ Unir nombre y apellido si vienen separados o el nombre completo, si no viene nombre llamarlo Sin Nombre.
4. "email" ➔ Email tal cual.
5. "phone" ➔ Solo números, sin indicativo ni espacios. Si no hay, deja vacío, si el numero trae el indicativo )por ejemplo +1= lo quitas para que el numero quede funcional.
6. "lastname" ➔ Solo apellido, sin espacios extra.
7. "firstname" ➔ Solo nombre, sin espacios extra.
8. "pais_salesforce" ➔ Si no hay campo país, dedúcelo de ubicación, ciudad o estado, el nombre del anuncio no afecta este valor. Si no, usar "Estados Unidos".
9. "state" ➔ Estado o ciudad si viene, si no dejar vacío, no tomarlo de ningun otro campo.
10. "prefijo" ➔ Prefijo con +. Si no hay, deducirlo del nombre del país y como ultima opcion: usar "+1" y ajustar el país a Estados Unidos.
11. "proyecto_de_interes" ➔ Si viene, usarlo. Si no, dejar vacío.
12. "servicio_de_interes" ➔ Si no viene, deducir del nombre de campaña o anuncio. Si no, dejar vacío.
13. "description" ➔ Texto resumen que incluya todos los campos adicionales del input que no estén en este JSON y sus valores en un texto legible.

Solo este JSON y nada más.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[OPENAI ERROR]', response.status, response.statusText, errorBody);
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const enrichedData = JSON.parse(result.choices[0].message.content);

    // Solo actualizar BD si leadId es válido (modo prueba usa -1)
    if (leadId > 0) {
      await updateLeadLog(leadId, {
        ai_enriched_data: enrichedData.data,
        ai_summary: enrichedData.data.description,
        ai_processed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
    }

    return enrichedData.data;
  } catch (e: any) {
    if (leadId > 0) {
      await updateLeadLog(leadId, {
        processing_status: 'error',
        error_message: e.message,
        error_step: 'Procesando con IA',
      });
    }
    throw e;
  }
}

// PASO 5: Clasificar campaña
export async function classifyCampaign(campaignName: string, formId: string, leadId: number) {
  try {
    await updateLeadLog(leadId, {
      processing_status: 'clasificando',
      current_step: 'Clasificando tipo de campaña',
    });

    const agencyCampaigns = JSON.parse(await getConfig('agency_campaigns') || '[]');
    const suviCampaigns = JSON.parse(await getConfig('suvi_campaigns') || '[]');
    const opportunityTypeId = await getConfig('salesforce_opportunity_type_id');

    let origen = 'Pauta Agencia';
    
    if (suviCampaigns.includes(campaignName) || formId === '1200513015221690') {
      origen = 'Pauta Interna';
    } else if (agencyCampaigns.includes(campaignName)) {
      origen = 'Pauta Agencia';
    }

    await updateLeadLog(leadId, {
      campaign_type: origen,
      opportunity_type_id: opportunityTypeId,
    });

    return { origen, tipo_oportunidad: opportunityTypeId };
  } catch (e: any) {
    await updateLeadLog(leadId, {
      processing_status: 'error',
      error_message: e.message,
      error_step: 'Clasificando campaña',
    });
    throw e;
  }
}
