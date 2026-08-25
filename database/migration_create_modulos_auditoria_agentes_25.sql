-- Migración: Módulo Auditoría Agentes (módulo 25)
-- Recibe y almacena resultados de auditorías automáticas de agentes conversacionales
-- (bots WhatsApp/Instagram vía Bird) generadas por un workflow de n8n.
-- Upsert por agente_id + período auditado. Tabla idempotente.

CREATE TABLE IF NOT EXISTS modulos_auditoria_agentes_25_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(255) NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modulos_auditoria_agentes_25_audits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agente_id VARCHAR(120) NOT NULL,
  cliente_id_workers VARCHAR(120) DEFAULT NULL,
  cliente_empresa VARCHAR(255) DEFAULT NULL,
  agent_display_name VARCHAR(255) DEFAULT NULL,
  plataforma VARCHAR(60) DEFAULT NULL,
  audit_start DATETIME NOT NULL,
  audit_end DATETIME NOT NULL,
  summary JSON,
  examples JSON,
  local_send_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_period (agente_id, audit_start, audit_end),
  KEY idx_agente (agente_id),
  KEY idx_cliente (cliente_id_workers),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;