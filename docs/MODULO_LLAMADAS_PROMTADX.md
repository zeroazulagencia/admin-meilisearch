# Modulo de Llamadas PromtaDx

## Descripcion

Modulo de llamadas de voz basado en Twilio Programmable Voice. Permite que clientes inicien llamadas desde un link publico y un asesor las atienda desde el panel de administracion.

## Flujo de una llamada

1. El cliente abre el link publico (`https://bit.ly/promtadx`)
2. Si el asesor esta en linea, se crea una sala automaticamente
3. Si el asesor esta ocupado, el cliente espera hasta que se libere (polling cada 3s)
4. Si el asesor esta desconectado, se muestra un mensaje al cliente
5. El asesor ve la llamada entrante en su panel y la atiende via modal inline
6. Ambos se conectan a la misma conferencia de voz via Twilio
7. Al finalizar, se registra la duracion y el asesor queda disponible

## Arquitectura

### Paginas

| Ruta | Tipo | Descripcion |
|------|------|-------------|
| `/custom-module5/llamada-sara/llamar` | Publica | Pagina del cliente para iniciar llamada |
| `/custom-module5/llamada-sara/[room]` | Publica | Pagina de sala (legacy, el asesor usa modal) |
| `/modulos/5` | Protegida | Panel del asesor con 5 tabs |

### Tabs del panel asesor

- **Panel Asesor**: Toggle online/offline, notificacion de llamada entrante, modal de llamada, link publico
- **Historial**: Filtros por ano/mes, estadisticas (total llamadas, minutos, promedio), tabla con audio playback
- **Uso y Creditos**: Balance, minutos, llamadas, costo estimado (tarifa 3x)
- **Credenciales**: Account SID, API Key SID, API Key Secret, TwiML App SID
- **Documentacion**: Flujo, endpoints, tablas

### Endpoints API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/custom-module5/llamada-sara/asesor/estado` | Estado del asesor + auto-limpieza stale (>10 min) |
| POST | `/api/custom-module5/llamada-sara/asesor/estado` | Toggle online/offline/reset |
| POST | `/api/custom-module5/llamada-sara/cliente/solicitar` | Cliente solicita llamada |
| POST | `/api/custom-module5/llamada-sara/finalizar` | Finaliza llamada, calcula duracion |
| GET | `/api/custom-module5/llamada-sara/token` | Genera Twilio Access Token (?room=X&role=Y) |
| POST | `/api/custom-module5/llamada-sara/twiml` | Webhook TwiML para Twilio (Voice URL) |
| GET | `/api/custom-module5/llamada-sara/llamadas` | Lista llamadas con filtros (?year=&month=) |
| DELETE | `/api/custom-module5/llamada-sara/llamadas/[room]` | Elimina una llamada |
| GET | `/api/custom-module5/llamada-sara/uso` | Uso y creditos de Twilio |
| GET/PUT | `/api/custom-module5/llamada-sara/config` | Credenciales Twilio |
| POST | `/api/custom-module5/llamada-sara/recording-callback` | Callback de grabacion Twilio |
| GET | `/api/custom-module5/llamada-sara/recording` | Proxy autenticado para audio (?url=) |

### Tablas en la base de datos

```sql
-- Credenciales Twilio + config grabacion
modulos_sara_11_config (config_key, config_value, is_encrypted)

-- Registro de llamadas
modulos_sara_11_llamadas (id, room_id, estado, creado_por, cliente_id, inicio_llamada, fin_llamada, duracion_segundos, recording_url, created_at)

-- Estado del asesor
modulos_sara_11_asesores (id, asesor_id, estado [offline|online|ocupado], room_activo, ultima_actividad, created_at)
```

## Configuracion requerida en Twilio

1. Crear una **TwiML App** en Twilio Console
2. En la TwiML App, configurar **Voice URL**: `https://workers.zeroazul.com/api/custom-module5/llamada-sara/twiml` (Method: POST)
3. Crear un **API Key** (tipo: Standard)
4. En el panel de credenciales del modulo, guardar:
   - Account SID
   - API Key SID
   - API Key Secret
   - TwiML App SID

## Proteccion contra estado stale

- **Auto-limpieza**: Cada consulta al estado del asesor verifica si lleva >10 min en "ocupado". Si es asi, resetea automaticamente a "online" y finaliza llamadas huerfanas.
- **Reset manual**: Boton "Forzar reset" visible cuando el asesor esta en estado "ocupado".
- **Endpoint reset**: `POST /asesor/estado` con `{ estado: "reset" }` limpia todo el estado.

## Tarifa

Los costos de Twilio se multiplican por 3 en la UI (balance y costo estimado). Etiqueta: "Tarifa Zero Azul Promta Dx 3x".

## Archivos principales

```
modules-custom/llamada-sara/index.tsx          -- Componente principal (5 tabs + modal llamada)
app/custom-module5/llamada-sara/llamar/page.tsx -- Pagina publica del cliente
app/custom-module5/llamada-sara/[room]/page.tsx -- Pagina de sala (legacy)
app/api/custom-module5/llamada-sara/           -- Todos los endpoints API
```

## Pendiente

- Verificar audio bidireccional con cuenta Twilio activa
- Probar grabacion de llamadas y playback via proxy
