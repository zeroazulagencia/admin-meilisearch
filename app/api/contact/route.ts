import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'zero@zeroazul.com';
const SENDGRID_TO_EMAIL = process.env.SENDGRID_TO_EMAIL || 'cristia.parada@zeroazul.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, honeypot, browserData } = body;

    // Validar honeypot - si tiene valor, es spam
    if (honeypot && honeypot.trim() !== '') {
      console.log('Spam detectado por honeypot:', honeypot);
      return NextResponse.json({ ok: false, error: 'Error al enviar el mensaje' }, { status: 400 });
    }

    // Validar campos requeridos
    if (!name || !email || !phone || !message) {
      return NextResponse.json({ ok: false, error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // Obtener IP del cliente
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'Desconocida';

    // Intentar obtener país desde IP usando ipapi.co (gratis)
    let country = 'Desconocido';
    try {
      if (ip && ip !== 'Desconocida') {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/country_name/`, {
          headers: { 'User-Agent': 'DWORKERS-Contact-Form' }
        });
        if (geoResponse.ok) {
          const countryText = await geoResponse.text();
          country = countryText.trim() || 'Desconocido';
        }
      }
    } catch (geoError) {
      console.log('No se pudo obtener país desde IP:', geoError);
    }

    // Preparar datos del navegador
    const browserInfo = browserData || {};
    const userAgent = request.headers.get('user-agent') || 'Desconocido';

    // Crear HTML del email con formato bonito
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Raleway', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #5DE1E5 0%, #4BC5C9 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #000; margin: 0; font-size: 24px; font-weight: bold; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .field { margin-bottom: 20px; }
            .field-label { font-weight: bold; color: #5DE1E5; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
            .field-value { color: #333; font-size: 16px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
            .metadata { background: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .metadata-title { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; }
            .metadata-item { font-size: 13px; color: #555; margin: 5px 0; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nuevo Contacto desde DWORKERS</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">Nombre</div>
                <div class="field-value">${name}</div>
              </div>
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value">${email}</div>
              </div>
              <div class="field">
                <div class="field-label">Teléfono</div>
                <div class="field-value">${phone}</div>
              </div>
              <div class="field">
                <div class="field-label">Mensaje</div>
                <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="metadata">
                <div class="metadata-title">Información Técnica</div>
                <div class="metadata-item"><strong>IP:</strong> ${ip}</div>
                <div class="metadata-item"><strong>País:</strong> ${country}</div>
                <div class="metadata-item"><strong>Navegador:</strong> ${browserInfo.browser || 'Desconocido'}</div>
                <div class="metadata-item"><strong>Sistema Operativo:</strong> ${browserInfo.os || 'Desconocido'}</div>
                <div class="metadata-item"><strong>Resolución:</strong> ${browserInfo.screen || 'Desconocida'}</div>
                <div class="metadata-item"><strong>User Agent:</strong> ${userAgent}</div>
                <div class="metadata-item"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}</div>
              </div>
            </div>
            <div class="footer">
              <p>Este mensaje fue enviado desde el formulario de contacto de DWORKERS</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar email con SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: SENDGRID_TO_EMAIL }],
            subject: `Nuevo contacto desde DWORKERS - ${name}`,
          },
        ],
        from: { email: SENDGRID_FROM_EMAIL, name: 'DWORKERS Zero Azul' },
        content: [
          {
            type: 'text/html',
            value: emailHtml,
          },
        ],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error('Error en SendGrid:', errorText);
      return NextResponse.json(
        { ok: false, error: 'Error al enviar el mensaje. Por favor intenta nuevamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Mensaje enviado correctamente' });
  } catch (error: any) {
    console.error('Error en API de contacto:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

