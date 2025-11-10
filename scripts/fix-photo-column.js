const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Leer variables de entorno del archivo .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function fixPhotoColumn() {
  let connection;
  try {
    // Usar variables MYSQL_* o DB_* según estén disponibles
    const dbConfig = {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'admin_dworkers',
    };

    connection = await mysql.createConnection(dbConfig);

    console.log('Ejecutando migración: ALTER TABLE agents MODIFY COLUMN photo TEXT');
    await connection.execute('ALTER TABLE agents MODIFY COLUMN photo TEXT');
    console.log('✅ Migración ejecutada exitosamente');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
      console.log('⚠️  La columna ya es de tipo TEXT o la migración ya fue ejecutada');
    } else {
      console.error('❌ Error ejecutando migración:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPhotoColumn();

