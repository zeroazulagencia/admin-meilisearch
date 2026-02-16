/**
 * Validadores simples para datos del lead
 * Parte del módulo log-leads-suvi
 */

/**
 * Valida que un RecordTypeId no esté vacío
 */
export function validateRecordTypeId(typeId: string | null | undefined): boolean {
  if (!typeId) return false;
  if (typeof typeId !== 'string') return false;
  return typeId.trim() !== '';
}

/**
 * Valida formato de email básico
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (typeof email !== 'string') return false;
  
  // Regex básico para email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida que el nombre no esté vacío ni sea un placeholder
 */
export function validateName(name: string | null | undefined): boolean {
  if (!name) return false;
  if (typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  if (trimmed === '') return false;
  if (trimmed.toLowerCase() === 'sin nombre') return false;
  if (trimmed.toLowerCase() === 'sin apellido') return false;
  
  return true;
}

/**
 * Valida que el teléfono tenga al menos 7 dígitos
 */
export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  if (typeof phone !== 'string') return false;
  
  // Extraer solo dígitos
  const digits = phone.replace(/\D/g, '');
  
  // Debe tener al menos 7 dígitos
  return digits.length >= 7;
}

/**
 * Valida que un ID de Salesforce tenga el formato correcto
 * IDs de Salesforce son de 15 o 18 caracteres alfanuméricos
 */
export function validateSalesforceId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  
  const trimmed = id.trim();
  
  // Debe tener 15 o 18 caracteres
  if (trimmed.length !== 15 && trimmed.length !== 18) return false;
  
  // Solo caracteres alfanuméricos
  return /^[a-zA-Z0-9]+$/.test(trimmed);
}

/**
 * Valida datos enriquecidos por IA antes de enviar a Salesforce
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnrichedData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Email es crítico
  if (!validateEmail(data?.email)) {
    errors.push('Email inválido o faltante');
  }

  // Nombre es importante pero no crítico
  if (!validateName(data?.fullname)) {
    warnings.push('Nombre completo no está definido');
  }

  // Teléfono es importante pero no crítico
  if (!validatePhone(data?.phone)) {
    warnings.push('Teléfono inválido o faltante');
  }

  // País debe existir
  if (!data?.pais_salesforce || data.pais_salesforce.trim() === '') {
    warnings.push('País no está definido');
  }

  // Prefijo debe existir
  if (!data?.prefijo || data.prefijo.trim() === '') {
    warnings.push('Prefijo telefónico no está definido');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida datos de cuenta antes de enviar a Salesforce
 */
export function validateAccountData(accountData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Nombre es obligatorio
  if (!accountData?.Name || accountData.Name.trim() === '') {
    errors.push('El nombre de la cuenta es obligatorio');
  }

  // Teléfono debería existir
  if (!accountData?.Phone) {
    warnings.push('La cuenta no tiene teléfono');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida datos de oportunidad antes de enviar a Salesforce
 */
export function validateOpportunityData(opportunityData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Campos obligatorios en Salesforce
  if (!opportunityData?.Name || opportunityData.Name.trim() === '') {
    errors.push('El nombre de la oportunidad es obligatorio');
  }

  if (!validateSalesforceId(opportunityData?.AccountId)) {
    errors.push('AccountId inválido');
  }

  if (!opportunityData?.CloseDate) {
    errors.push('CloseDate es obligatorio');
  }

  if (!opportunityData?.StageName) {
    errors.push('StageName es obligatorio');
  }

  // Campos opcionales pero recomendados
  if (!validateSalesforceId(opportunityData?.OwnerId)) {
    warnings.push('OwnerId no está definido o es inválido');
  }

  if (!validateSalesforceId(opportunityData?.Proyecto__c)) {
    warnings.push('Proyecto no está definido o es inválido');
  }

  if (opportunityData?.RecordTypeId && !validateSalesforceId(opportunityData.RecordTypeId)) {
    warnings.push('RecordTypeId tiene formato inválido');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
