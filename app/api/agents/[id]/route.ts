import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { encrypt, decrypt, maskSensitiveValue, isEncrypted } from '@/utils/encryption';

// GET - Obtener un agente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Primero intentar con reports_agent_name, si falla intentar sin él
    try {
      const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, status, knowledge, workflows, conversation_agent_name, reports_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret FROM agents WHERE id = ? LIMIT 1',
        [id]
      );
      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
      }
      
      // Enmascarar campos sensibles antes de enviar al frontend
      // Si está encriptado, intentar desencriptar para obtener los primeros caracteres del original
      const agent = rows[0];
      
      if (agent.whatsapp_access_token) {
        if (isEncrypted(agent.whatsapp_access_token)) {
          try {
            // Intentar desencriptar para obtener los primeros caracteres del token original
            const decrypted = decrypt(agent.whatsapp_access_token);
            if (decrypted && decrypted.length > 0) {
              // Mostrar los primeros caracteres del token original, no del encriptado
              agent.whatsapp_access_token = decrypted.substring(0, 4) + '...';
            } else {
              agent.whatsapp_access_token = maskSensitiveValue(agent.whatsapp_access_token, 4);
            }
          } catch (e) {
            // Si falla la desencriptación, usar el método de enmascarado estándar
            agent.whatsapp_access_token = maskSensitiveValue(agent.whatsapp_access_token, 4);
          }
        } else {
          agent.whatsapp_access_token = maskSensitiveValue(agent.whatsapp_access_token, 4);
        }
      }
      
      if (agent.whatsapp_webhook_verify_token) {
        if (isEncrypted(agent.whatsapp_webhook_verify_token)) {
          try {
            const decrypted = decrypt(agent.whatsapp_webhook_verify_token);
            if (decrypted && decrypted.length > 0) {
              agent.whatsapp_webhook_verify_token = decrypted.substring(0, 4) + '...';
            } else {
              agent.whatsapp_webhook_verify_token = maskSensitiveValue(agent.whatsapp_webhook_verify_token, 4);
            }
          } catch (e) {
            agent.whatsapp_webhook_verify_token = maskSensitiveValue(agent.whatsapp_webhook_verify_token, 4);
          }
        } else {
          agent.whatsapp_webhook_verify_token = maskSensitiveValue(agent.whatsapp_webhook_verify_token, 4);
        }
      }
      
      if (agent.whatsapp_app_secret) {
        if (isEncrypted(agent.whatsapp_app_secret)) {
          try {
            const decrypted = decrypt(agent.whatsapp_app_secret);
            if (decrypted && decrypted.length > 0) {
              agent.whatsapp_app_secret = decrypted.substring(0, 4) + '...';
            } else {
              agent.whatsapp_app_secret = maskSensitiveValue(agent.whatsapp_app_secret, 4);
            }
          } catch (e) {
            agent.whatsapp_app_secret = maskSensitiveValue(agent.whatsapp_app_secret, 4);
          }
        } else {
          agent.whatsapp_app_secret = maskSensitiveValue(agent.whatsapp_app_secret, 4);
        }
      }
      
      return NextResponse.json({ ok: true, agent });
    } catch (e: any) {
      // Si falla, probablemente la columna reports_agent_name no existe, intentar sin ella
      console.log('[API AGENTS] Error with reports_agent_name, trying without it:', e?.message);
    const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, status, knowledge, workflows, conversation_agent_name FROM agents WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
    }
      // Agregar campos faltantes como null para compatibilidad
      const agent = {
        ...rows[0],
        reports_agent_name: null,
        whatsapp_business_account_id: null,
        whatsapp_phone_number_id: null,
        whatsapp_access_token: null,
        whatsapp_webhook_verify_token: null,
        whatsapp_app_secret: null
      };
      
      return NextResponse.json({ ok: true, agent });
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error loading agent:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar agente' }, { status: 500 });
  }
}

// PUT - Actualizar un agente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    console.log('[API AGENTS] PUT request body:', JSON.stringify(body, null, 2));
    console.log('[API AGENTS] reports_agent_name value:', body.reports_agent_name);
    
    // Obtener el agente actual para comparar valores encriptados
    const [currentRows] = await query<any>(
      'SELECT whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret FROM agents WHERE id = ? LIMIT 1',
      [id]
    );
    const currentAgent = currentRows && currentRows.length > 0 ? currentRows[0] : null;
    
    // CRÍTICO: Solo actualizar tokens si se envía un valor nuevo explícito Y es diferente del actual
    // Si no se envía el campo (undefined), mantener el valor existente
    // Si se envía null, vacío, o enmascarado, mantener el valor existente
    // Si el valor nuevo es igual al actual, NO actualizar
    let encryptedAccessToken: string | null | undefined = undefined;
    let encryptedWebhookToken: string | null | undefined = undefined;
    let encryptedAppSecret: string | null | undefined = undefined;
    
    const currentAccessToken = currentAgent?.whatsapp_access_token || null;
    const currentWebhookToken = currentAgent?.whatsapp_webhook_verify_token || null;
    const currentAppSecret = currentAgent?.whatsapp_app_secret || null;
    
    // Función helper para enmascarar tokens en logs
    const maskForLog = (token: string | null): string => {
      if (!token) return 'null';
      if (token.length <= 8) return '***';
      return token.substring(0, 4) + '...' + token.substring(token.length - 4);
    };
    
    // Procesar whatsapp_access_token
    if ('whatsapp_access_token' in body) {
      const accessToken = body.whatsapp_access_token;
      if (accessToken && typeof accessToken === 'string' && accessToken.trim() !== '' && !accessToken.endsWith('...')) {
        // Hay un valor nuevo explícito
        let newEncryptedToken: string;
        if (!isEncrypted(accessToken)) {
          newEncryptedToken = encrypt(accessToken);
        } else {
          newEncryptedToken = accessToken;
        }
        
        // CRÍTICO: Solo actualizar si el valor nuevo es diferente del actual
        if (newEncryptedToken !== currentAccessToken) {
          encryptedAccessToken = newEncryptedToken;
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: Cambio detectado. Actual: ${maskForLog(currentAccessToken)}, Nuevo: ${maskForLog(newEncryptedToken)}`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: Valor nuevo es igual al actual, omitiendo actualización. Valor: ${maskForLog(currentAccessToken)}`);
          // NO establecer encryptedAccessToken, dejar como undefined para no actualizar
        }
      } else {
        // Mantener el valor existente (campo vacío, null, o enmascarado)
        console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: Campo vacío/enmascarado, manteniendo valor existente. Valor actual: ${maskForLog(currentAccessToken)}`);
        // NO establecer encryptedAccessToken, dejar como undefined para no actualizar
      }
    } else {
      // Campo no presente en body, mantener el valor existente
      console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: Campo no presente en body, manteniendo valor existente. Valor actual: ${maskForLog(currentAccessToken)}`);
      // NO establecer encryptedAccessToken, dejar como undefined para no actualizar
    }
    
    // Procesar whatsapp_webhook_verify_token
    if ('whatsapp_webhook_verify_token' in body) {
      const webhookToken = body.whatsapp_webhook_verify_token;
      if (webhookToken && typeof webhookToken === 'string' && webhookToken.trim() !== '' && !webhookToken.endsWith('...')) {
        let newEncryptedToken: string;
        if (!isEncrypted(webhookToken)) {
          newEncryptedToken = encrypt(webhookToken);
        } else {
          newEncryptedToken = webhookToken;
        }
        
        // CRÍTICO: Solo actualizar si el valor nuevo es diferente del actual
        if (newEncryptedToken !== currentWebhookToken) {
          encryptedWebhookToken = newEncryptedToken;
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: Cambio detectado. Actual: ${maskForLog(currentWebhookToken)}, Nuevo: ${maskForLog(newEncryptedToken)}`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: Valor nuevo es igual al actual, omitiendo actualización. Valor: ${maskForLog(currentWebhookToken)}`);
        }
      } else {
        console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: Campo vacío/enmascarado, manteniendo valor existente. Valor actual: ${maskForLog(currentWebhookToken)}`);
      }
    } else {
      console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: Campo no presente en body, manteniendo valor existente. Valor actual: ${maskForLog(currentWebhookToken)}`);
    }
    
    // Procesar whatsapp_app_secret
    if ('whatsapp_app_secret' in body) {
      const appSecret = body.whatsapp_app_secret;
      if (appSecret && typeof appSecret === 'string' && appSecret.trim() !== '' && !appSecret.endsWith('...')) {
        let newEncryptedSecret: string;
        if (!isEncrypted(appSecret)) {
          newEncryptedSecret = encrypt(appSecret);
        } else {
          newEncryptedSecret = appSecret;
        }
        
        // CRÍTICO: Solo actualizar si el valor nuevo es diferente del actual
        if (newEncryptedSecret !== currentAppSecret) {
          encryptedAppSecret = newEncryptedSecret;
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: Cambio detectado. Actual: ${maskForLog(currentAppSecret)}, Nuevo: ${maskForLog(newEncryptedSecret)}`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: Valor nuevo es igual al actual, omitiendo actualización. Valor: ${maskForLog(currentAppSecret)}`);
        }
      } else {
        console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: Campo vacío/enmascarado, manteniendo valor existente. Valor actual: ${maskForLog(currentAppSecret)}`);
      }
    } else {
      console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: Campo no presente en body, manteniendo valor existente. Valor actual: ${maskForLog(currentAppSecret)}`);
    }
    
    // Verificar si las columnas de WhatsApp existen antes de intentar actualizar
    let whatsappColumnsExist = false;
    try {
      const [columnCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'agents' 
         AND COLUMN_NAME IN ('whatsapp_business_account_id', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_webhook_verify_token', 'whatsapp_app_secret')`
      );
      whatsappColumnsExist = columnCheck && columnCheck.length > 0 && columnCheck[0].count === 5;
    } catch (checkError) {
      console.log('[API AGENTS] Error checking WhatsApp columns:', checkError);
      // Si no podemos verificar, asumir que no existen
      whatsappColumnsExist = false;
    }

    // Intentar actualizar con todos los campos si las columnas existen
    if (whatsappColumnsExist) {
      try {
        // Construir la query dinámicamente para solo actualizar los campos que se enviaron
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        updateFields.push('client_id = ?', 'name = ?', 'description = ?', 'photo = ?', 'knowledge = ?', 'workflows = ?', 'conversation_agent_name = ?', 'reports_agent_name = ?');
        updateValues.push(
          body.client_id,
          body.name,
          body.description || null,
          body.photo || null,
          JSON.stringify(body.knowledge || {}),
          JSON.stringify(body.workflows || {}),
          body.conversation_agent_name || null,
          body.reports_agent_name || null
        );
        
        // Solo agregar campos de WhatsApp si se enviaron
        if (body.whatsapp_business_account_id !== undefined) {
          updateFields.push('whatsapp_business_account_id = ?');
          updateValues.push(body.whatsapp_business_account_id || null);
        }
        if (body.whatsapp_phone_number_id !== undefined) {
          updateFields.push('whatsapp_phone_number_id = ?');
          updateValues.push(body.whatsapp_phone_number_id || null);
        }
        
        // CRÍTICO: Solo actualizar tokens si se envió un valor nuevo explícito Y es diferente del actual
        if (encryptedAccessToken !== undefined) {
          updateFields.push('whatsapp_access_token = ?');
          updateValues.push(encryptedAccessToken);
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: Agregado a query UPDATE`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_access_token: NO agregado a query UPDATE (manteniendo valor existente)`);
        }
        if (encryptedWebhookToken !== undefined) {
          updateFields.push('whatsapp_webhook_verify_token = ?');
          updateValues.push(encryptedWebhookToken);
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: Agregado a query UPDATE`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_webhook_verify_token: NO agregado a query UPDATE (manteniendo valor existente)`);
        }
        if (encryptedAppSecret !== undefined) {
          updateFields.push('whatsapp_app_secret = ?');
          updateValues.push(encryptedAppSecret);
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: Agregado a query UPDATE`);
        } else {
          console.log(`[API AGENTS] [TOKEN UPDATE] whatsapp_app_secret: NO agregado a query UPDATE (manteniendo valor existente)`);
        }
        
        // Agregar el id al final para el WHERE
        updateValues.push(id);
        
        await query(
          `UPDATE agents SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
        console.log('[API AGENTS] Successfully updated with all fields including WhatsApp');
        return NextResponse.json({ ok: true });
      } catch (e: any) {
        // Si las columnas existen pero falla el UPDATE, verificar si es por tamaño de columna
        console.error('[API AGENTS] Error updating with WhatsApp fields (columns exist):', e?.message);
        
        // Si el error es "Data too long for column", sugerir ejecutar la migración
        if (e?.message && e.message.includes('Data too long for column')) {
          throw new Error('Error: El valor es demasiado largo para la columna. Por favor, ejecuta la migración para corregir el tamaño de las columnas. Endpoint: POST /api/migrations/fix-whatsapp-columns');
        }
        
        throw new Error('Error al actualizar agente: ' + (e?.message || 'Error desconocido'));
      }
    } else {
      // Si las columnas no existen, actualizar sin ellas
      console.log('[API AGENTS] WhatsApp columns do not exist, updating without them');
      
      // Verificar si reports_agent_name existe
      let reportsAgentNameExists = false;
      try {
        const [reportsCheck] = await query<any>(
          `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'agents' 
           AND COLUMN_NAME = 'reports_agent_name'`
        );
        reportsAgentNameExists = reportsCheck && reportsCheck.length > 0 && reportsCheck[0].count === 1;
      } catch (checkError) {
        console.log('[API AGENTS] Error checking reports_agent_name column:', checkError);
        reportsAgentNameExists = false;
      }

      if (reportsAgentNameExists) {
        try {
          await query(
            'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, knowledge = ?, workflows = ?, conversation_agent_name = ?, reports_agent_name = ? WHERE id = ?',
            [
              body.client_id,
              body.name,
              body.description || null,
              body.photo || null,
              JSON.stringify(body.knowledge || {}),
              JSON.stringify(body.workflows || {}),
              body.conversation_agent_name || null,
              body.reports_agent_name || null,
              id
            ]
          );
          console.log('[API AGENTS] Successfully updated without WhatsApp fields');
          return NextResponse.json({ ok: true });
        } catch (e2: any) {
          console.error('[API AGENTS] Error updating without WhatsApp fields:', e2?.message);
          throw new Error('Error al actualizar agente: ' + (e2?.message || 'Error desconocido'));
        }
      } else {
        // Si reports_agent_name tampoco existe, actualizar sin él
        try {
          await query(
            'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, knowledge = ?, workflows = ?, conversation_agent_name = ? WHERE id = ?',
            [
              body.client_id,
              body.name,
              body.description || null,
              body.photo || null,
              JSON.stringify(body.knowledge || {}),
              JSON.stringify(body.workflows || {}),
              body.conversation_agent_name || null,
              id
            ]
          );
          console.log('[API AGENTS] Successfully updated without reports_agent_name and WhatsApp fields');
          return NextResponse.json({ ok: true });
        } catch (e3: any) {
          console.error('[API AGENTS] Error updating with basic fields:', e3?.message);
          throw new Error('Error al actualizar agente: ' + (e3?.message || 'Error desconocido'));
        }
      }
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error updating agent:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al actualizar agente' }, { status: 500 });
  }
}

// DELETE - Eliminar un agente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM agents WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
