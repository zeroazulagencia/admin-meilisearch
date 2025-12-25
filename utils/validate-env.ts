/**
 * Validación de variables de entorno críticas al inicio de la aplicación
 * Este módulo se importa en los endpoints de API para validar configuración
 * 
 * IMPORTANTE: Esta validación debe ejecutarse ANTES de cualquier operación
 * que involucre encriptación/desencriptación de tokens de WhatsApp.
 */

// Variable para rastrear si ya se validó (evitar múltiples validaciones)
let hasValidated = false;

export function validateCriticalEnvVars() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // CRÍTICO: ENCRYPTION_KEY es obligatoria
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey || encryptionKey.trim() === '') {
    errors.push('ENCRYPTION_KEY: No configurada. Esta variable es OBLIGATORIA para encriptar/desencriptar tokens de WhatsApp.');
  } else {
    const trimmedKey = encryptionKey.trim();
    if (trimmedKey.length < 32) {
      errors.push(`ENCRYPTION_KEY: La clave es muy corta (${trimmedKey.length} caracteres). Mínimo requerido: 32 caracteres.`);
    } else {
      // Validación adicional: verificar que no sea solo espacios o caracteres repetidos
      if (/^(.)\1+$/.test(trimmedKey)) {
        warnings.push('ENCRYPTION_KEY: La clave parece ser solo caracteres repetidos. Se recomienda usar una clave más segura.');
      }
    }
  }

  // Advertencias para otras variables importantes
  if (!process.env.MYSQL_HOST) {
    warnings.push('MYSQL_HOST: No configurada, usando default: localhost');
  }
  if (!process.env.MYSQL_PASSWORD) {
    warnings.push('MYSQL_PASSWORD: No configurada, puede causar errores de conexión');
  }
  if (!process.env.MYSQL_DATABASE) {
    warnings.push('MYSQL_DATABASE: No configurada, usando default: admin_dworkers');
  }

  // Si hay errores críticos, lanzar excepción
  if (errors.length > 0) {
    const errorMessage = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ERRORES CRÍTICOS DE CONFIGURACIÓN                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
${errors.map(e => `║  ❌ ${e.padEnd(76)}║`).join('\n')}
╠══════════════════════════════════════════════════════════════════════════════╣
║  La aplicación NO puede continuar sin estas variables configuradas.          ║
║                                                                              ║
║  SOLUCIÓN:                                                                   ║
║  1. Configura las variables de entorno en el archivo .env                   ║
║  2. Para ENCRYPTION_KEY: genera una clave segura con:                       ║
║     openssl rand -hex 32                                                     ║
║  3. Si ya tienes tokens encriptados, usa la clave original                  ║
║  4. Reinicia la aplicación después de configurar                             ║
║                                                                              ║
║  ⚠️  ADVERTENCIA: Si cambias ENCRYPTION_KEY, todos los tokens               ║
║     encriptados se corromperán.                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
    console.error(errorMessage);
    hasValidated = false;
    throw new Error(`Variables de entorno críticas no configuradas: ${errors.join(', ')}`);
  }

  // Si hay advertencias, solo loguearlas
  if (warnings.length > 0) {
    const warningMessage = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         ADVERTENCIAS DE CONFIGURACIÓN                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
${warnings.map(w => `║  ⚠️  ${w.padEnd(76)}║`).join('\n')}
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
    console.warn(warningMessage);
  }

  // Marcar como validado solo si no hay errores
  if (errors.length === 0) {
    hasValidated = true;
  }

  return { errors, warnings };
}

/**
 * Verifica si la validación ya se ejecutó exitosamente
 * Útil para evitar validaciones redundantes
 */
export function hasValidatedEnv(): boolean {
  return hasValidated;
}

/**
 * Fuerza una nueva validación (útil para testing o cambios dinámicos)
 */
export function resetValidation(): void {
  hasValidated = false;
}

