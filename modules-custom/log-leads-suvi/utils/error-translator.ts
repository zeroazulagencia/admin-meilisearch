/**
 * Traductor de errores de Salesforce a mensajes amigables en español
 * Parte del módulo log-leads-suvi
 */

export interface FriendlyError {
  icon: string;              // '❌' | '⚠️' | 'ℹ️'
  title: string;            // "Error de validación"
  message: string;          // Mensaje en español claro
  field?: string;          // Campo que falló
  suggestion?: string;     // Qué hacer
  technical?: string;      // Detalles técnicos (colapsable)
}

interface SalesforceError {
  message?: string;
  errorCode?: string;
  fields?: string[];
}

/**
 * Traduce un error de Salesforce a un mensaje amigable en español
 */
export function translateSalesforceError(errorInput: any): FriendlyError {
  // Si es un string, intentar parsearlo como JSON
  let error: SalesforceError;
  
  if (typeof errorInput === 'string') {
    // Intentar extraer el JSON del error
    const jsonMatch = errorInput.match(/Salesforce error: (\[.*\])/);
    if (jsonMatch) {
      try {
        const errors = JSON.parse(jsonMatch[1]);
        error = errors[0] || {};
      } catch (e) {
        error = { message: errorInput };
      }
    } else {
      error = { message: errorInput };
    }
  } else if (Array.isArray(errorInput)) {
    error = errorInput[0] || {};
  } else {
    error = errorInput || {};
  }

  // Mapeo de errores específicos
  
  // INVALID_CROSS_REFERENCE_KEY
  if (error.errorCode === 'INVALID_CROSS_REFERENCE_KEY') {
    if (error.fields?.includes('RecordTypeId')) {
      return {
        icon: '⚠️',
        title: 'Tipo de registro inválido',
        message: 'El tipo de oportunidad configurado no es válido para tu usuario de Salesforce',
        field: 'RecordTypeId',
        suggestion: 'El sistema omitirá este campo y Salesforce usará el tipo de registro por defecto. La oportunidad se creará correctamente.',
        technical: JSON.stringify(error, null, 2)
      };
    }
    
    if (error.fields?.includes('OwnerId')) {
      return {
        icon: '❌',
        title: 'Usuario asignado inválido',
        message: 'El usuario seleccionado como propietario no es válido o no existe',
        field: 'OwnerId',
        suggestion: 'Verifica que el usuario existe en Salesforce y está activo. Revisa la configuración del grupo de usuarios.',
        technical: JSON.stringify(error, null, 2)
      };
    }
    
    if (error.fields?.includes('AccountId')) {
      return {
        icon: '❌',
        title: 'Cuenta inválida',
        message: 'La cuenta especificada no existe o no es válida',
        field: 'AccountId',
        suggestion: 'La cuenta debe crearse antes de crear la oportunidad. Verifica el paso anterior.',
        technical: JSON.stringify(error, null, 2)
      };
    }
    
    // Generic INVALID_CROSS_REFERENCE_KEY
    return {
      icon: '❌',
      title: 'ID de referencia inválido',
      message: `El campo ${error.fields?.[0] || 'especificado'} contiene un ID que no es válido`,
      field: error.fields?.[0],
      suggestion: 'Verifica que el ID existe en Salesforce y el usuario tiene acceso a ese registro.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // REQUIRED_FIELD_MISSING
  if (error.errorCode === 'REQUIRED_FIELD_MISSING') {
    const fields = error.fields?.join(', ') || 'desconocidos';
    return {
      icon: '❌',
      title: 'Campos obligatorios faltantes',
      message: `Faltan campos obligatorios para crear el registro en Salesforce`,
      field: error.fields?.[0],
      suggestion: `Completa los siguientes campos: ${fields}`,
      technical: JSON.stringify(error, null, 2)
    };
  }

  // INVALID_EMAIL_ADDRESS
  if (error.errorCode === 'INVALID_EMAIL_ADDRESS') {
    return {
      icon: '❌',
      title: 'Email inválido',
      message: 'El formato del email no es válido',
      field: 'Email',
      suggestion: 'Verifica que el email tenga el formato correcto (ejemplo@dominio.com)',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // DUPLICATE_VALUE
  if (error.errorCode === 'DUPLICATE_VALUE') {
    return {
      icon: '⚠️',
      title: 'Registro duplicado',
      message: 'Ya existe un registro con estos datos en Salesforce',
      suggestion: 'Esto es normal. El sistema actualizará el registro existente en lugar de crear uno nuevo.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // INVALID_SESSION_ID o SESSION_EXPIRED
  if (error.errorCode === 'INVALID_SESSION_ID' || 
      error.message?.includes('Session expired') ||
      error.message?.includes('Invalid Session')) {
    return {
      icon: '❌',
      title: 'Sesión de Salesforce expirada',
      message: 'La conexión con Salesforce ha expirado',
      suggestion: 'Reconecta la integración de Salesforce desde la configuración del módulo.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY
  if (error.errorCode === 'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY' ||
      error.errorCode === 'INSUFFICIENT_ACCESS') {
    return {
      icon: '❌',
      title: 'Permisos insuficientes',
      message: 'No tienes permisos para realizar esta acción en Salesforce',
      field: error.fields?.[0],
      suggestion: 'Contacta al administrador de Salesforce para que te otorgue los permisos necesarios.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // UNABLE_TO_LOCK_ROW
  if (error.errorCode === 'UNABLE_TO_LOCK_ROW') {
    return {
      icon: '⚠️',
      title: 'Registro en uso',
      message: 'El registro está siendo modificado por otro usuario o proceso',
      suggestion: 'Espera unos segundos e intenta nuevamente. El sistema reintentará automáticamente.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // FIELD_CUSTOM_VALIDATION_EXCEPTION
  if (error.errorCode === 'FIELD_CUSTOM_VALIDATION_EXCEPTION') {
    return {
      icon: '❌',
      title: 'Error de validación',
      message: error.message || 'El registro no cumple con las reglas de validación de Salesforce',
      suggestion: 'Verifica que todos los campos cumplan con las reglas de negocio definidas en Salesforce.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // INVALID_FIELD
  if (error.errorCode === 'INVALID_FIELD') {
    const field = error.fields?.[0] || 'desconocido';
    return {
      icon: '❌',
      title: 'Campo inválido',
      message: `El campo ${field} no existe o no es válido en este objeto de Salesforce`,
      field: error.fields?.[0],
      suggestion: 'Verifica que el campo existe en tu instancia de Salesforce. Puede que se haya eliminado o renombrado.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // STRING_TOO_LONG
  if (error.errorCode === 'STRING_TOO_LONG') {
    return {
      icon: '⚠️',
      title: 'Texto demasiado largo',
      message: 'Uno de los campos excede el tamaño máximo permitido',
      field: error.fields?.[0],
      suggestion: 'Reduce el tamaño del texto en el campo especificado.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // Error genérico de Salesforce
  if (error.message || error.errorCode) {
    return {
      icon: '❌',
      title: 'Error en Salesforce',
      message: error.message || `Error desconocido (${error.errorCode})`,
      field: error.fields?.[0],
      suggestion: 'Revisa los detalles técnicos para más información.',
      technical: JSON.stringify(error, null, 2)
    };
  }

  // Error completamente desconocido
  return {
    icon: '❌',
    title: 'Error desconocido',
    message: 'Ocurrió un error inesperado al procesar el lead',
    suggestion: 'Revisa los detalles técnicos o contacta al soporte.',
    technical: typeof errorInput === 'string' ? errorInput : JSON.stringify(errorInput, null, 2)
  };
}

/**
 * Extrae el mensaje principal de un error para logs
 */
export function getErrorMessage(error: any): string {
  const friendly = translateSalesforceError(error);
  return friendly.message;
}

/**
 * Determina si un error es crítico o solo una advertencia
 */
export function isWarningError(error: any): boolean {
  const friendly = translateSalesforceError(error);
  return friendly.icon === '⚠️';
}
