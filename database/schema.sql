-- Admin Dworkers - Base de Datos MySQL
-- Versión: v18.8

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS admin_dworkers CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE admin_dworkers;

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    company VARCHAR(255),
    clave VARCHAR(255),
    permissions JSON,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_name (name),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Agentes (relación 1:N con clients)
CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    agent_code VARCHAR(100) UNIQUE,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    description TEXT,
    photo VARCHAR(500),
    knowledge JSON,
    workflows JSON,
    conversation_agent_name VARCHAR(255),
    reports_agent_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_status (status),
    INDEX idx_agent_code (agent_code),
    INDEX idx_conversation_agent_name (conversation_agent_name),
    INDEX idx_reports_agent_name (reports_agent_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos de ejemplo (opcional)
INSERT INTO clients (name, email, phone, company, clave, status) VALUES
    ('Zero Azul Agencia', 'admin@zeroazul.com', '+573001234567', 'Zero Azul', 'admin123', 'active');

INSERT INTO agents (client_id, name, email, agent_code, status) VALUES
    (1, 'amavu', 'amavu@zeroazul.com', 'amavu', 'active'),
    (1, 'amistoso', 'amistoso@zeroazul.com', 'amistoso', 'active');

