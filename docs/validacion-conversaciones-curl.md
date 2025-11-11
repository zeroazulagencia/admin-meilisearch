# Validación de Conversaciones con cURL

Este documento explica cómo usar `curl` para validar los datos que arroja la página de conversaciones en `https://workers.zeroazul.com/conversaciones`.

## Configuración Base

### Endpoint de Meilisearch
```
https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search
```

### Token de Autorización
```
Seph1rot*.*Cloud
```

## Comandos Básicos

### 1. Buscar todas las conversaciones de un agente

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 100,
    "offset": 0,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime", "message-Human", "message-AI"]
  }'
```

### 2. Verificar total de conversaciones de un agente

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1,
    "offset": 0
  }' | jq '.estimatedTotalHits'
```

### 3. Buscar conversaciones con user_id y phone_id válidos

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 0,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime"]
  }' | jq '.hits[] | select(.user_id != null and .user_id != "unknown" and .user_id != "" and (.phone_id != null and .phone_id != "" and .phone_id != "unknown" or .phone_number_id != null and .phone_number_id != "" and .phone_number_id != "unknown")) | {id, user_id, phone_id: (.phone_id // .phone_number_id), datetime}'
```

### 4. Buscar conversaciones por rango de offset (paginación)

```bash
# Del offset 0 al 1000
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 0,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime"]
  }'

# Del offset 1000 al 2000
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 1000,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime"]
  }'
```

### 5. Buscar conversaciones por rango de fechas

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\"",
      "datetime >= \"2024-11-01T00:00:00Z\"",
      "datetime <= \"2024-11-30T23:59:59Z\""
    ],
    "limit": 1000,
    "offset": 0,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime"]
  }'
```

### 6. Buscar conversaciones con texto específico

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "texto a buscar",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 100,
    "offset": 0,
    "attributesToRetrieve": ["id", "user_id", "phone_id", "phone_number_id", "datetime", "message-Human", "message-AI"]
  }'
```

## Validación de Datos

### Verificar conversaciones con user_id válido

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select(.user_id != null and .user_id != "unknown" and .user_id != "")] | length'
```

### Verificar conversaciones con phone_id válido

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select((.phone_id != null and .phone_id != "" and .phone_id != "unknown") or (.phone_number_id != null and .phone_number_id != "" and .phone_number_id != "unknown"))] | length'
```

### Verificar conversaciones con ambos campos válidos

```bash
curl -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": [
      "agent = \"Comfamiliar\""
    ],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select(.user_id != null and .user_id != "unknown" and .user_id != "" and ((.phone_id != null and .phone_id != "" and .phone_id != "unknown") or (.phone_number_id != null and .phone_number_id != "" and .phone_number_id != "unknown")))] | length'
```

## Notas Importantes

1. **Campo `type`**: El campo `type` no es buscable en Meilisearch, por lo que NO debe incluirse en los filtros.

2. **Offset y Limit**: 
   - `offset`: Índice desde donde comenzar (0-indexed)
   - `limit`: Cantidad máxima de resultados a retornar
   - Si `estimatedTotalHits` es 1000, el último offset válido es 999

3. **Filtros válidos**:
   - `agent = "NombreDelAgente"`: Filtrar por agente
   - `datetime >= "2024-11-01T00:00:00Z"`: Filtrar por fecha desde
   - `datetime <= "2024-11-30T23:59:59Z"`: Filtrar por fecha hasta

4. **Campos de identificación**:
   - `user_id`: ID del usuario (debe ser válido, no "unknown" ni vacío)
   - `phone_id` o `phone_number_id`: ID del teléfono (debe ser válido, no "unknown" ni vacío)

5. **Formato de fechas**: Las fechas deben estar en formato ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`

## Ejemplo Completo de Validación

```bash
# 1. Obtener total de conversaciones
TOTAL=$(curl -s -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": ["agent = \"Comfamiliar\""],
    "limit": 1,
    "offset": 0
  }' | jq '.estimatedTotalHits')

echo "Total de conversaciones: $TOTAL"

# 2. Contar conversaciones con user_id válido
VALID_USER=$(curl -s -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": ["agent = \"Comfamiliar\""],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select(.user_id != null and .user_id != "unknown" and .user_id != "")] | length')

echo "Conversaciones con user_id válido: $VALID_USER"

# 3. Contar conversaciones con phone_id válido
VALID_PHONE=$(curl -s -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": ["agent = \"Comfamiliar\""],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select((.phone_id != null and .phone_id != "" and .phone_id != "unknown") or (.phone_number_id != null and .phone_number_id != "" and .phone_number_id != "unknown"))] | length')

echo "Conversaciones con phone_id válido: $VALID_PHONE"

# 4. Contar conversaciones con ambos campos válidos
VALID_BOTH=$(curl -s -X POST \
  "https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Seph1rot*.*Cloud" \
  -d '{
    "q": "",
    "filter": ["agent = \"Comfamiliar\""],
    "limit": 1000,
    "offset": 0
  }' | jq '[.hits[] | select(.user_id != null and .user_id != "unknown" and .user_id != "" and ((.phone_id != null and .phone_id != "" and .phone_id != "unknown") or (.phone_number_id != null and .phone_number_id != "" and .phone_number_id != "unknown")))] | length')

echo "Conversaciones con ambos campos válidos: $VALID_BOTH"
```

