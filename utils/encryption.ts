import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Encripta un texto usando AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text || text.trim() === '') {
    return '';
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
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || encryptedText.trim() === '') {
    return '';
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
    // Si falla la desencriptación, podría ser texto plano (backward compatibility)
    return encryptedText;
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

