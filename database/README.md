# Base de Datos MySQL - Admin Dworkers

## Descripción
Base de datos MySQL para gestionar clientes y agentes del sistema.

## Estructura

### Tabla: clients
- `id` - Clave primaria, auto-incremental
- `name` - Nombre del cliente (requerido)
- `email` - Email único del cliente
- `phone` - Teléfono de contacto
- `company` - Nombre de la empresa
- `status` - Estado: active, inactive, pending
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Tabla: agents
- `id` - Clave primaria, auto-incremental
- `client_id` - Clave foránea a clients.id (relación 1:N)
- `name` - Nombre del agente (requerido)
- `email` - Email del agente
- `phone` - Teléfono del agente
- `agent_code` - Código único del agente
- `status` - Estado: active, inactive, pending
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

## Uso

### En Local
```bash
# Desde la línea de comandos de MySQL
mysql -u root -p < database/schema.sql

# O conectarse y ejecutar
mysql -u root -p
source database/schema.sql;
```

### En Servidor
```bash
# Conectar al servidor
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45

# Acceder a MySQL
mysql -u root -p

# Ejecutar esquema
source /home/bitnami/admin-meilisearch/database/schema.sql;
```

## 🧩 Tablas de Módulos Personalizados

Cada módulo del sistema tiene sus propias tablas **completamente aisladas** del sistema base. Ninguna tabla de módulo tiene foreign keys hacia las tablas del sistema (`clients`, `agents`, etc.).

### Convención de Naming

```
modulos_{agent_name}_{agent_id}_{purpose}
```

**Ejemplos:**
| Módulo | Agent | agent_id | Tablas |
|--------|-------|----------|--------|
| Log Leads SUVI (ID 1) | suvi | 12 | `modulos_suvi_12_leads`, `modulos_suvi_12_config` |
| Generador Carta Laboral (ID 3) | lucas | 9 | `modulos_lucas_9_cartas`, `modulos_lucas_9_config` |

### Archivos de Migración

Los archivos SQL de cada módulo siguen la misma convención:
```
database/migration_create_modulos_{agent}_{id}_{purpose}.sql
```

### Tabla `_config` (estándar para todos los módulos)

Cada módulo tiene una tabla de configuración con esta estructura base:
```sql
CREATE TABLE modulos_{agent}_{id}_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Reglas de Aislamiento

- ✅ Cada módulo crea y gestiona sus propias tablas
- ✅ Los archivos de migración se guardan en `/database/`
- ❌ Las tablas de módulos NO referencian tablas del sistema base
- ❌ NO ejecutar `schema.sql` en producción con datos existentes — usar migraciones individuales

## Comandos Útiles

### Ver base de datos
```sql
SHOW DATABASES;
USE admin_dworkers;
SHOW TABLES;
```

### Ver estructura de tablas
```sql
DESCRIBE clients;
DESCRIBE agents;
```

### Ver datos
```sql
SELECT * FROM clients;
SELECT * FROM agents;
```

### Verificar relación
```sql
SELECT c.name AS client, a.name AS agent, a.agent_code 
FROM clients c 
LEFT JOIN agents a ON c.id = a.client_id;
```

## Migración al Servidor

Los archivos SQL se encuentran en `/database/` del proyecto y pueden ser subidos al servidor junto con el resto del código.

