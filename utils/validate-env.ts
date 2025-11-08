/**
 * Validación de variables de entorno críticas al inicio de la aplicación
 * Este módulo se importa en los endpoints de API para validar configuración
 */

export function validateCriticalEnvVars() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // CRÍTICO: ENCRYPTION_KEY es obligatoria
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.trim() === '') {
    errors.push('ENCRYPTION_KEY: No configurada. Esta variable es OBLIGATORIA para encriptar/desencriptar tokens de WhatsApp.');
  } else if (process.env.ENCRYPTION_KEY.length < 32) {
    warnings.push('ENCRYPTION_KEY: La clave es muy corta (mínimo recomendado: 32 caracteres).');
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
║  Por favor, configura las variables de entorno en el archivo .env            ║
║  antes de reiniciar la aplicación.                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
    console.error(errorMessage);
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

  return { errors, warnings };
}

