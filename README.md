# Cobao NFC - Sistema de Gestion de Entrada

Sistema web para la gestion de entrada y control de acceso mediante credenciales NFC para el Colegio de Bachilleres COBAO Plantel 27 Miahuatlan.

## Tecnologias

- React 19.2 + TypeScript + Vite 8.1
- react-router-dom 7.18, Lucide React (iconografia), Recharts (graficas)
- jsPDF (PDF), SheetJS/xlsx (Excel)
- Backend: FastAPI + SQLAlchemy (async) + PostgreSQL 16
- Lector NFC ACR122U (protocolo PC/SC)
- Docker Compose (backend + frontend + BD en un solo contenedor + Postgres)

## Estructura del proyecto

```
frontend (raiz)
  src/
    components/Layout.tsx    -- Layout con barra lateral por rol
    pages/                   -- Dashboard, Alumnos, Grupos, Credenciales, Permisos,
                                Incidencias, Reportes, Escaneo NFC, Configuracion,
                                Login, KioscoEntradas, etc.
    api/                     -- clientes axios por modulo (alumnos, credenciales,
                                reposiciones, reportes programados, nfc, auth...)
    context/AuthContext.tsx  -- Autenticacion (JWT) y rol del usuario
    utils/                   -- generadores de PDF (credenciales, listas)
  nfc_reader.py              -- Puente lector USB <-> backend (se ejecuta externo en Windows)
  iniciar_nfc.bat            -- Arranca el lector (usa nfc_reader.exe si existe, si no Python)
  iniciar_nfc_silencioso.vbs -- Auto-inicio en Windows (carpeta Inicio)
  build_nfc_reader.bat       -- Empaqueta nfc_reader.py en nfc_reader.exe (PyInstaller)
  lector_nfc/                -- Carpeta lista para copiar a cada PC con lector
                             -- (nfc_reader.exe, iniciar_nfc.bat, nfc_url.txt, nfc_key.txt,
                             --  iniciar_nfc_silencioso.vbs, LEEME.txt, requirements-nfc.txt)
  docker-compose.yml         -- Postgres + contenedor app (FastAPI + SPA + lector)

Backend_Proy_Cobao/
  app/main.py                -- FastAPI, CORS, SPA, seed de roles/usuarios
  app/models/, schemas/, crud/, routers/
  bd_COBAO.sql               -- Esquema inicial (solo aplica en primer arranque de la BD)
  migraciones/               -- SQL aplicados manualmente a una BD existente
```

## Roles y usuarios

| Rol | Acceso |
|---|---|
| Directivo | Todo el sistema |
| Servicios Escolares | Todo excepto Reportes |
| Prefectura | Escaneo NFC, Permisos, Incidencias, Faltas, Profesores, Reportes |
| Entrada (Kiosco) | Solo registro de entradas y salidas (pantalla tipo kiosco) |

Usuarios por defecto (creados al arrancar el backend):

| Usuario | Contrasena | Rol |
|---|---|---|
| admin | admin | Directivo |
| prefecto | admin | Prefectura |
| servicios | admin | Servicios Escolares |
| entrada | admin | Entrada |

> **IMPORTANTE (seguridad):** cambia estas contrasenas y la `SECRET_KEY` antes de ir a produccion.

## Como ejecutar (desarrollo)

```bash
# Frontend (necesita el backend corriendo en :8000)
npm install
npm run dev          # http://localhost:5173 (proxy de /api a :8000)

# Backend
cd Backend_Proy_Cobao
pip install -r requirements.txt
# Configura DATABASE_URL y ejecuta uvicorn app.main:app --reload
```

## Como ejecutar (Docker - forma recomendada)

```bash
docker compose up -d --build
# Aplicacion web:  http://localhost:8000
# API docs:        http://localhost:8000/docs
# BD:              localhost:5432 (cobao/cobao_pass, bd cobao_db)
```

El contenedor sirve el frontend (SPA), el backend y `bd_COBAO.sql` se aplica solo
en el **primer arranque** del volumen de Postgres.

## Dominio de prueba (tunel publico temporal)

Sin necesidad de dominio ni abrir puertos en el router, puedes exponer el stack que
corre en tu maquina (`localhost:8000`) con un tunel rapido de Cloudflare que genera
una URL publica con HTTPS automatico (`https://algo.trycloudflare.com`).

```bash
# Levantar el tunel (la primera vez descarga la imagen cloudflare/cloudflared)
docker run -d --name cobao-tunnel --restart unless-stopped \
  cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8000

# Obtener la URL publica
docker logs cobao-tunnel | Select-String trycloudflare.com
```

Detenerlo:

```bash
docker rm -f cobao-tunnel
```

> **Importante:**
> - La URL cambia cada vez que el contenedor del tunel se reinicia. Para regenerarla:
>   `docker restart cobao-tunnel` y vuelve a leer los logs.
> - Es **publico**: cualquiera con la URL puede intentar entrar. Cambia las
>   contrasenas por defecto (`admin`/`prefecto`/`servicios`/`entrada`) antes de compartirla.
> - El tunel funciona con WebSockets, por lo que el escaneo NFC en tiempo real
>   (`/api/v1/nfc/ws`) tambien pasa por la URL publica.
> - Si ves **Mixed Content** (`https` pagina pidiendo `http://.../api/...`), reconstruye
>   el contenedor `app`: el backend debe arrancar con `--forwarded-allow-ips=*` para que
>   los redirects usen HTTPS detras del tunel.
> - Para una URL **fija** en produccion: crea un named tunnel
>   (`cloudflared tunnel create <nombre>`) y apunta un registro DNS
>   `CNAME <sub>.tudominio.com -> <uuid>.cfargotunnel.com`.

### Migraciones (BD existente)

Si ya tenias la BD corriendo y agregamos columnas/tablas nuevas, debes aplicarlas
a mano con PowerShell (no usa `<` de bash):

```powershell
Get-Content -Raw migraciones/001_alumnos_reposiciones.sql | docker exec -i gestion-de-entrada-db-1 psql -U cobao -d cobao_db
Get-Content -Raw migraciones/002_reportes_programados.sql | docker exec -i gestion-de-entrada-db-1 psql -U cobao -d cobao_db
```

## Lector NFC

El lector **no se puede leer desde el navegador**: necesita un "puente" que lea el
USB y lo mande por HTTP al backend.

- **En Linux (Docker con USB passthrough):** `start.sh` intenta iniciar
  `nfc_reader.py` dentro del contenedor (requiere `pcscd` y el USB mapeado).
- **En Windows:** el lector interno falla silenciosamente (esperado); se usa
  `nfc_reader.py`/`nfc_reader.exe` ejecutado **externamente** apuntando al backend.

### Instalacion del lector en una PC (Windows)

El lector USB **no viaja por la red**: debe estar enchufado en la PC donde
corres el helper. El helper solo manda el UID al backend por HTTP.

En la carpeta `lector_nfc/` esta todo lo necesario para instalar en una PC
con lector. **Copia la carpeta entera** a la PC (mantenlos juntos):

1. Conectar el lector ACR122U e instalar sus drivers.
2. `nfc_url.txt` ya viene con la URL del backend (el tunel Cloudflare).
   Si el backend esta en otra IP, editalo, por ejemplo:
   `http://192.168.1.50:8000/api/v1/nfc/scan`
   (tambien puedes pasar la URL: `iniciar_nfc.bat http://IP-SERVIDOR:8000/api/v1/nfc/scan`).
3. `nfc_key.txt` ya viene con la llave de API del backend (**no lo borres ni
   lo edites**). Debe ser la misma que `NFC_API_KEY` en el `.env` del servidor.
   Si el servidor responde 401, la llave no coincide.
4. Ejecutar `iniciar_nfc.bat` (usa `nfc_reader.exe`, o Python si lo borras).
   Debe mostrar "Lector encontrado: ACS ACR122U..." y "Esperando tarjetas NFC...".
   Para arranque automatico al iniciar Windows: `iniciar_nfc_silencioso.vbs`.
5. En el servidor, el puerto **8000** debe estar accesible desde la red
   (firewall de Windows: permitir entrada TCP 8000).

> Si la PC no tiene Python, usa el `nfc_reader.exe` de esa carpeta (ya
> compilado y con soporte de llave de API). Si usas Python, instala:
> `pip install -r requirements-nfc.txt`.

### Recompilar el .exe del lector

```bash
build_nfc_reader.bat    # genera nfc_reader.exe (no requiere Python en la PC destino)
```

## Produccion (Opcion A: servidor + helper por PC)

La **persona que ve tu pagina web no instala nada**. Solo la PC que tiene el lector
fisico necesita la carpeta `lector_nfc/`. Pasos para el dueno de cada PC con lector:

1. Conectar el lector ACR122U + drivers.
2. Copiar la carpeta `lector_nfc/` completa (contiene `nfc_reader.exe`,
   `nfc_url.txt` con la URL del servidor y `nfc_key.txt` con la llave de API).
3. Doble clic en `iniciar_nfc.bat` (o `iniciar_nfc_silencioso.vbs` para
   auto-inicio sin ventana). Debe aparecer "Lector encontrado: ACS ACR122U...".
4. Abrir la pagina web desde cualquier navegador y usar el usuario `entrada` para el
   registro de entradas/salidas, o el rol que corresponda.

El frontend ya es "same-origin": usa rutas relativas `/api/v1` (configurables con
`VITE_API_URL`) y el WebSocket NFC se deriva del host actual, por lo que funciona
detras de un dominio con HTTPS sin puertos hardcodeados.

### Checklist de produccion

- [ ] Dominio + HTTPS (obligatorio para WebSocket `wss://`).
- [ ] Cambiar `SECRET_KEY` y contrasenas de usuarios (hoy son por defecto).
- [ ] Configurar `NFC_API_KEY` (OBLIGATORIA: sin ella los lectores no pueden
      enviar lecturas; la misma llave va en `nfc_key.txt` de cada PC con lector).
- [ ] Configurar `VITE_API_URL` al buildeo si la API no esta en el mismo origen.
- [x] CORS ya no es `*`: usa la lista de `CORS_ORIGINS` (default: dev de Vite).
- [ ] No exponer el puerto 5432 de Postgres publicamente.

## Funcionalidades por pagina

- **Login**: autenticacion JWT, roles por usuario.
- **Dashboard**: resumen de asistencia, entradas/salidas recientes, asistencia por grupo y alertas.
- **Alumnos**: lista paginada, busqueda, alta manual, importacion .xls/.xlsx/.csv, edicion y detalle.
- **Grupos**: conteo de alumnos por grupo y desglose por estado.
- **Credenciales NFC**: asignacion de chips en 3 pasos (seleccionar, escribir, verificar)
  con captura NFC **automatica** (sin boton "Detectar"), reasignacion de chip, reposiciones
  y exportacion a PDF.
- **Permisos**: solicitudes de salida con aprobacion y codigo de autorizacion.
- **Incidencias**: registro con nivel de severidad y estados.
- **Reportes**: por grupo, asistencia, graficas, y **reportes programados** (backend completo).
- **Escaneo NFC**: registro de entradas/salidas por NFC (con WebSocket en tiempo real) o manual.
- **Kiosco Entradas**: pantalla simple para el rol `Entrada` (solo registrar entradas y salidas).
- **Configuracion**: ajustes, horarios, usuarios, layout de credencial y logo.

## Formato de importacion de alumnos

| Columna | Obligatoria | Descripcion |
|---|---|---|
| Nombre | Si | Nombre completo del alumno |
| No. Control | Si | Numero de control o matricula |
| Grupo | Si | Grupo al que pertenece |
| Capacitacion | No | Area de capacitacion |
| Cohorte | No | Anio o generacion |
| Turno | No | Matutino o Vespertino |
| CURP | No | Clave Unica de Registro de Poblacion |
| Fecha Nacimiento | No | Fecha de nacimiento (DD/MM/AAAA) |
| Tipo de Sangre | No | Tipo de sangre |
| Num Afiliacion | No | Numero de afiliacion |
| Domicilio | No | Direccion completa |
| Tutor | No | Nombre del tutor |
| Telefono Tutor | No | Numero de telefono del tutor |

Se puede descargar una plantilla desde la interfaz de importacion.

## Notas de arquitectura

- **`/api/v1/nfc/ws`**: WebSocket que notifica en tiempo real cada tarjeta leida
  (resultado de entrada/salida). El frontend se conecta y recibe los eventos.
- **`/api/v1/nfc/scan`**: endpoint que recibe el UID desde `nfc_reader` (el puente).
- **`/api/v1/nfc/capture/start|stop|poll`**: modo captura para asignar/verificar chips.
- **Reportes programados**: tabla `reportes_programados` con frecuencia, proxima
  generacion y ultima generacion (ver `migraciones/002_reportes_programados.sql`).
- **Reposiciones**: tabla `reposiciones` registra cada credencial reimpresa con motivo.
- **Seed de BD**: roles (Directivo, Prefectura, Servicios Escolares, Entrada) y
  usuarios por defecto se crean idempotentemente en el arranque de FastAPI.
