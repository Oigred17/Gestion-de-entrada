# COBAO Plantel 27 — Sistema de Control de Acceso NFC

Sistema de gestión de entrada y control de asistencia por credenciales NFC.

## Arquitectura

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19 + TypeScript + Vite 8, TailwindCSS 4, Recharts, jsPDF |
| Backend | FastAPI 0.115 + SQLAlchemy async + PostgreSQL 16 |
| NFC | Lector ACS ACR122U (PC/SC), puente USB→HTTP |
| Infraestructura | Docker Compose (multi-stage build) |

---

## Requisitos previos

### Servidor / PC donde correrá el sistema

| Requisito | Versión mínima | Cómo verificar |
|-----------|---------------|----------------|
| Docker Desktop | 24+ | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Git | 2.30+ | `git --version` |
| Python 3.12+ | 3.12 | `python --version` (solo para generar claves) |
| Puerto 8000 libre | — | `netstat -ano | findstr :8000` (Windows) o `lsof -i :8000` (Linux) |
| Puerto 5432 libre (opcional) | — | Solo si necesitas acceso externo a PostgreSQL |

### Estaciones con lector NFC

| Requisito | Detalle |
|-----------|---------|
| Windows 10/11 | Sistema operativo de la estación |
| Lector ACS ACR122U | Conectado por USB |
| Driver PC/SC | Se instala automáticamente en Windows |
| Conexión a internet | Para comunicarse con el servidor |

---

## Paso 1: Clonar el repositorio

### En el servidor

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Gestion-de-entrada

# Verificar que se clonó correctamente
ls -la
# Debes ver: docker-compose.yml, Dockerfile, .env.example, start.sh, package.json, etc.
```

### Estructura del proyecto

```
Gestion-de-entrada/
├── docker-compose.yml          # Define los servicios: db (PostgreSQL) y app (FastAPI)
├── Dockerfile                  # Build multi-stage: Node 22 (frontend) + Python 3.12 (backend)
├── start.sh                    # Script de arranque del contenedor (inicia NFC reader + uvicorn)
├── package.json                # Dependencias del frontend (React, Vite, etc.)
├── .env.example                # Plantilla de variables de entorno
├── nginx.conf                  # Configuración de nginx para HTTPS (crear en Paso 5)
├── vite.config.ts              # Configuración de Vite (proxy para desarrollo)
├── Backend_Proy_Cobao/
│   ├── app/
│   │   ├── main.py             # Entry point de FastAPI + auto-migración de BD
│   │   ├── config.py           # Settings (lee .env)
│   │   ├── dependencies.py     # Auth middleware (lee token de cookie + header)
│   │   ├── models/             # SQLAlchemy models (Usuario, Alumno, Credencial, etc.)
│   │   ├── schemas/            # Pydantic schemas
│   │   └── routers/            # Endpoints: auth, alumnos, credenciales, nfc, etc.
│   ├── bd_COBAO.sql            # Schema inicial de PostgreSQL (se ejecuta automáticamente)
│   └── requirements.txt        # Dependencias de Python (FastAPI, SQLAlchemy, pyotp, etc.)
├── src/                        # Código fuente del frontend (React + TypeScript)
│   ├── api/                    # Módulos HTTP (axios client, endpoints)
│   ├── context/                # React Context (AuthContext)
│   ├── pages/                  # Páginas: Login, Dashboard, Students, Credentials, etc.
│   ├── components/             # Componentes reutilizables
│   └── lib/                    # Utilidades (toast, ciclos, normalizeText, etc.)
├── lector_nfc/                 # Lector NFC para estaciones Windows
│   ├── nfc_reader.exe          # Ejecutable del lector (o nfc_reader.py)
│   ├── nfc_url.txt             # URL del backend (editar con tu dominio)
│   ├── nfc_key.txt             # NFC_API_KEY (copiar del .env)
│   ├── iniciar_nfc.bat         # Iniciar lector (Windows)
│   ├── iniciar_nfc_silencioso.vbs  # Iniciar sin ventana (auto-inicio)
│   ├── instalar_inicio_automatico.bat  # Instalar auto-inicio
│   └── detener_nfc.bat         # Detener lector
└── dist/                       # Build de producción (generado por npm run build)
```

---

## Paso 2: Crear y configurar el archivo `.env`

### 2.1 Copiar la plantilla

**En Windows (PowerShell):**
```powershell
copy .env.example .env
```

**En Linux/macOS:**
```bash
cp .env.example .env
```

### 2.2 Generar claves seguras

Necesitas generar **dos claves únicas**: una para `SECRET_KEY` (firma JWT) y otra para `NFC_API_KEY` (comunicación con lectores).

```powershell
# Generar SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generar NFC_API_KEY (copiar el resultado de la línea anterior)
python -c "import secrets; print(secrets.token_hex(32))"
```

Cada ejecución imprime una cadena de 64 caracteres hexadecimales. Copia cada una.

### 2.3 Editar `.env`

Abre `.env` con cualquier editor y rellena los valores:

```env
# ============================================================
# COBAO - Variables de entorno del backend
# ============================================================

# Clave secreta para firmar JWT (GENERAR UNA ÚNICA)
SECRET_KEY=<pegar-clave-1-aqui>

# Llave de API para lectores NFC externos (GENERAR UNA ÚNICA)
NFC_API_KEY=<pegar-clave-2-aqui>

# Orígenes permitidos por CORS
# En desarrollo: http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000
# En producción: https://tu-dominio.com
CORS_ORIGINS=https://tu-dominio.com

# Longitud mínima de contraseña
# En desarrollo: 4 (para pruebas rápidas)
# En producción: 16 (recomendado)
MIN_PASSWORD_LENGTH=8

# Anti fuerza bruta
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_SECONDS=300
RECOVERY_MAX_ATTEMPTS=5
RECOVERY_WINDOW_SECONDS=600

# Configuración SMTP para correos
# Para Gmail: usa CONTRASEÑA DE APLICACIÓN (no la contraseña normal)
# 1. Activa verificación en dos pasos en tu cuenta Google
# 2. Crea contraseña de aplicacion en: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=tu-contrasena-de-aplicacion
SMTP_FROM=tu-correo@gmail.com
SMTP_USE_TLS=true

# Minutos de validez del código de recuperación
RECOVERY_CODE_EXPIRE_MINUTES=10

# Cookie de autenticación
# False en desarrollo (HTTP local), True en producción (HTTPS)
COOKIE_SECURE=False
```

### 2.4 Verificar que `.env` existe

```powershell
# PowerShell
Test-Path .env
# Debe retornar: True

# Linux/macOS
ls -la .env
```

---

## Paso 3: Configurar el acceso a la base de datos

El `docker-compose.yml` ya incluye la configuración por defecto de PostgreSQL:

| Parámetro | Valor por defecto | Archivo |
|-----------|------------------|---------|
| Usuario | `cobao` | `docker-compose.yml` línea 6 |
| Contraseña | `cobao_pass` | `docker-compose.yml` línea 7 |
| Base de datos | `cobao_db` | `docker-compose.yml` línea 8 |
| Puerto | `5432` | `docker-compose.yml` línea 10 |

> **Si quieres cambiar las credenciales de PostgreSQL**, edita `docker-compose.yml` líneas 6-8 **antes** del primer arranque. Después del primer arranque, no se pueden cambiar sin borrar el volumen.

El schema inicial (`bd_COBAO.sql`) se ejecuta automáticamente en el primer arranque:
- Crea las tablas: roles, usuarios, ciclos_escolares, grupos, alumnos, credenciales, registros_acceso, configuracion, reportes, incidencias, permisos, profesores, etc.
- Inserta los roles por defecto: Directivo, Prefectura, Servicios Escolares, Entrada
- Inserta los usuarios por defecto con contraseñas hasheadas

---

## Paso 4: Levantar servicios (primera vez)

### 4.1 Build y arranque

```bash
# Este comando:
# 1. Descarga las imágenes base (node:22-alpine, python:3.12-slim, postgres:16-alpine)
# 2. Instala dependencias del frontend (npm install)
# 3. Compila el frontend (npm run build → dist/)
# 4. Instala dependencias del backend (pip install)
# 5. Crea la imagen Docker final
# 6. Inicia PostgreSQL, espera que esté listo (healthcheck)
# 7. Ejecuta bd_COBAO.sql (schema inicial)
# 8. Inicia FastAPI con uvicorn
docker compose up -d --build
```

> **Tiempo estimado:** 3-8 minutos la primera vez (descarga de imágenes + install). En adelante: 10-30 segundos.

### 4.2 Verificar que los servicios arrancaron

```bash
# Ver estado de los contenedores
docker compose ps
```

Salida esperada:
```
NAME                STATUS              PORTS
cobao-db-1          Up (healthy)        0.0.0.0:5432->5432/tcp
cobao-app-1         Up                  0.0.0.0:8000->8000/tcp
```

Si `STATUS` muestra `health check: starting`, espera 5-10 segundos y vuelve a ejecutar.

### 4.3 Verificar que no hay errores en los logs

```bash
# Logs del backend (debe mostrar "Uvicorn running on...")
docker compose logs app

# Logs de PostgreSQL (debe mostrar "database system is ready to accept connections")
docker compose logs db
```

### 4.4 Probar el endpoint de salud

```bash
# En PowerShell
Invoke-WebRequest -Uri http://localhost:8000/api/v1/auth/me -UseBasicParsing | Select-Object StatusCode

# En Linux/macOS
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/auth/me
```

Debe retornar `401` (no autorizado) — eso significa que el endpoint existe y funciona.

> **Nota:** En producción (`COOKIE_SECURE=True`), `/docs` y `/redoc` están **deshabilitados** por seguridad. No se puede acceder a la documentación Swagger desde fuera del servidor.

### 4.5 Probar el login

Abre `http://localhost:8000` en el navegador. Debes ver la pantalla de login.

Credenciales por defecto:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin` | Directivo |
| `prefecto` | `admin` | Prefectura |
| `servicios` | `admin` | Servicios Escolares |
| `entrada` | `admin` | Entrada (Kiosco) |

> **IMPORTANTE:** Cambia estas contraseñas después del primer login. Ve a Configuración → Usuarios → Editar. Las contraseñas deben tener al menos `MIN_PASSWORD_LENGTH` caracteres (configurable en `.env`, por defecto 8).

---

## Paso 5: Configurar HTTPS (obligatorio para producción)

WebSocket requiere `wss://` (WebSocket seguro) para el escaneo NFC en tiempo real. Sin HTTPS, el lector NFC no funcionará correctamente.

### 5.1 Instalar Certbot (obtener certificado SSL)

**En Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y certbot
```

**En CentOS/RHEL:**
```bash
sudo dnf install -y certbot
```

**En Windows:** Descarga desde https://certbot.eff.org/instructions

### 5.2 Obtener certificado SSL

Reemplaza `tu-dominio.com` con tu dominio real:

```bash
# Detener nginx temporalmente si está corriendo
sudo systemctl stop nginx

# Obtener certificado (modo standalone)
sudo certbot certonly --standalone -d tu-dominio.com

# Los certificados se guardan en:
# /etc/letsencrypt/live/tu-dominio.com/fullchain.pem
# /etc/letsencrypt/live/tu-dominio.com/privkey.pem
```

Si no tienes dominio, puedes usar una IP temporal con Cloudflare Tunnel o ngrok para pruebas.

### 5.3 Crear el archivo `nginx.conf`

Crea el archivo `nginx.conf` en la raíz del proyecto:

```nginx
# nginx.conf — Proxy reverso con HTTPS para COBAO NFC

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS principal
server {
    listen 443 ssl;
    server_name tu-dominio.com;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Proxy a FastAPI
    location / {
        proxy_pass http://app:8000;
        proxy_http_version 1.1;

        # Soporte WebSocket (para lector NFC en tiempo real)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers estándar
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 5.4 Agregar servicio nginx en `docker-compose.yml`

Agrega el bloque `nginx` al final del archivo, antes de `volumes:`:

```yaml
services:
  db:
    # ... (configuración existente)

  app:
    # ... (configuración existente)

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app

volumes:
  pgdata:
```

### 5.5 Reiniciar con nginx

```bash
docker compose up -d --build
```

### 5.6 Verificar HTTPS

```bash
# Verificar certificado
curl -I https://tu-dominio.com

# Debe mostrar: HTTP/2 200 y headers de seguridad
```

### 5.7 Actualizar `.env` para producción

Cambia `COOKIE_SECURE` a `True`:

```env
COOKIE_SECURE=True
```

Reinicia el contenedor:

```bash
docker compose restart app
```

### 5.8 Renovar certificados SSL

Los certificados de Let's Encrypt duran 90 días. Configura la renovación automática:

```bash
# Probar renovación
sudo certbot renew --dry-run

# Configurar cron job (renovar cada 60 días)
sudo crontab -e
# Agregar esta línea:
0 0 1,15 * * certbot renew --post-hook "docker compose -f /ruta/al/proyecto/docker-compose.yml restart nginx"
```

---

## Paso 6: Configurar lector NFC en cada estación

### 6.1 Archivos del lector

| Archivo | Función |
|---------|---------|
| `lector_nfc/nfc_reader.exe` | Ejecutable del lector (Windows) |
| `lector_nfc/nfc_reader.py` | Código fuente Python (si no hay .exe) |
| `lector_nfc/nfc_url.txt` | URL del endpoint NFC del backend |
| `lector_nfc/nfc_key.txt` | Misma `NFC_API_KEY` del `.env` del servidor |
| `lector_nfc/iniciar_nfc.bat` | Script para iniciar el lector (Windows) |
| `lector_nfc/iniciar_nfc_silencioso.vbs` | Iniciar sin ventana de consola |
| `lector_nfc/instalar_inicio_automatico.bat` | Instalar auto-inicio al encender |
| `lector_nfc/detener_nfc.bat` | Detener el lector |
| `lector_nfc/desinstalar_inicio_automatico.bat` | Quitar auto-inicio |

### 6.2 Configurar cada PC con lector

**Paso 1:** Copiar toda la carpeta `lector_nfc/` a la PC destino (USB, red, etc.)

**Paso 2:** Editar `nfc_url.txt` con la URL de tu servidor:

```
https://tu-dominio.com/api/v1/nfc/scan
```

> **IMPORTANTE:** La URL debe terminar en `/api/v1/nfc/scan` y usar `https://` (no `http://`).

**Paso 3:** Editar `nfc_key.txt` con la misma `NFC_API_KEY` de tu `.env`:

```
tu-NFC_API_KEY-aqui
```

**Paso 4:** Conectar el lector ACS ACR122U por USB

**Paso 5:** Verificar que el driver esté instalado:
- Abrir Administrador de dispositivos → Buscar "ACS ACR122U" o "Smart Card Reader"
- Si no aparece, instalar el driver desde https://www.acs.com.hk/en/driver/8/acr122u/

**Paso 6:** Ejecutar `iniciar_nfc.bat`

Salida esperada en la consola:
```
=== Lector NFC COBAO ===
Lector encontrado: ACS ACR122U 00 00
URL: https://tu-dominio.com/api/v1/nfc/scan
Esperando tarjetas NFC...
```

**Paso 7:** Probar acercando una tarjeta NFC al lector. Debe enviar la lectura al servidor.

### 6.3 Instalar auto-inicio (opcional)

Para que el lector se inicie automáticamente al encender la PC:

```
Doble clic en instalar_inicio_automatico.bat
```

Esto crea una tarea programada en Windows. Para desinstalarlo:
```
Doble clic en desinstalar_inicio_automatico.bat
```

---

## Paso 7: Cambiar contraseñas de usuarios por defecto

Después del primer login:

1. Ir a **Configuración** → **Usuarios**
2. Hacer clic en el ícono de editar (lápiz) junto a cada usuario
3. Cambiar la contraseña
4. Guardar

Usuarios a cambiar:

| Usuario | Rol | Acceso |
|---------|-----|--------|
| `admin` | Directivo | Todo el sistema |
| `prefecto` | Prefectura | Incidencias, registros |
| `servicios` | Servicios Escolares | Credenciales, alumnos |
| `entrada` | Entrada (Kiosco) | Solo escaneo NFC |

---

## Paso 8: Seguridad final

### 8.1 Seguridad implementada en el backend

| Medida | Descripción | Archivo |
|--------|-------------|---------|
| JWT httpOnly cookie + body | Token en cookie `httpOnly` y también en respuesta body (memory token en frontend). No se usa localStorage. | `auth.py` |
| JWT con claims de rol | El token incluye `sub`, `rol`, `iat`, `exp`. La autorización es server-side. | `auth.py` |
| Swagger/OpenAPI deshabilitado en producción | Cuando `COOKIE_SECURE=True`, `/docs`, `/redoc` y `/openapi.json` retornan 404. | `main.py` |
| Headers de seguridad | Middleware agrega `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `Strict-Transport-Security` solo en HTTPS. | `main.py` |
| Cookie Secure flag | La cookie lleva `secure=True` cuando `COOKIE_SECURE=True` (producción). | `auth.py` |
| Rate limiting en login | Máximo 5 intentos cada 5 minutos por IP. | `rate_limit.py` |
| Rate limiting en recuperación | Máximo 5 intentos cada 10 minutos por IP. | `rate_limit.py` |
| Validación de contraseña | Longitud mínima verificada al crear/editar usuario y al restablecer. | `usuarios.py`, `auth.py` |
| Config protegido | `GET /configuracion` requiere auth. Campos SMTP (`host`, `user`, `from`) enmascaramos para usuarios no-Directivo. | `configuracion.py` |
| Respaldo protegido | Todos los endpoints de `/respaldos` requieren auth. Generar y descargar requieren re-autenticación (ConfirmPasswordModal). | `respaldos.py`, `ConfigPage.tsx` |
| Recuperación segura | Rate limiting + respuesta uniforme (no confirma si el usuario existe) + email enmascarado. | `auth.py`, `recovery.py` |
| MFA (TOTP) | Opcional para Directivos. Verificación en dos pasos con Google Authenticator. | `auth.py` |
| ProxyHeadersMiddleware | Lee `X-Forwarded-Proto/Host` de nginx/Cloudflare para redirects correctos. | `main.py` |

### 8.2 Variables de entorno para producción

Edita `.env` con estos valores para producción:

```env
# Producción
COOKIE_SECURE=True
CORS_ORIGINS=https://tu-dominio.com
MIN_PASSWORD_LENGTH=8

# Seguridad (ya configurados por defecto)
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_SECONDS=300
RECOVERY_MAX_ATTEMPTS=5
RECOVERY_WINDOW_SECONDS=600
```

### 8.3 Verificaciones post-despliegue

```bash
# 1. Verificar que Swagger NO está accesible (debe retornar 404)
curl -s -o /dev/null -w "%{http_code}" https://tu-dominio.com/docs
# Resultado esperado: 404

# 2. Verificar headers de seguridad
curl -I https://tu-dominio.com
# Debe mostrar:
#   X-Content-Type-Options: nosniff
#   X-Frame-Options: DENY
#   Referrer-Policy: strict-origin-when-cross-origin
#   Permissions-Policy: camera=(), microphone=(), geolocation=()
#   Strict-Transport-Security: max-age=31536000; includeSubDomains

# 3. Verificar que la cookie lleva flag Secure
# Abrir DevTools → Application → Cookies → verificar flag "Secure" en access_token_cookie

# 4. Verificar que configuración enmascara SMTP para no-Directivos
# Login como "entrada" (rol no-Directivo) → Configuración → Notificaciones
# Los campos SMTP host/user/from deben mostrar ********

# 5. Verificar que respaldos requieren re-autenticación
# Login → Configuración → Respaldo → "Generar respaldo manual"
# Debe pedir contraseña antes de generar
```

### 8.4 Verificaciones de seguridad

| Verificar | Cómo | Archivo |
|-----------|------|---------|
| Puerto PostgreSQL NO expuesto | Quitar `"5432:5432"` si no se necesita acceso externo | `docker-compose.yml` línea 10 |
| CORS restringido | Solo tu dominio en `CORS_ORIGINS` | `.env` |
| SECRET_KEY única | Generada con `secrets.token_hex(32)` | `.env` |
| NFC_API_KEY única | Generada con `secrets.token_hex(32)` | `.env` |
| Contraseñas cambiadas | Login con cada usuario y cambiar | Configuración → Usuarios |
| COOKIE_SECURE=True | Para producción con HTTPS | `.env` |
| Swagger deshabilitado | `https://tu-dominio.com/docs` retorna 404 | `main.py` |
| Headers de seguridad | DevTools → Network → Headers | `main.py` |
| SMTP enmascarado | Configuración como usuario no-Directivo | `configuracion.py` |
| Respaldo requiere re-auth | Generar/descargar respaldo pide contraseña | `respaldos.py` |

### 8.5 Habilitar MFA (recomendado para Directivos)

1. Login como Directivo (`admin`)
2. Abrir consola del navegador (F12 → Console)
3. Ejecutar:

```javascript
// Paso 1: Obtener provisioning URI
fetch('/api/v1/auth/mfa/setup', { method: 'POST', credentials: 'include' })
  .then(r => r.json()).then(d => console.log(d));

// Paso 2: Copiar el provisioning_uri y escanearlo con Google Authenticator

// Paso 3: Activar MFA (reemplazar '123456' con el código TOTP de la app)
fetch('/api/v1/auth/mfa/enable', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '123456' })
}).then(r => r.json()).then(d => console.log(d));
```

4. En el siguiente login, después de la contraseña, se pedirá el código TOTP de 6 dígitos

---

## Checklist de Producción

### Servidor
- [ ] Docker y Docker Compose instalados
- [ ] Repositorio clonado
- [ ] Archivo `.env` creado con claves únicas generadas
- [ ] `SECRET_KEY` generada con `secrets.token_hex(32)`
- [ ] `NFC_API_KEY` generada con `secrets.token_hex(32)`
- [ ] `CORS_ORIGINS` configurado con tu dominio
- [ ] `COOKIE_SECURE=True` para producción
- [ ] `MIN_PASSWORD_LENGTH=8` (o mayor) para producción
- [ ] Contraseñas SMTP configuradas (si se usa envío de correos)
- [ ] `docker compose up -d --build` ejecutado sin errores
- [ ] `docker compose ps` muestra ambos servicios "Up"

### HTTPS
- [ ] Certificado SSL obtenido con Certbot
- [ ] `nginx.conf` creado con proxy a FastAPI
- [ ] Servicio nginx agregado a `docker-compose.yml`
- [ ] `https://tu-dominio.com` muestra la app
- [ ] Headers de seguridad visibles en DevTools → Network

### Seguridad verificada
- [ ] `https://tu-dominio.com/docs` retorna 404 (Swagger deshabilitado)
- [ ] Cookie `access_token_cookie` tiene flag `Secure` en DevTools
- [ ] Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`
- [ ] Login como usuario no-Directivo → Configuración → SMTP aparece enmascarado
- [ ] Generar respaldo pide re-autenticación (ConfirmPasswordModal)
- [ ] Descargar respaldo pide re-autenticación

### Usuarios
- [ ] Login con `admin` funciona
- [ ] Login con `prefecto` funciona
- [ ] Login con `servicios` funciona
- [ ] Login con `entrada` funciona
- [ ] Todas las contraseñas por defecto cambiadas (mínimo 8 caracteres)
- [ ] MFA habilitado para usuarios Directivos (recomendado)

### Lector NFC
- [ ] Lector ACS ACR122U conectado por USB
- [ ] Driver PC/SC instalado (aparece en Administrador de dispositivos)
- [ ] `nfc_url.txt` apunta a `https://tu-dominio.com/api/v1/nfc/scan`
- [ ] `nfc_key.txt` tiene la misma `NFC_API_KEY` del `.env`
- [ ] `iniciar_nfc.bat` ejecuta sin errores
- [ ] Al acercar tarjeta NFC, se registra en el sistema

---

## Comandos útiles

### Gestión de servicios

```bash
# Iniciar todos los servicios
docker compose up -d

# Detener todos los servicios
docker compose down

# Reconstruir y reiniciar (después de cambios en el código)
docker compose up -d --build

# Ver logs en tiempo real
docker compose logs -f app

# Ver logs de PostgreSQL
docker compose logs -f db

# Reiniciar solo el backend
docker compose restart app

# Acceder a la consola de PostgreSQL
docker compose exec db psql -U cobao -d cobao_db
```

### Desarrollo local (sin Docker)

```bash
# Terminal 1: Backend
cd Backend_Proy_Cobao
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
npm install
npm run dev
```

El frontend (Vite) corre en `http://localhost:5173` y proxya la API al backend en `http://localhost:8000`.

### Resolver problemas

**El contenedor app no arranca:**
```bash
docker compose logs app
# Buscar errores de conexión a BD o archivos faltantes
```

**PostgreSQL no está listo:**
```bash
docker compose logs db
# Verificar que el healthcheck pasa: "database system is ready to accept connections"
```

**El lector NFC no detecta tarjetas:**
1. Verificar que el driver PC/SC está instalado (Administrador de dispositivos)
2. Verificar que `nfc_url.txt` usa `https://` y no `http://`
3. Verificar que `nfc_key.txt` tiene la clave correcta
4. Verificar que el puerto 8000 está accesible desde la PC del lector

**Login falla con "Credenciales incorrectas":**
1. Verificar que el usuario existe en la BD
2. Verificar que la contraseña no fue cambiada
3. Verificar logs: `docker compose logs app`

**WebSocket no conecta:**
1. Verificar que HTTPS está configurado correctamente
2. Verificar que nginx está redirigiendo WebSocket (headers Upgrade/Connection)
3. Abrir DevTools → Network → WS para ver errores

**Swagger (/docs) retorna 404:**
- Esto es **intencional** en producción. Cuando `COOKIE_SECURE=True`, los endpoints de documentación se deshabilitan por seguridad. Solo accesible en desarrollo (`COOKIE_SECURE=False`).

**Configuración muestra ******** en campos SMTP:**
- Si eres Directivo y los campos aparecen enmascarados, verifica que tu usuario tiene el rol correcto (`id_rol=1` en la BD). Los usuarios no-Directivo ven los campos enmascarados por diseño.

**Login funciona pero la app no carga datos:**
- Verificar que `CORS_ORIGINS` incluye exactamente tu dominio (con `https://`)
- Verificar que la cookie `access_token_cookie` tiene flag `Secure` en DevTools → Application → Cookies

**Error "La contraseña debe tener al menos N caracteres":**
- El backend valida la longitud mínima al crear/editar usuarios. Asegúrate de usar contraseñas con al menos `MIN_PASSWORD_LENGTH` caracteres (por defecto 8).
