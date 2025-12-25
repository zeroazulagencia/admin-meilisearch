# Solución: Problema de Corrupción de Tokens WhatsApp

## 🔴 Problema Identificado

Los tokens de WhatsApp se corrompen cada vez que se hace deploy porque:

1. **ENCRYPTION_KEY no está configurada en el servidor**
2. El código genera una nueva clave aleatoria cada vez que se reinicia
3. Con una clave diferente, los tokens encriptados no se pueden desencriptar
4. El código intenta "reparar" esto y termina corrompiendo los tokens

## ✅ Solución Implementada

### 1. ENCRYPTION_KEY ahora es OBLIGATORIA

- **Antes**: `const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');`
- **Ahora**: `const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;` + validación obligatoria

Si `ENCRYPTION_KEY` no está configurada, la aplicación **NO iniciará** y mostrará un error claro.

### 2. Validación al Inicio

Se creó `utils/validate-env.ts` que valida variables de entorno críticas:
- Verifica que `ENCRYPTION_KEY` esté configurada
- Verifica que tenga al menos 32 caracteres
- Muestra errores claros si falta

### 3. Mejor Manejo de Errores

- Si falla la desencriptación, **NO** intenta "reparar" el token
- Lanza un error claro indicando que la clave puede estar incorrecta
- Evita guardar tokens corruptos en la base de datos

### 4. Validación en Todos los Endpoints

Todos los endpoints que usan encriptación ahora validan `ENCRYPTION_KEY` al cargar:
- `/api/agents/[id]`
- `/api/whatsapp/send-message`
- `/api/whatsapp/verify-connection`
- `/api/whatsapp/get-templates`
- `/api/whatsapp/create-template`
- `/api/whatsapp/delete-template`

## 🚀 Pasos para Solucionar en el Servidor

### Paso 1: Conectar al Servidor
```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
cd /home/bitnami/admin-meilisearch
```

### Paso 2: Verificar si ENCRYPTION_KEY existe
```bash
cat .env | grep ENCRYPTION_KEY
```

### Paso 3: Si NO existe, configurarla

**OPCIÓN A: Si ya tienes tokens encriptados (RECOMENDADO)**
- Necesitas la clave original con la que se encriptaron los tokens
- Si no la tienes, los tokens actuales están corruptos y necesitarás reingresarlos

**OPCIÓN B: Si NO tienes tokens encriptados o puedes reingresarlos**
```bash
# Generar una nueva clave segura
openssl rand -hex 32

# Agregar al .env
echo "ENCRYPTION_KEY=tu_clave_generada_aqui" >> .env
```

### Paso 4: Verificar que esté configurada
```bash
cat .env | grep ENCRYPTION_KEY
```

### Paso 5: Reiniciar la aplicación
```bash
pm2 restart admin-meilisearch --update-env
```

### Paso 6: Verificar que la aplicación inició correctamente
```bash
pm2 logs admin-meilisearch --lines 50
```

Si ves el error de `ENCRYPTION_KEY no configurada`, la aplicación NO iniciará hasta que la configures.

## ⚠️ IMPORTANTE

1. **NUNCA cambiar** `ENCRYPTION_KEY` una vez que los tokens estén encriptados
2. Si cambias la clave, **todos los tokens se corromperán**
3. Guarda la clave de forma segura (password manager, etc.)
4. La clave debe ser **fija y persistente** (mínimo 32 caracteres)

## 🔍 Verificación

Después de configurar `ENCRYPTION_KEY`, verifica que:
1. La aplicación inicia sin errores
2. Los tokens se pueden desencriptar correctamente
3. Los tokens NO se corrompen en cada deploy

## 📝 Script de Verificación

Se creó `scripts/check-encryption-key.sh` para verificar la configuración:
```bash
./scripts/check-encryption-key.sh
```

Este script:
- Verifica si `ENCRYPTION_KEY` existe en `.env`
- Verifica que tenga al menos 32 caracteres
- Genera una nueva clave si no existe (solo si no tienes tokens encriptados)

