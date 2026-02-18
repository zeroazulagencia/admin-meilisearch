-- Migración: Crear tabla principal para módulo Generador Carta Laboral (agent: lucas, agent_id: 9)
-- Módulo ID: 3
-- Versión: v1.0

USE admin_dworkers;

CREATE TABLE IF NOT EXISTS modulos_lucas_9_cartas (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Datos del empleado
  empleado_nombre       VARCHAR(255)  NOT NULL COMMENT 'Nombre completo del empleado',
  empleado_cedula       VARCHAR(50)   NOT NULL COMMENT 'Número de cédula del empleado',
  empleado_cargo        VARCHAR(255)  COMMENT 'Cargo del empleado',
  empleado_salario      DECIMAL(15,2) COMMENT 'Salario del empleado',
  empleado_tipo_contrato VARCHAR(100) COMMENT 'Tipo de contrato (indefinido, fijo, etc.)',
  empleado_fecha_ingreso DATE          COMMENT 'Fecha de ingreso a la empresa',

  -- Datos de la carta
  carta_motivo          VARCHAR(500)  COMMENT 'Motivo o destino de la carta (banco, visa, etc.)',
  carta_contenido       TEXT          COMMENT 'Contenido generado de la carta',
  carta_generada_por    VARCHAR(100)  DEFAULT 'IA' COMMENT 'Quién generó la carta (IA, manual)',

  -- Estado
  estado                ENUM('pendiente', 'generada', 'enviada', 'error') DEFAULT 'pendiente',
  error_message         TEXT          COMMENT 'Mensaje de error si falla la generación',

  -- Trazabilidad
  solicitado_via        VARCHAR(100)  COMMENT 'Canal de solicitud (whatsapp, web, chat)',
  conversation_id       VARCHAR(255)  COMMENT 'ID de conversación origen',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_cedula (empleado_cedula),
  INDEX idx_estado (estado),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT
  CASE
    WHEN COUNT(*) >= 0 THEN '✅ Tabla modulos_lucas_9_cartas creada correctamente'
    ELSE '❌ Error: tabla no creada'
  END AS resultado
FROM modulos_lucas_9_cartas;
