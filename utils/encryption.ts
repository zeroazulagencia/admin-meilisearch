import crypto from 'crypto';

// CRÍTICO: ENCRYPTION_KEY debe estar configurada en variables de entorno
// Si no está configurada, la aplicación NO funcionará correctamente
// y los tokens encriptados se corromperán al intentar desencriptarlos
// NOTA: Esta validación solo se ejecuta en el servidor (Node.js), no en el cliente (navegador)
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;

// Solo validar en el servidor (Node.js), no en el cliente (navegador)
const isServer = typeof window === 'undefined';

if (isServer && (!ENCRYPTION_KEY_RAW || ENCRYPTION_KEY_RAW.trim() === '')) {
  const error = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ERROR CRÍTICO: ENCRYPTION_KEY NO CONFIGURADA              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  La variable de entorno ENCRYPTION_KEY no está configurada.                 ║
║                                                                              ║
║  CONSECUENCIAS:                                                              ║
║  - Los tokens de WhatsApp NO se podrán desencriptar correctamente           ║
║  - Los tokens se corromperán al intentar desencriptarlos                    ║
║  - La aplicación NO funcionará correctamente                                ║
║                                                                              ║
║  SOLUCIÓN:                                                                   ║
║  1. Agregar ENCRYPTION_KEY al archivo .env del servidor                     ║
║  2. Usar una clave fija y persistente (mínimo 32 caracteres)                ║
║  3. NUNCA cambiar esta clave una vez que los tokens estén encriptados       ║
║                                                                              ║
║  Ejemplo en .env:                                                            ║
║  ENCRYPTION_KEY=tu_clave_secreta_de_al_menos_32_caracteres_aqui             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `;
  console.error(error);
  throw new Error('ENCRYPTION_KEY no está configurada. Por favor, configura esta variable de entorno antes de continuar.');
}

// Después de la validación, TypeScript sabe que ENCRYPTION_KEY no puede ser undefined en el servidor
// En el cliente, será undefined pero las funciones de encriptación no se usarán allí
const ENCRYPTION_KEY: string = ENCRYPTION_KEY_RAW || '';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Encripta un texto usando AES-256-GCM
 * NOTA: Esta función solo funciona en el servidor (Node.js), no en el cliente
 */
export function encrypt(text: string): string {
  if (!text || text.trim() === '') {
    return '';
  }
  
  // Verificar que estamos en el servidor y que ENCRYPTION_KEY está configurada
  if (typeof window !== 'undefined') {
    throw new Error('La función encrypt() solo puede usarse en el servidor. No se puede encriptar en el cliente.');
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.trim() === '') {
    throw new Error('ENCRYPTION_KEY no está configurada en el servidor.');
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derivar clave desde ENCRYPTION_KEY usando PBKDF2
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combinar salt + iv + tag + encrypted
    return salt.toString('hex') + iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Error encrypting:', error);
    throw new Error('Error al encriptar el texto');
  }
}

/**
 * Desencripta un texto encriptado usando AES-256-GCM
 * NOTA: Esta función solo funciona en el servidor (Node.js), no en el cliente
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || encryptedText.trim() === '') {
    return '';
  }
  
  // Verificar que estamos en el servidor y que ENCRYPTION_KEY está configurada
  if (typeof window !== 'undefined') {
    throw new Error('La función decrypt() solo puede usarse en el servidor. No se puede desencriptar en el cliente.');
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.trim() === '') {
    throw new Error('ENCRYPTION_KEY no está configurada en el servidor.');
  }
  
  try {
    // Verificar que el texto encriptado tenga la longitud mínima
    if (encryptedText.length < ENCRYPTED_POSITION) {
      // Si es muy corto, probablemente no está encriptado (backward compatibility)
      return encryptedText;
    }
    
    const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), 'hex');
    const iv = Buffer.from(encryptedText.slice(SALT_LENGTH * 2, TAG_POSITION * 2), 'hex');
    const tag = Buffer.from(encryptedText.slice(TAG_POSITION * 2, ENCRYPTED_POSITION * 2), 'hex');
    const encrypted = encryptedText.slice(ENCRYPTED_POSITION * 2);
    
    // Derivar clave desde ENCRYPTION_KEY usando PBKDF2
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Error decrypting:', error);
    // CRÍTICO: Si falla la desencriptación, NO devolver el texto encriptado
    // Esto podría causar que se guarde un token corrupto
    // En su lugar, lanzar un error para que el código que llama maneje la situación
    throw new Error(`Error al desencriptar: La clave de encriptación puede haber cambiado o el token está corrupto. Verifica que ENCRYPTION_KEY esté configurada correctamente.`);
  }
}

/**
 * Muestra solo los primeros caracteres de un texto (para mostrar en UI)
 */
export function maskSensitiveValue(value: string | null | undefined, visibleChars: number = 4): string {
  if (!value || value.trim() === '') {
    return '';
  }
  
  // Si el valor parece estar encriptado (muy largo y solo hex), mostrar solo los primeros caracteres visibles
  if (value.length > 50 && /^[0-9a-f]+$/i.test(value)) {
    // Probablemente encriptado, mostrar solo los primeros caracteres visibles
    return value.substring(0, visibleChars) + '...';
  }
  
  // Si es texto plano, mostrar solo los primeros caracteres
  if (value.length > visibleChars) {
    return value.substring(0, visibleChars) + '...';
  }
  
  return value;
}

/**
 * Verifica si un valor parece estar encriptado
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  
  // Los valores encriptados son muy largos y solo contienen caracteres hexadecimales
  return value.length > 50 && /^[0-9a-f]+$/i.test(value);
}

/**
 * Genera un hash SHA-256 de un token para comparación segura
 */
export function hashToken(token: string | null | undefined): string {
  if (!token || token.trim() === '') {
    return '';
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Valida que un token tenga formato y longitud válidos
 */
export function isValidToken(token: string | null | undefined, minLength: number = 20): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const trimmed = token.trim();
  
  // No debe estar vacío
  if (trimmed === '') {
    return false;
  }
  
  // No debe terminar en '...' (enmascarado)
  if (trimmed.endsWith('...')) {
    return false;
  }
  
  // Debe tener longitud mínima
  if (trimmed.length < minLength) {
    return false;
  }
  
  return true;
}

/**
 * Valida que un campo WhatsApp (no-token) tenga un valor válido
 * Usado para whatsapp_business_account_id y whatsapp_phone_number_id
 */
export function isValidWhatsAppField(value: string | null | undefined, minLength: number = 1): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const trimmed = value.trim();
  
  // No debe estar vacío
  if (trimmed === '') {
    return false;
  }
  
  // Debe tener longitud mínima
  if (trimmed.length < minLength) {
    return false;
  }
  
  return true;
}

