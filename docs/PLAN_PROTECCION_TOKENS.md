# Plan de Protección de Tokens WhatsApp - 100% Prevención

## Problema Identificado
Los tokens de WhatsApp se están sobrescribiendo accidentalmente, causando pérdida de datos críticos. Esto ha ocurrido múltiples veces a pesar de las protecciones implementadas.

## Análisis de Causas Raíz

### Posibles Causas:
1. **Frontend envía campos vacíos/enmascarados**: Aunque el código intenta filtrar, puede haber casos edge
2. **Backend procesa campos undefined/null**: JSON.stringify omite undefined, pero null o strings vacíos pueden pasar
3. **Comparación de tokens encriptados**: La comparación puede fallar si hay diferencias en el proceso de encriptación
4. **Race conditions**: Múltiples requests simultáneos pueden causar sobrescritura
5. **Falta de validación de integridad**: No hay verificación de que el token original se mantiene

## Solución: Protección Multi-Capa

### Capa 1: Frontend - Prevención Total
- **NUNCA** incluir campos de tokens en el body si están vacíos, undefined, null, o enmascarados
- Usar un flag explícito `update_tokens: true` solo cuando se quiere actualizar
- Validar que los tokens nuevos tengan longitud mínima antes de enviar
- Agregar confirmación explícita antes de enviar actualización de tokens

### Capa 2: Backend - Validación Estricta
- **NUNCA** actualizar tokens a menos que:
  1. El campo esté presente en el body **Y**
  2. El valor no sea `undefined`, `null`, vacío, o enmascarado **Y**
  3. El valor sea diferente del actual **Y**
  4. El valor tenga longitud mínima válida **Y**
  5. Haya un flag explícito `update_tokens: true` **Y**
  6. El token nuevo pase validación de formato

### Capa 3: Verificación de Integridad
- Antes de actualizar, obtener el token actual de la BD
- Comparar hash/checksum del token actual vs nuevo
- Solo actualizar si hay cambio real y válido
- Loggear hash del token antes y después de actualizar

### Capa 4: Sistema de Backup
- Antes de actualizar tokens, crear backup automático
- Guardar snapshot del token anterior
- Permitir rollback si hay error

### Capa 5: Auditoría Completa
- Loggear TODOS los intentos de actualización de tokens
- Incluir: timestamp, usuario, IP, valor anterior (hash), valor nuevo (hash), resultado
- Alertar si hay múltiples intentos de actualización en corto tiempo

### Capa 6: Bloqueo de Actualizaciones Simultáneas
- Usar locks/transacciones para prevenir race conditions
- Verificar que el token no haya cambiado entre lectura y escritura
- Usar optimistic locking con version numbers

## Implementación

### 1. Frontend (`app/agentes/[id]/editar/page.tsx`)
- Agregar flag `updateTokens` explícito
- Validar tokens antes de enviar
- Agregar confirmación modal antes de actualizar tokens
- Filtrar campos undefined/null/vacíos/enmascarados del body

### 2. Backend (`app/api/agents/[id]/route.ts`)
- Agregar validación de flag `update_tokens`
- Validar longitud mínima de tokens
- Validar formato de tokens
- Comparar hash antes de actualizar
- Usar transacciones con verificación de integridad
- Crear backup antes de actualizar

### 3. Middleware de Protección
- Crear middleware que intercepte todas las actualizaciones de agentes
- Validar que no se actualicen tokens sin flag explícito
- Bloquear actualizaciones sospechosas

### 4. Sistema de Logs
- Loggear todos los intentos de actualización
- Incluir información completa para auditoría
- Alertar sobre patrones sospechosos

## Validaciones Críticas

### Frontend:
```typescript
// Solo incluir tokens si:
1. Campo tiene valor no vacío
2. No termina en '...'
3. Tiene longitud mínima (ej: 20 caracteres)
4. Flag updateTokens === true
5. Usuario confirmó explícitamente
```

### Backend:
```typescript
// Solo actualizar tokens si:
1. Campo presente en body
2. Valor no es undefined/null/vacío/enmascarado
3. Valor tiene longitud mínima válida
4. Flag update_tokens === true
5. Valor es diferente del actual (comparar hash)
6. Token pasa validación de formato
7. No hay actualización simultánea (lock)
```

## Plan de Implementación

### Fase 1: Protección Inmediata (Crítica)
1. Agregar flag explícito `update_tokens` en frontend y backend
2. Validar longitud mínima de tokens
3. Agregar confirmación modal antes de actualizar
4. Filtrar campos undefined/null/vacíos/enmascarados

### Fase 2: Validación de Integridad
1. Comparar hash de tokens antes de actualizar
2. Usar transacciones con verificación
3. Crear backup automático antes de actualizar

### Fase 3: Auditoría y Monitoreo
1. Loggear todos los intentos de actualización
2. Alertar sobre patrones sospechosos
3. Implementar sistema de rollback

### Fase 4: Bloqueo de Race Conditions
1. Implementar locks para actualizaciones
2. Usar optimistic locking
3. Verificar integridad antes de commit

## Testing

### Casos de Prueba:
1. Actualizar agente sin tocar tokens → No debe actualizar tokens
2. Actualizar agente con campos vacíos → No debe actualizar tokens
3. Actualizar agente con campos enmascarados → No debe actualizar tokens
4. Actualizar agente con flag update_tokens=false → No debe actualizar tokens
5. Actualizar agente con flag update_tokens=true y token válido → Debe actualizar
6. Actualizar agente con token inválido → No debe actualizar, debe retornar error
7. Actualizaciones simultáneas → Solo una debe tener éxito

## Métricas de Éxito

- 0 actualizaciones accidentales de tokens
- 100% de intentos de actualización loggeados
- 100% de validaciones pasadas antes de actualizar
- Tiempo de respuesta < 500ms para validaciones

