# COBAO Plantel 27 — Sistema de Control de Acceso NFC

Sistema integral de gestión de entrada, control de asistencia y generación automática de incidencias para el Colegio de Bachilleres del Estado de Oaxaca, Plantel 27 Miahuatlán.

## Descripción

Este sistema registra cada entrada y salida de alumnos y profesores mediante credenciales NFC, detecta retardos e inasistencias, y genera automáticamente incidencias, reportes y faltas al reglamento para que la dirección tome decisiones basadas en datos confiables.

**Objetivo:** Eliminar la bitácora manual y garantizar el registro fiel de cada evento de acceso, sin duplicados ni inconsistencias.

## Arquitectura

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19 + TypeScript + Vite 8, TailwindCSS 4, Recharts, jsPDF |
| Backend | FastAPI + SQLAlchemy (async) + PostgreSQL 16 |
| NFC | Lector ACS ACR122U (PC/SC), puente USB→HTTP (`nfc_reader`) |
| Infraestructura | Docker Compose (contenedor único: frontend + backend + lector) |

## Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **Directivo** | Acceso completo al sistema: reportes, configuración, gestión de catálogos |
| **Servicios Escolares** | Administración de catálogos y permisos (sin reportes programados) |
| **Prefectura** | Escaneo NFC, incidencias, permisos, faltas, profesores, reportes |
| **Entrada (Kiosco)** | Registro de entradas y salidas (pantalla simplificada) |

## Instalación

### Requisitos previos

- Node.js 20+ y npm
- Python 3.12+
- PostgreSQL 16 (o Docker)
- Lector NFC ACS ACR122U (para estaciones de escaneo)

### Desarrollo local

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173 (proxy automático a :8000)

# Backend
cd Backend_Proy_Cobao
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

### Producción (Docker)

```bash
docker compose up -d --build
# Aplicación:  http://localhost:8000
# API docs:    http://localhost:8000/docs
# PostgreSQL:  localhost:5432 (cobao/cobao_pass, bd: cobao_db)
```

La base de datos se inicializa automáticamente en el primer arranque mediante `bd_COBAO.sql`.

### Dominio de prueba (túnel temporal)

```bash
docker run -d --name cobao-tunnel --restart unless-stopped \
  cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8000

docker logs cobao-tunnel | Select-String trycloudflare.com
```

> **Nota:** La URL pública cambia en cada reinicio del contenedor. El escaneo NFC en tiempo real funciona correctamente a través del túnel (WebSocket).

## Instalación del Lector NFC

El lector USB debe estar conectado por USB en la PC que valida el acceso. El sistema utiliza un puente que lee el UID de la tarjeta y lo envía al backend por HTTP.

### Configuración en Windows

1. Conectar el lector ACR122U e instalar sus drivers.
2. Copiar la carpeta `lector_nfc/` a la PC destino.
3. Editar `nfc_url.txt` con la dirección del backend:
   ```
   http://192.168.1.50:8000/api/v1/nfc/scan
   ```
4. Verificar que `nfc_key.txt` contenga la misma llave que `NFC_API_KEY` en el `.env` del servidor.
5. Ejecutar `iniciar_nfc.bat` (o `iniciar_nfc_silencioso.vbs` para auto-inicio sin ventana).
6. Confirmar que aparezca "Lector encontrado: ACS ACR122U..." y "Esperando tarjetas NFC...".

### Recompilar el ejecutable

```bash
lector_nfc/build_nfc_reader.bat    # Genera nfc_reader.exe con PyInstaller
```

## Migraciones de Base de Datos

Para aplicar cambios estructurales a una base de datos existente:

```powershell
Get-Content -Raw migraciones/001_alumnos_reposiciones.sql | docker exec -i gestion-de-entrada-db-1 psql -U cobao -d cobao_db
Get-Content -Raw migraciones/002_reportes_programados.sql | docker exec -i gestion-de-entrada-db-1 psql -U cobao -d cobao_db
```

## Formato de Importación de Alumnos

| Columna | Obligatoria | Descripción |
|---------|:-----------:|-------------|
| Nombre | ✓ | Nombre completo del alumno |
| No. Control | ✓ | Número de control o matrícula |
| Grupo | ✓ | Grupo al que pertenece |
| Capacitación | | Área de capacitación |
| Cohorte | | Año o generación |
| Turno | | Matutino o Vespertino |
| CURP | | Clave Única de Registro de Población |
| Fecha Nacimiento | | Formato DD/MM/AAAA |
| Tipo de Sangre | | Tipo de sangre |
| Num Afiliación | | Número de afiliación |
| Domicilio | | Dirección completa |
| Tutor | | Nombre del tutor |
| Telefono Tutor | | Número de teléfono del tutor |

Se puede descargar una plantilla desde la interfaz de importación.

## Funcionalidades

- **Dashboard:** Resumen de asistencia, entradas/salidas recientes, asistencia por grupo y alertas.
- **Alumnos:** Lista paginada, búsqueda, alta manual, importación (.xls/.xlsx/.csv), edición y detalle.
- **Grupos:** Conteo de alumnos por grupo y desglose por estado.
- **Credenciales NFC:** Asignación de chips en 3 pasos, reasignación, reposiciones y exportación a PDF.
- **Permisos:** Solicitudes de salida con aprobación y código de autorización.
- **Incidencias:** Registro con nivel de severidad y estados.
- **Reportes:** Por grupo, asistencia, gráficas y reportes programados (generación automática).
- **Escaneo NFC:** Registro de entradas/salidas en tiempo real (WebSocket) o manual.
- **Kiosco Entradas:** Pantalla simplificada para el rol de Entrada.
- **Configuración:** Ajustes, horarios, usuarios, layout de credencial y logo.

## Seguridad

- Autenticación JWT con expiración configurable.
- Roles con permisos granulares por endpoint.
- `NFC_API_KEY` obligatoria para el registro de lecturas NFC.
- CORS restringido a orígenes configurados en `CORS_ORIGINS`.
- Rate limiting configurable por endpoint.

> **IMPORTANTE:** Cambiar las credenciales por defecto (`admin`/`prefecto`/`servicios`/`entrada`) y la `SECRET_KEY` antes de pasar a producción.

## Usuarios por Defecto

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin | Directivo |
| prefecto | admin | Prefectura |
| servicios | admin | Servicios Escolares |
| entrada | admin | Entrada (Kiosco) |

## Checklist de Producción

- [ ] Dominio + HTTPS (obligatorio para WebSocket `wss://`)
- [ ] Cambiar `SECRET_KEY` y contraseñas de usuarios
- [ ] Configurar `NFC_API_KEY` (misma llave en `nfc_key.txt` de cada PC con lector)
- [ ] Configurar `VITE_API_URL` si la API no está en el mismo origen
- [ ] No exponer el puerto 5432 de PostgreSQL públicamente

## Licencia

Proyecto interno del COBAO Plantel 27 Miahuatlán.
