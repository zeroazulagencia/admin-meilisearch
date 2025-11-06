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

