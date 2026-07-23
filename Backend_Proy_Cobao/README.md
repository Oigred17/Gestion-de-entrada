# COBAO - API de Gestión Escolar

Backend en Python con **FastAPI** para la manipulación de la base de datos del COBAO (gestión de alumnos, profesores, grupos, ciclos escolares, credenciales NFC, registros de acceso y retardos).

---

## Tabla de Contenidos

1. [Arquitectura del Proyecto](#1-arquitectura-del-proyecto)
2. [Estructura de Directorios](#2-estructura-de-directorios)
3. [Prerrequisitos e Instalación](#3-prerrequisitos-e-instalación)
4. [Configuración](#4-configuración)
5. [Ejecución](#5-ejecución)
6. [Descripción de Cada Módulo](#6-descripción-de-cada-módulo)
7. [Endpoints Disponibles](#7-endpoints-disponibles)
8. [Modelo de Datos (Tablas)](#8-modelo-de-datos-tablas)
9. [Documentación Interactiva](#9-documentación-interactiva)

---

## 1. Arquitectura del Proyecto

El proyecto sigue el patrón **Clean Architecture** simplificado, separando responsabilidades en 4 capas:

```
Peticion HTTP → Router → CRUD → Modelo SQLAlchemy → PostgreSQL
                                 ↑
                           Schema Pydantic
                        (validación de datos)
```

| Capa         | Carpeta      | Responsabilidad                                      |
| ------------ | ------------ | ---------------------------------------------------- |
| **Router**   | `app/routers/` | Define las rutas HTTP (GET, POST, PUT, DELETE)       |
| **CRUD**     | `app/crud/`    | Lógica de acceso a datos (queries a la BD)           |
| **Schema**   | `app/schemas/` | Modelos de validación de entrada/salida (Pydantic)   |
| **Model**    | `app/models/`  | Mapeo ORM de las tablas de PostgreSQL (SQLAlchemy)   |

---

## 2. Estructura de Directorios

```
Proyecto-Cobao/
├── app/
│   ├── __init__.py                  # Paquete principal
│   ├── main.py                      # Punto de entrada (app FastAPI)
│   ├── config.py                    # Variables de entorno (pydantic-settings)
│   ├── database.py                  # Conexión async a PostgreSQL
│   ├── models/                      # Modelos SQLAlchemy (ORM)
│   │   ├── rol.py
│   │   ├── usuario.py
│   │   ├── ciclo_escolar.py
│   │   ├── alumno.py
│   │   ├── profesor.py
│   │   ├── grupo.py
│   │   ├── inscripcion.py
│   │   ├── credencial.py
│   │   ├── registro_acceso.py
│   │   └── retardo.py
│   ├── schemas/                     # Esquemas Pydantic (request/response)
│   │   ├── rol.py
│   │   ├── usuario.py
│   │   ├── ciclo_escolar.py
│   │   ├── alumno.py
│   │   ├── profesor.py
│   │   ├── grupo.py
│   │   ├── inscripcion.py
│   │   ├── credencial.py
│   │   ├── registro_acceso.py
│   │   └── retardo.py
│   ├── crud/                        # Operaciones CRUD
│   │   ├── rol.py
│   │   ├── usuario.py
│   │   ├── ciclo_escolar.py
│   │   ├── alumno.py
│   │   ├── profesor.py
│   │   ├── grupo.py
│   │   ├── inscripcion.py
│   │   ├── credencial.py
│   │   ├── registro_acceso.py
│   │   └── retardo.py
│   └── routers/                     # Rutas de la API
│       ├── roles.py
│       ├── usuarios.py
│       ├── ciclos_escolares.py
│       ├── alumnos.py
│       ├── profesores.py
│       ├── grupos.py
│       ├── inscripciones.py
│       ├── credenciales.py
│       ├── registros_acceso.py
│       └── retardos.py
├── bd_COBAO.sql                     # Script de creación de la BD
├── requirements.txt                 # Dependencias de Python
├── Dockerfile                       # Imagen Docker de la app
├── docker-compose.yml               # Orquestación app + PostgreSQL
├── .dockerignore                    # Archivos ignorados por Docker
├── .env                             # Variables de entorno (no commitear)
├── .env.example                     # Plantilla de .env
└── README.md                        # Este archivo
```

---

## 3. Prerrequisitos e Instalación

### Requisitos

- Python 3.11+
- PostgreSQL 14+
- pip (gestor de paquetes)

### Instalación

```bash
# 1. Crear entorno virtual
python -m venv venv

# 2. Activar el entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear la base de datos en PostgreSQL
# (Conectarse a PostgreSQL y ejecutar el script bd_COBAO.sql)
createdb cobao_db
psql cobao_db < bd_COBAO.sql
```

---

## 4. Configuración

Copia el archivo `.env.example` como `.env` y edita los valores:

```bash
cp .env.example .env
```

| Variable                       | Descripción                          | Valor por defecto                              |
| ------------------------------ | ------------------------------------ | ---------------------------------------------- |
| `DATABASE_URL`                 | URL de conexión async a PostgreSQL   | `postgresql+asyncpg://usuario:password@localhost:5432/cobao_db` |
| `SECRET_KEY`                   | Clave secreta para JWT               | `cambiar-esta-clave-en-produccion`             |
| `ALGORITHM`                    | Algoritmo de hashing JWT             | `HS256`                                        |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | Minutos de expiración del token      | `60`                                           |
| `POSTGRES_USER`                | Usuario de PostgreSQL (Docker)       | `cobao`                                       |
| `POSTGRES_PASSWORD`            | Contraseña de PostgreSQL (Docker)    | `cobao_pass`                                  |
| `POSTGRES_DB`                  | Nombre de la base de datos (Docker)  | `cobao_db`                                    |

**IMPORTANTE:** Cambia los valores en `.env` con las credenciales reales. Docker Compose usa `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` para crear la BD automáticamente.

---

## 5. Ejecución

### Opción A: Docker (recomendado)

Requiere [Docker](https://docs.docker.com/get-docker/) y Docker Compose.

```bash
# Levantar todo (app + PostgreSQL) en segundo plano
docker compose up -d --build

# Ver logs
docker compose logs -f api

# Detener todo
docker compose down

# Detener y eliminar datos persistentes
docker compose down -v
```

La app estará disponible en:
- **API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

PostgreSQL accessible en `localhost:5432`.

### Opción B: Ejecución local

```bash
# Ejecutar el servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La app estará disponible en:
- **API:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 6. Descripción de Cada Módulo

### `app/config.py`
Lee las variables de entorno desde `.env` usando `pydantic-settings`. Centraliza toda la configuración de la app.

### `app/database.py`
Crea el motor asíncrono de SQLAlchemy con `asyncpg` como driver. Expone la función `get_db()` que se usa como **dependencia de FastAPI** para inyectar una sesión de base de datos en cada petición. Maneja commits y rollbacks automáticamente.

### `app/models/` (SQLAlchemy ORM)
Cada archivo mapea una tabla de PostgreSQL a una clase de Python:

- **rol.py** → tabla `roles`: Define roles del sistema (admin, profesor, alumno).
- **usuario.py** → tabla `usuarios`: Usuarios del sistema con autenticación.
- **ciclo_escolar.py** → tabla `ciclos_escolares`: Periodos escolares (2024-2025, etc).
- **alumno.py** → tabla `alumnos`: Datos personales de cada alumno.
- **profesor.py** → tabla `profesores`: Datos personales de cada profesor.
- **grupo.py** → tabla `grupos`: Clave del grupo (ej: 101, 203) con semestre calculado automáticamente.
- **inscripcion.py** → tabla `inscripciones`: Vincula alumnos con grupos en un ciclo.
- **credencial.py** → tabla `credenciales`: Tarjetas NFC para control de acceso.
- **registro_acceso.py** → tabla `registros_acceso`: Log de entradas/salidas con timestamp.
- **retardo.py** → tabla `retardos`: Registro de retardos por alumno.

### `app/schemas/` (Pydantic)
Define los modelos de validación para las peticiones HTTP:

- **XxxCreate**: Campos requeridos para crear un registro.
- **XxxUpdate**: Campos opcionales para actualizar (todos `None` por defecto).
- **XxxResponse**: Estructura de la respuesta que devuelve la API.

Estos esquemas validan automáticamente los tipos de datos, longitudes, y campos obligatorios.

### `app/crud/` (Operaciones de Base de Datos)
Contiene las funciones asíncronas que ejecutan las queries SQL:

| Función        | Descripción                                      |
| -------------- | ------------------------------------------------ |
| `get_xxxs()`   | Lista todos los registros (con filtros opcionales)|
| `get_xxx()`    | Obtiene un registro por ID                       |
| `create_xxx()` | Crea un nuevo registro                           |
| `update_xxx()` | Actualiza un registro existente                  |
| `delete_xxx()` | Elimina un registro                              |

### `app/routers/` (Endpoints)
Define las rutas HTTP y sus métodos. Cada router se monta bajo un prefijo (ej: `/alumnos`, `/profesores`).

---

## 7. Endpoints Disponibles

### Roles (`/roles`)

| Método  | Ruta                    | Descripción               | Body                                    |
| ------- | ----------------------- | ------------------------- | --------------------------------------- |
| `GET`   | `/roles/`               | Listar todos los roles    | -                                       |
| `GET`   | `/roles/{id_rol}`       | Obtener un rol por ID     | -                                       |
| `POST`  | `/roles/`               | Crear un nuevo rol        | `{ "nombre": "Admin" }`                 |
| `PUT`   | `/roles/{id_rol}`       | Actualizar un rol         | `{ "nombre": "Nuevo nombre" }`          |
| `DELETE`| `/roles/{id_rol}`       | Eliminar un rol           | -                                       |

### Usuarios (`/usuarios`)

| Método  | Ruta                                    | Descripción                      | Body                                        |
| ------- | --------------------------------------- | -------------------------------- | ------------------------------------------- |
| `GET`   | `/usuarios/`                            | Listar todos los usuarios        | -                                           |
| `GET`   | `/usuarios/{id_usuario}`                | Obtener usuario por ID           | -                                           |
| `GET`   | `/usuarios/username/{username}`         | Obtener usuario por username     | -                                           |
| `POST`  | `/usuarios/`                            | Crear un usuario nuevo           | `{ "nombre_completo": "...", "username": "...", "password_user": "...", "id_rol": 1 }` |
| `PUT`   | `/usuarios/{id_usuario}`                | Actualizar un usuario            | `{ "activo": false }`                       |
| `DELETE`| `/usuarios/{id_usuario}`                | Eliminar un usuario              | -                                           |

### Ciclos Escolares (`/ciclos-escolares`)

| Método  | Ruta                                    | Descripción                      | Body                                              |
| ------- | --------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/ciclos-escolares/`                    | Listar todos los ciclos          | -                                                 |
| `GET`   | `/ciclos-escolares/activo`              | Obtener el ciclo activo actual   | -                                                 |
| `GET`   | `/ciclos-escolares/{ciclo_id}`          | Obtener un ciclo por ID          | -                                                 |
| `POST`  | `/ciclos-escolares/`                    | Crear un ciclo nuevo             | `{ "nombre": "2025-2026", "fecha_inicio": "2025-08-01", "fecha_fin": "2026-06-30", "activo": true }` |
| `PUT`   | `/ciclos-escolares/{ciclo_id}`          | Actualizar un ciclo              | `{ "activo": true }`                              |
| `DELETE`| `/ciclos-escolares/{ciclo_id}`          | Eliminar un ciclo                | -                                                 |

### Alumnos (`/alumnos`)

| Método  | Ruta                                    | Descripción                      | Body                                              |
| ------- | --------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/alumnos/`                             | Listar alumnos                   | `?solo_activos=true` (query param)                |
| `GET`   | `/alumnos/{id_alumno}`                  | Obtener alumno por ID            | -                                                 |
| `GET`   | `/alumnos/matricula/{matricula}`        | Obtener alumno por matrícula     | -                                                 |
| `POST`  | `/alumnos/`                             | Crear un alumno nuevo            | `{ "matricula": "20230101", "nombre_completo": "...", "curp": "XXXX..." }` |
| `PUT`   | `/alumnos/{id_alumno}`                  | Actualizar un alumno             | `{ "activo": false }`                             |
| `DELETE`| `/alumnos/{id_alumno}`                  | Eliminar un alumno               | -                                                 |

### Profesores (`/profesores`)

| Método  | Ruta                                    | Descripción                      | Body                                              |
| ------- | --------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/profesores/`                          | Listar profesores                | `?solo_activos=true` (query param)                |
| `GET`   | `/profesores/{id_profesor}`             | Obtener profesor por ID          | -                                                 |
| `POST`  | `/profesores/`                          | Crear un profesor nuevo          | `{ "numero_empleado": "EMP001", "nombre_completo": "..." }` |
| `PUT`   | `/profesores/{id_profesor}`             | Actualizar un profesor           | `{ "telefono": "5551234567" }`                    |
| `DELETE`| `/profesores/{id_profesor}`             | Eliminar un profesor             | -                                                 |

### Grupos (`/grupos`)

| Método  | Ruta                                    | Descripción                      | Body                                              |
| ------- | --------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/grupos/`                              | Listar grupos                    | `?ciclo_id=1` (query param)                       |
| `GET`   | `/grupos/{grupo_id}`                    | Obtener grupo por ID             | -                                                 |
| `POST`  | `/grupos/`                              | Crear un grupo nuevo             | `{ "clave_grupo": 101, "ciclo_escolar_id": 1 }`   |
| `PUT`   | `/grupos/{grupo_id}`                    | Actualizar un grupo              | `{ "clave_grupo": 102 }`                          |
| `DELETE`| `/grupos/{grupo_id}`                    | Eliminar un grupo                | -                                                 |

> **Nota:** `clave_grupo` debe estar entre 101 y 609, y el semestre se calcula automáticamente (ej: 101 → semestre 1).

### Inscripciones (`/inscripciones`)

| Método  | Ruta                                          | Descripción                      | Body                                              |
| ------- | --------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/inscripciones/`                             | Listar inscripciones             | `?alumno_id=1&ciclo_id=1&grupo_id=1` (filtros)    |
| `GET`   | `/inscripciones/{inscripcion_id}`             | Obtener inscripción por ID       | -                                                 |
| `POST`  | `/inscripciones/`                             | Crear inscripción                | `{ "id_alumno": 1, "id_grupo": 1, "ciclo_escolar_id": 1 }` |
| `PUT`   | `/inscripciones/{inscripcion_id}`             | Actualizar inscripción           | `{ "id_grupo": 2 }`                               |
| `DELETE`| `/inscripciones/{inscripcion_id}`             | Eliminar inscripción             | -                                                 |

> **Restricción:** Un alumno solo puede estar inscrito una vez por ciclo escolar.

### Credenciales (`/credenciales`)

| Método  | Ruta                                          | Descripción                      | Body                                              |
| ------- | --------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/credenciales/`                              | Listar credenciales              | `?alumno_id=1&profesor_id=1&solo_activas=true`    |
| `GET`   | `/credenciales/{id_credencial}`               | Obtener credencial por ID        | -                                                 |
| `GET`   | `/credenciales/nfc/{uid_nfc}`                 | Obtener credencial por UID NFC   | -                                                 |
| `POST`  | `/credenciales/`                              | Crear credencial                 | `{ "uid_nfc": "AA:BB:CC:DD", "id_alumno": 1 }`    |
| `PUT`   | `/credenciales/{id_credencial}`               | Actualizar credencial            | `{ "activa": false }`                             |
| `DELETE`| `/credenciales/{id_credencial}`               | Eliminar credencial              | -                                                 |

> **Restricción:** Una credencial debe pertenecer a un alumno O a un profesor, nunca ambos.

### Registros de Acceso (`/registros-acceso`)

| Método  | Ruta                                                | Descripción                      | Body                                              |
| ------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/registros-acceso/`                                | Listar registros                 | `?credencial_id=1&fecha_inicio=...&fecha_fin=...` |
| `GET`   | `/registros-acceso/{id_registro}`                   | Obtener registro por ID          | -                                                 |
| `POST`  | `/registros-acceso/`                                | Registrar acceso                 | `{ "id_credencial": 1, "tipo_evento": "ENTRADA" }`|
| `DELETE`| `/registros-acceso/{id_registro}`                   | Eliminar registro                | -                                                 |

> `tipo_evento` solo acepta: `"ENTRADA"` o `"SALIDA"`.

### Retardos (`/retardos`)

| Método  | Ruta                              | Descripción                      | Body                                              |
| ------- | --------------------------------- | -------------------------------- | ------------------------------------------------- |
| `GET`   | `/retardos/`                      | Listar retardos                  | `?alumno_id=1` (filtro por alumno)                |
| `GET`   | `/retardos/{id_retardo}`          | Obtener retardo por ID           | -                                                 |
| `POST`  | `/retardos/`                      | Registrar retardo                | `{ "id_alumno": 1, "fecha": "2025-09-01", "minutos_retardo": 15 }` |
| `PUT`   | `/retardos/{id_retardo}`          | Actualizar retardo               | `{ "observaciones": "Llegó por transporte público" }` |
| `DELETE`| `/retardos/{id_retardo}`          | Eliminar retardo                 | -                                                 |

---

## 8. Modelo de Datos (Tablas)

### `roles`
| Columna | Tipo         | Restricciones         |
| ------- | ------------ | --------------------- |
| id_rol  | SERIAL       | PRIMARY KEY           |
| nombre  | VARCHAR(30)  | UNIQUE, NOT NULL      |

### `usuarios`
| Columna           | Tipo         | Restricciones                     |
| ----------------- | ------------ | --------------------------------- |
| id_usuario        | SERIAL       | PRIMARY KEY                       |
| nombre_completo   | VARCHAR(150) | NOT NULL                          |
| username          | VARCHAR(50)  | UNIQUE, NOT NULL                  |
| password_user     | VARCHAR(255) | NOT NULL                          |
| id_rol            | INTEGER      | FK → roles(id_rol), NOT NULL      |
| activo            | BOOLEAN      | DEFAULT true                      |
| fecha_creacion    | TIMESTAMP    | DEFAULT now()                     |

### `ciclos_escolares`
| Columna       | Tipo         | Restricciones                          |
| ------------- | ------------ | -------------------------------------- |
| id            | SERIAL       | PRIMARY KEY                            |
| nombre        | VARCHAR(20)  | UNIQUE, NOT NULL                       |
| fecha_inicio  | DATE         | NOT NULL                               |
| fecha_fin     | DATE         | NOT NULL, CHECK fecha_fin > fecha_inicio |
| activo        | BOOLEAN      | DEFAULT false, UNIQUE parcial (solo uno activo) |

### `alumnos`
| Columna         | Tipo         | Restricciones                          |
| --------------- | ------------ | -------------------------------------- |
| id_alumno       | SERIAL       | PRIMARY KEY                            |
| matricula       | VARCHAR(20)  | UNIQUE, NOT NULL                       |
| nombre_completo | VARCHAR(150) | NOT NULL                               |
| curp            | CHAR(18)     | UNIQUE, NOT NULL                       |
| nss             | VARCHAR(11)  | UNIQUE                                 |
| tipo_sangre     | VARCHAR(3)   | CHECK IN ('A+','A-','B+','B-','AB+','AB-','O+','O-') |
| domicilio       | TEXT         |                                        |
| tutor_nombre    | VARCHAR(150) |                                        |
| tutor_telefono  | VARCHAR(15)  |                                        |
| activo          | BOOLEAN      | DEFAULT true                           |
| fecha_registro  | TIMESTAMP    | DEFAULT now()                          |

### `profesores`
| Columna         | Tipo         | Restricciones              |
| --------------- | ------------ | -------------------------- |
| id_profesor     | SERIAL       | PRIMARY KEY                |
| numero_empleado | VARCHAR(20)  | UNIQUE, NOT NULL           |
| nombre_completo | VARCHAR(150) | NOT NULL                   |
| telefono        | VARCHAR(20)  |                            |
| domicilio       | TEXT         |                            |
| activo          | BOOLEAN      | DEFAULT true               |
| fecha_registro  | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP  |

### `grupos`
| Columna          | Tipo      | Restricciones                              |
| ---------------- | --------- | ------------------------------------------ |
| id               | SERIAL    | PRIMARY KEY                                |
| clave_grupo      | SMALLINT  | CHECK BETWEEN 101 AND 609, CHECK % 100 BETWEEN 1 AND 9 |
| semestre         | INTEGER   | GENERADO AUTOMÁTICAMENTE (clave_grupo/100) |
| ciclo_escolar_id | INTEGER   | FK → ciclos_escolares(id), NOT NULL        |

### `inscripciones`
| Columna          | Tipo      | Restricciones                                    |
| ---------------- | --------- | ------------------------------------------------ |
| id               | SERIAL    | PRIMARY KEY                                      |
| id_alumno        | INTEGER   | FK → alumnos(id_alumno), NOT NULL                |
| id_grupo         | INTEGER   | FK → grupos(id), NOT NULL                        |
| ciclo_escolar_id | INTEGER   | FK → ciclos_escolares(id), NOT NULL              |
| fecha_inscripcion| DATE      | DEFAULT current_date                             |

> Unicidad: un alumno solo puede inscribirse una vez por ciclo escolar.

### `credenciales`
| Columna           | Tipo         | Restricciones                              |
| ----------------- | ------------ | ------------------------------------------ |
| id_credencial     | SERIAL       | PRIMARY KEY                                |
| uid_nfc           | VARCHAR(100) | UNIQUE, NOT NULL                           |
| fecha_emision     | DATE         | DEFAULT CURRENT_DATE                       |
| fecha_vencimiento | DATE         |                                            |
| activa            | BOOLEAN      | DEFAULT TRUE                               |
| id_alumno         | INTEGER      | FK → alumnos(id_alumno), nullable          |
| id_profesor       | INTEGER      | FK → profesores(id_profesor), nullable     |

> Restricción CHECK: debe tener `id_alumno` O `id_profesor`, no ambos ni ninguno.

### `registros_acceso`
| Columna       | Tipo         | Restricciones                    |
| ------------- | ------------ | -------------------------------- |
| id_registro   | SERIAL       | PRIMARY KEY                      |
| id_credencial | INTEGER      | FK → credenciales(id_credencial) |
| fecha_hora    | TIMESTAMP    | DEFAULT NOW()                    |
| tipo_evento   | VARCHAR(10)  | CHECK IN ('ENTRADA', 'SALIDA')   |

### `retardos`
| Columna            | Tipo      | Restricciones                      |
| ------------------ | --------- | ---------------------------------- |
| id_retardo         | SERIAL    | PRIMARY KEY                        |
| id_alumno          | INTEGER   | FK → alumnos(id_alumno), NOT NULL  |
| fecha              | DATE      | NOT NULL                           |
| minutos_retardo    | INTEGER   | CHECK >= 0, NOT NULL               |
| observaciones      | TEXT      |                                    |

---

## 9. Documentación Interactiva

Una vez ejecutada la app, accede a la documentación generada automáticamente por FastAPI:

- **Swagger UI** (prueba los endpoints directamente): http://localhost:8000/docs
- **ReDoc** (documentación alternativa): http://localhost:8000/redoc
- **OpenAPI JSON** (esquema machine-readable): http://localhost:8000/openapi.json
