# Guía de Despliegue - Admin Meilisearch

## Configuración del Servidor (AWS Lightsail)

### 1. Conectar al servidor
```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
```

### 2. Instalar Node.js y Git
```bash
# Actualizar el sistema
sudo apt update

# Instalar Node.js (si no está instalado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git (si no está instalado)
sudo apt-get install -y git

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 3. Clonar el repositorio
```bash
cd /home/bitnami
git clone https://github.com/zeroazulagencia/admin-meilisearch.git
cd admin-meilisearch
```

### 4. Instalar dependencias
```bash
npm install
```

### 5. Configurar variables de entorno
```bash
# Crear archivo .env
nano .env
```

Agregar:
```
OPENAI_API_KEY=tu-api-key-aqui
```

### 6. Construir la aplicación
```bash
npm run build
```

### 7. Iniciar con PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Configurar Nginx (opcional, si quieres usar dominio)
```bash
sudo nano /etc/nginx/sites-available/admin-meilisearch
```

Agregar:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:8989;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar:
```bash
sudo ln -s /etc/nginx/sites-available/admin-meilisearch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Actualización del Código

### Desde tu máquina local:

1. Hacer cambios en el código
2. Commit y push:
```bash
git add .
git commit -m "Descripción de los cambios"
git push origin master
```

### En el servidor:

```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
cd /home/bitnami/admin-meilisearch
git pull origin master
npm install
npm run build
pm2 restart admin-meilisearch
```

## Acceso

- URL: http://34.230.189.45:8989
- O si configuraste Nginx: http://tu-dominio.com

## Comandos Útiles

```bash
# Ver logs
pm2 logs admin-meilisearch

# Ver estado
pm2 status

# Reiniciar
pm2 restart admin-meilisearch

# Detener
pm2 stop admin-meilisearch

# Ver monitoreo
pm2 monit
```

