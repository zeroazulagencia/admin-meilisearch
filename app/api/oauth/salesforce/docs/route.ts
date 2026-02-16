import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configuración OAuth de Salesforce</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #1a202c;
      margin-bottom: 1rem;
      font-size: 2.5rem;
    }
    h2 {
      color: #2d3748;
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-size: 1.5rem;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }
    .status {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .success { border-left-color: #48bb78; background: #f0fff4; }
    .warning { border-left-color: #ed8936; background: #fffaf0; }
    .error { border-left-color: #f56565; background: #fff5f5; }
    .code {
      background: #2d3748;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    ol {
      margin-left: 2rem;
      line-height: 1.8;
    }
    li {
      margin: 0.5rem 0;
    }
    .btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin: 1rem 0;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .url-box {
      background: #edf2f7;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      word-break: break-all;
      margin: 0.5rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Configuración OAuth de Salesforce</h1>
    
    <div class="status success">
      ✅ Credenciales OAuth configuradas correctamente en la base de datos
    </div>

    <h2>📋 Paso 1: Configurar Connected App en Salesforce</h2>
    <ol>
      <li>Ve a <strong>Setup</strong> → <strong>App Manager</strong></li>
      <li>Busca tu Connected App (la que tiene la Consumer Key que proporcionaste)</li>
      <li>Click en <strong>Edit</strong></li>
      <li>En la sección <strong>Callback URL</strong>, agrega esta URL:</li>
      <div class="url-box">https://workers.zeroazul.com/api/oauth/salesforce/callback</div>
      <li>Guarda los cambios</li>
    </ol>

    <h2>🚀 Paso 2: Autorizar la Aplicación</h2>
    <p>Una vez configurado el callback, haz click en el siguiente botón para iniciar el flujo OAuth:</p>
    
    <a href="/api/oauth/salesforce/authorize" class="btn">
      🔑 Autorizar Salesforce
    </a>

    <p style="margin-top: 1rem; color: #718096;">
      Serás redirigido a Salesforce para autorizar la aplicación. Después de autorizar, serás redirigido de vuelta automáticamente.
    </p>

    <h2>🔍 Paso 3: Verificar Estado</h2>
    <p>Una vez autorizado, puedes verificar el estado de OAuth:</p>
    <div class="url-box">GET /api/oauth/salesforce/status</div>

    <h2>♻️ Renovación Automática</h2>
    <div class="status success">
      ✅ Los tokens se renovarán automáticamente cuando expiren
    </div>
    <p>El sistema detectará cuando el access token expire y lo renovará automáticamente usando el refresh token.</p>

    <h2>📚 Endpoints Disponibles</h2>
    <div class="code">
GET  /api/oauth/salesforce/status    # Estado de OAuth<br>
GET  /api/oauth/salesforce/authorize # Iniciar autorización<br>
GET  /api/oauth/salesforce/callback  # Callback (automático)<br>
POST /api/oauth/salesforce/refresh   # Renovar token manualmente
    </div>

    <h2>⚠️ Notas Importantes</h2>
    <ul style="margin-left: 2rem; line-height: 1.8;">
      <li>Los access tokens expiran cada 2 horas</li>
      <li>Los refresh tokens no expiran (se usan para obtener nuevos access tokens)</li>
      <li>La renovación es automática, no necesitas hacer nada manualmente</li>
      <li>Si eliminas el refresh token, deberás re-autorizar</li>
    </ul>

    <h2>🐛 Troubleshooting</h2>
    <p><strong>Si recibes "redirect_uri_mismatch":</strong></p>
    <ol>
      <li>Verifica que la URL en el Connected App sea exactamente:<br>
        <div class="url-box">https://workers.zeroazul.com/api/oauth/salesforce/callback</div>
      </li>
      <li>Guarda cambios en Salesforce</li>
      <li>Espera 5-10 minutos (los cambios pueden tardar)</li>
      <li>Intenta autorizar nuevamente</li>
    </ol>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
