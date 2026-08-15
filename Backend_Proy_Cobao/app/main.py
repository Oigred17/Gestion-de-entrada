"""
Punto de entrada de la aplicación FastAPI - COBAO.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

logging.basicConfig(level=logging.INFO)

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.config import settings
from app.database import async_session, engine
from app.dependencies import AuthMiddleware, require_roles
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.routers import (
    alumnos,
    auth,
    ciclos_escolares,
    configuracion,
    credenciales,
    grupos,
    incidencias,
    inscripciones,
    justificaciones,
    nfc,
    notificaciones,
    permisos,
    profesores,
    registros_acceso,
    reportes,
    reportes_programados,
    reposiciones,
    respaldos,
    retardos,
    roles,
    usuarios,
)
from app.routers.auth import hash_password
from app.services.faltas_asistencia import run_faltas_automaticas_loop

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"

USUARIOS_SEED = [
    {
        "nombre_completo": "Administrador COBAO",
        "username": "admin",
        "password": "admin",
        "rol": "Directivo",
    },
    {
        "nombre_completo": "Prefecto COBAO",
        "username": "prefecto",
        "password": "admin",
        "rol": "Prefectura",
    },
    {
        "nombre_completo": "Servicios Escolares COBAO",
        "username": "servicios",
        "password": "admin",
        "rol": "Servicios Escolares",
    },
    {
        "nombre_completo": "Entrada COBAO",
        "username": "entrada",
        "password": "admin",
        "rol": "Entrada",
    },
]


async def _exec(conn, sql: str) -> None:
    await conn.execute(text(sql))


async def _add_check(conn, constraint: str, table: str, definition: str) -> None:
    await _exec(
        conn,
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = '{constraint}' AND conrelid = '{table}'::regclass
            ) THEN
                ALTER TABLE {table} ADD CONSTRAINT {constraint} CHECK ({definition});
            END IF;
        END $$;
        """,
    )


async def migrate_database():
    """Migraciones idempotentes: convergen cualquier BD existente al esquema
    completo de la aplicacion (esquema oficial bd_COBAO.sql + tablas propias)."""
    async with engine.begin() as conn:
        # ------------------------------------------------------------------
        # Columnas propias que la app necesita (esquema oficial no las trae)
        # ------------------------------------------------------------------
        await _exec(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(120)")
        await _exec(conn, "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS capacitacion VARCHAR(100)")
        await _exec(conn, "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS turno VARCHAR(20)")
        await _exec(conn, "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS cohorte VARCHAR(10)")
        await _exec(conn, "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_nacimiento VARCHAR(20)")
        await _exec(
            conn,
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS id_grupo INTEGER REFERENCES grupos(id)",
        )
        await _exec(conn, "CREATE INDEX IF NOT EXISTS idx_alumnos_grupo ON alumnos(id_grupo)")

        # ------------------------------------------------------------------
        # Tablas de la aplicacion
        # ------------------------------------------------------------------
        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS configuracion_asistencia (
                id                      SMALLINT PRIMARY KEY DEFAULT 1,
                hora_entrada_limite     TIME NOT NULL DEFAULT '07:00:00',
                minutos_tolerancia      SMALLINT NOT NULL DEFAULT 10,
                segundos_antirebote     SMALLINT NOT NULL DEFAULT 15,
                CHECK (id = 1)
            )
            """,
        )
        await _exec(
            conn,
            "INSERT INTO configuracion_asistencia (id) VALUES (1) ON CONFLICT (id) DO NOTHING",
        )

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS inscripciones (
                id_inscripcion       SERIAL PRIMARY KEY,
                id_alumno            INTEGER NOT NULL REFERENCES alumnos(id_alumno),
                id_grupo             INTEGER NOT NULL REFERENCES grupos(id),
                ciclo_escolar_id     INTEGER NOT NULL REFERENCES ciclos_escolares(id),
                fecha_inscripcion    DATE NOT NULL DEFAULT CURRENT_DATE,
                activo               BOOLEAN NOT NULL DEFAULT TRUE,
                UNIQUE (id_alumno, ciclo_escolar_id)
            )
            """,
        )
        await _exec(
            conn,
            "ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS "
            "activo BOOLEAN NOT NULL DEFAULT TRUE",
        )
        await _exec(conn, "CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno ON inscripciones(id_alumno)")
        await _exec(conn, "CREATE INDEX IF NOT EXISTS idx_inscripciones_grupo ON inscripciones(id_grupo)")

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS permisos (
                id_permiso          SERIAL PRIMARY KEY,
                id_alumno           INTEGER NOT NULL REFERENCES alumnos(id_alumno),
                motivo              TEXT NOT NULL,
                fecha_salida        TIMESTAMP,
                fecha_solicitud     TIMESTAMP NOT NULL DEFAULT now(),
                estado              VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
                codigo_autorizacion VARCHAR(8),
                notificar_tutor     BOOLEAN NOT NULL DEFAULT FALSE,
                id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id_usuario),
                fecha_registro      TIMESTAMP NOT NULL DEFAULT now()
            )
            """,
        )
        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS incidencias (
                id_incidencia       SERIAL PRIMARY KEY,
                id_alumno           INTEGER NOT NULL REFERENCES alumnos(id_alumno),
                tipo                VARCHAR(30) NOT NULL,
                descripcion         TEXT NOT NULL,
                estado              VARCHAR(20) NOT NULL DEFAULT 'Abierto',
                notificar           BOOLEAN NOT NULL DEFAULT FALSE,
                evidencia_base64    TEXT,
                id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id_usuario),
                fecha_registro      TIMESTAMP NOT NULL DEFAULT now(),
                fecha_resolucion    TIMESTAMP
            )
            """,
        )
        await _exec(
            conn,
            "ALTER TABLE registros_acceso ADD COLUMN IF NOT EXISTS "
            "id_permiso INTEGER REFERENCES permisos(id_permiso)",
        )

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS configuracion_general (
                id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
                plantel_nombre  VARCHAR(150) DEFAULT 'COBAO Plantel 27 Miahuatlan',
                telefono        VARCHAR(15) DEFAULT '',
                direccion       VARCHAR(255) DEFAULT '',
                correo          VARCHAR(120) DEFAULT '',
                logo_base64     TEXT,
                hora_entrada    VARCHAR(5) DEFAULT '07:00',
                hora_salida     VARCHAR(5) DEFAULT '14:00',
                smtp_host       VARCHAR(120) DEFAULT '',
                smtp_port       INTEGER DEFAULT 587,
                smtp_user       VARCHAR(120) DEFAULT '',
                smtp_password   VARCHAR(200) DEFAULT '',
                smtp_from       VARCHAR(120) DEFAULT '',
                sms_proveedor   VARCHAR(60) DEFAULT '',
                sms_api_key     VARCHAR(200) DEFAULT '',
                sms_remitente   VARCHAR(30) DEFAULT '',
                whatsapp_api_key VARCHAR(200) DEFAULT '',
                whatsapp_numero VARCHAR(30) DEFAULT '',
                notif_email     BOOLEAN NOT NULL DEFAULT TRUE,
                notif_sms       BOOLEAN NOT NULL DEFAULT FALSE,
                notif_whatsapp  BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at      TIMESTAMP NOT NULL DEFAULT now()
            )
            """,
        )
        await _exec(
            conn,
            "INSERT INTO configuracion_general (id) VALUES (1) ON CONFLICT (id) DO NOTHING",
        )
        await _exec(
            conn,
            "ALTER TABLE configuracion_general ADD COLUMN IF NOT EXISTS "
            "dias_habiles VARCHAR(200) "
            "DEFAULT 'Lunes,Martes,Miercoles,Jueves,Viernes'",
        )
        await _exec(
            conn,
            "UPDATE configuracion_general SET dias_habiles = "
            "'Lunes,Martes,Miercoles,Jueves,Viernes' "
            "WHERE dias_habiles IS NULL OR dias_habiles = ''",
        )

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS respaldos (
                id_respaldo   SERIAL PRIMARY KEY,
                fecha         TIMESTAMP NOT NULL DEFAULT now(),
                tamano_bytes  INTEGER NOT NULL DEFAULT 0,
                tipo          VARCHAR(20) NOT NULL DEFAULT 'Manual',
                estado        VARCHAR(20) NOT NULL DEFAULT 'Completado',
                contenido     TEXT NOT NULL
            )
            """,
        )

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS horarios (
                id           SERIAL PRIMARY KEY,
                descripcion  VARCHAR(120) NOT NULL,
                hora_entrada VARCHAR(5) NOT NULL,
                hora_salida  VARCHAR(5) NOT NULL,
                dias         VARCHAR(200) DEFAULT '',
                activo       BOOLEAN NOT NULL DEFAULT TRUE
            )
            """,
        )

        await _exec(
            conn,
            "ALTER TABLE reportes ADD COLUMN IF NOT EXISTS sancion_cumplida "
            "BOOLEAN NOT NULL DEFAULT FALSE",
        )

        # Migracion unica: convertir faltas de asistencia (tabla antigua) en
        # incidencias (FALTANTE) y reportes (SIN_SALIDA), luego eliminar la tabla.
        existe_faltas = (
            await conn.execute(text("SELECT to_regclass('public.faltas_asistencia')"))
        ).scalar_one_or_none()
        if existe_faltas:
            await _exec(
                conn,
                """
                INSERT INTO incidencias (id_alumno, tipo, descripcion, estado, notificar, id_usuario_registro, fecha_registro)
                SELECT fa.id_alumno, 'Falta por inasistencia', 'No registro entrada (faltante)', 'Abierto', FALSE,
                       1, fa.fecha
                FROM faltas_asistencia fa
                WHERE fa.tipo = 'FALTANTE'
                  AND NOT EXISTS (
                      SELECT 1 FROM incidencias i
                      WHERE i.id_alumno = fa.id_alumno
                        AND i.tipo = 'Falta por inasistencia'
                        AND i.fecha_registro::date = fa.fecha
                  )
                """,
            )
            await _exec(
                conn,
                """
                INSERT INTO reportes (id_alumno, id_prefecto, motivo, sancion, sancion_cumplida, fecha)
                SELECT fa.id_alumno, 1, 'Registro de entrada sin salida', 'Pendiente de sancion', FALSE, fa.fecha
                FROM faltas_asistencia fa
                WHERE fa.tipo = 'SIN_SALIDA'
                  AND NOT EXISTS (
                      SELECT 1 FROM reportes r
                      WHERE r.id_alumno = fa.id_alumno
                        AND r.fecha = fa.fecha
                        AND r.motivo = 'Registro de entrada sin salida'
                  )
                """,
            )
            await _exec(conn, "DROP TABLE IF EXISTS faltas_asistencia")

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS reposiciones (
                id_reposicion      SERIAL PRIMARY KEY,
                id_alumno          INTEGER NOT NULL REFERENCES alumnos(id_alumno),
                id_credencial      INTEGER REFERENCES credenciales(id_credencial),
                motivo             TEXT NOT NULL,
                fecha_solicitud    DATE NOT NULL DEFAULT current_date,
                fecha_entrega      DATE,
                id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id_usuario),
                fecha_registro     TIMESTAMP NOT NULL DEFAULT now()
            )
            """,
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_reposiciones_alumno ON reposiciones(id_alumno, fecha_solicitud)",
        )

        await _exec(
            conn,
            """
            CREATE TABLE IF NOT EXISTS reportes_programados (
                id_reporte_programado SERIAL PRIMARY KEY,
                nombre               VARCHAR(150) NOT NULL,
                frecuencia           VARCHAR(20) NOT NULL,
                ultima_generacion    DATE,
                proxima_generacion   DATE,
                destinatarios        VARCHAR(300),
                activo               BOOLEAN NOT NULL DEFAULT true,
                fecha_registro       TIMESTAMP NOT NULL DEFAULT now()
            )
            """,
        )

        # ------------------------------------------------------------------
        # Columnas generadas y restricciones CHECK del esquema oficial
        # ------------------------------------------------------------------
        await _exec(
            conn,
            "ALTER TABLE grupos ADD COLUMN IF NOT EXISTS semestre SMALLINT "
            "GENERATED ALWAYS AS (clave_grupo / 100) STORED",
        )
        await _add_check(conn, "chk_ciclo_fechas", "ciclos_escolares", "fecha_fin > fecha_inicio")
        await _add_check(conn, "chk_grupo_rango", "grupos", "clave_grupo BETWEEN 101 AND 609")
        await _add_check(conn, "chk_grupo_unidad", "grupos", "clave_grupo % 100 BETWEEN 1 AND 9")
        # Recrear si ya existía sin permitir NULL explícito / valores vacíos
        await _exec(
            conn,
            """
            UPDATE alumnos
            SET tipo_sangre = NULL
            WHERE tipo_sangre IS NOT NULL
              AND tipo_sangre NOT IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')
            """,
        )
        await _exec(conn, "ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS chk_alumnos_tipo_sangre")
        await _add_check(
            conn,
            "chk_alumnos_tipo_sangre",
            "alumnos",
            "tipo_sangre IS NULL OR tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')",
        )
        await _add_check(
            conn,
            "chk_credencial_xor",
            "credenciales",
            "(id_alumno IS NOT NULL AND id_profesor IS NULL) "
            "OR (id_alumno IS NULL AND id_profesor IS NOT NULL)",
        )
        await _add_check(
            conn,
            "chk_registros_tipo_evento",
            "registros_acceso",
            "tipo_evento IN ('ENTRADA','SALIDA')",
        )
        await _add_check(conn, "chk_retardos_minutos", "retardos", "minutos_retardo >= 0")
        await _add_check(conn, "chk_justificaciones_fechas", "justificaciones", "fecha_fin >= fecha_inicio")
        await _add_check(
            conn,
            "chk_justificaciones_xor",
            "justificaciones",
            "(id_alumno IS NOT NULL AND id_grupo IS NULL) "
            "OR (id_alumno IS NULL AND id_grupo IS NOT NULL)",
        )

        # ------------------------------------------------------------------
        # Indices del esquema oficial
        # ------------------------------------------------------------------
        await _exec(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_un_solo_ciclo_activo "
            "ON ciclos_escolares (activo) WHERE activo = true",
        )
        await _exec(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_credencial_activa_alumno "
            "ON credenciales (id_alumno) WHERE activa = true AND id_alumno IS NOT NULL",
        )
        await _exec(
            conn,
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_credencial_activa_profesor "
            "ON credenciales (id_profesor) WHERE activa = true AND id_profesor IS NOT NULL",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_registros_credencial_fecha "
            "ON registros_acceso (id_credencial, fecha_hora)",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_justificaciones_alumno "
            "ON justificaciones(id_alumno, fecha_inicio, fecha_fin)",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_justificaciones_grupo "
            "ON justificaciones(id_grupo, fecha_inicio, fecha_fin)",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_justificaciones_usuario "
            "ON justificaciones(id_usuario_registro)",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_reportes_alumno ON reportes(id_alumno, fecha)",
        )
        await _exec(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_reportes_prefecto ON reportes(id_prefecto)",
        )
        await _exec(conn, "CREATE INDEX IF NOT EXISTS idx_credenciales_alumno ON credenciales(id_alumno)")
        await _exec(conn, "CREATE INDEX IF NOT EXISTS idx_credenciales_profesor ON credenciales(id_profesor)")

        # ------------------------------------------------------------------
        # Funciones del esquema oficial
        # ------------------------------------------------------------------
        await _exec(
            conn,
            """
            CREATE OR REPLACE FUNCTION validar_rol_prefecto()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM usuarios u
                    JOIN roles r ON r.id_rol = u.id_rol
                    WHERE u.id_usuario = NEW.id_prefecto
                      AND LOWER(r.nombre) IN ('prefecto', 'prefectura')
                ) THEN
                    RAISE EXCEPTION 'El usuario % no tiene rol de prefecto y no puede levantar reportes', NEW.id_prefecto;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE FUNCTION validar_credencial_unica_activa()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.activa = true THEN
                    IF NEW.id_alumno IS NOT NULL AND EXISTS (
                        SELECT 1 FROM credenciales
                        WHERE id_alumno = NEW.id_alumno AND activa = true AND id_credencial <> NEW.id_credencial
                    ) THEN
                        RAISE EXCEPTION 'El alumno % ya tiene una credencial activa, dala de baja antes de crear otra', NEW.id_alumno;
                    END IF;
                    IF NEW.id_profesor IS NOT NULL AND EXISTS (
                        SELECT 1 FROM credenciales
                        WHERE id_profesor = NEW.id_profesor AND activa = true AND id_credencial <> NEW.id_credencial
                    ) THEN
                        RAISE EXCEPTION 'El profesor % ya tiene una credencial activa, dala de baja antes de crear otra', NEW.id_profesor;
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE FUNCTION registrar_acceso(p_uid_nfc VARCHAR)
            RETURNS TABLE (
                resultado       VARCHAR,
                nombre          VARCHAR,
                tipo_persona    VARCHAR,
                tipo_evento     VARCHAR,
                fecha_hora      TIMESTAMP
            ) AS $$
            DECLARE
                v_credencial    credenciales%ROWTYPE;
                v_ultimo_dia    registros_acceso%ROWTYPE;
                v_ultimo_todos  registros_acceso%ROWTYPE;
                v_config        configuracion_asistencia%ROWTYPE;
                v_nuevo_tipo    VARCHAR(10);
                v_nombre        VARCHAR(150);
                v_tipo_persona  VARCHAR(10);
            BEGIN
                SELECT * INTO v_credencial FROM credenciales WHERE uid_nfc = p_uid_nfc AND activa = true;
                IF NOT FOUND THEN
                    RETURN QUERY SELECT 'ERROR: credencial no encontrada o inactiva'::VARCHAR,
                                        NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP;
                    RETURN;
                END IF;

                IF v_credencial.fecha_vencimiento IS NOT NULL AND v_credencial.fecha_vencimiento < current_date THEN
                    RETURN QUERY SELECT 'ERROR: credencial vencida'::VARCHAR,
                                        NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP;
                    RETURN;
                END IF;

                SELECT * INTO v_config FROM configuracion_asistencia WHERE id = 1;

                SELECT * INTO v_ultimo_todos
                FROM registros_acceso
                WHERE id_credencial = v_credencial.id_credencial
                ORDER BY registros_acceso.fecha_hora DESC
                LIMIT 1;

                IF FOUND AND (now() - v_ultimo_todos.fecha_hora) < make_interval(secs => v_config.segundos_antirebote) THEN
                    RETURN QUERY SELECT 'IGNORADO: lectura duplicada'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
                                        v_ultimo_todos.tipo_evento, v_ultimo_todos.fecha_hora;
                    RETURN;
                END IF;

                SELECT * INTO v_ultimo_dia
                FROM registros_acceso
                WHERE id_credencial = v_credencial.id_credencial
                  AND registros_acceso.fecha_hora::date = current_date
                ORDER BY registros_acceso.fecha_hora DESC
                LIMIT 1;

                IF NOT FOUND OR v_ultimo_dia.tipo_evento = 'SALIDA' THEN
                    v_nuevo_tipo := 'ENTRADA';
                ELSE
                    v_nuevo_tipo := 'SALIDA';
                END IF;

                INSERT INTO registros_acceso (id_credencial, tipo_evento)
                VALUES (v_credencial.id_credencial, v_nuevo_tipo);

                IF v_credencial.id_alumno IS NOT NULL THEN
                    v_tipo_persona := 'alumno';
                    SELECT nombre_completo INTO v_nombre FROM alumnos WHERE id_alumno = v_credencial.id_alumno;

                    IF v_nuevo_tipo = 'ENTRADA'
                       AND localtime > (v_config.hora_entrada_limite + make_interval(mins => v_config.minutos_tolerancia))
                       AND NOT EXISTS (
                            SELECT 1 FROM retardos
                            WHERE id_alumno = v_credencial.id_alumno AND fecha = current_date
                       )
                    THEN
                        INSERT INTO retardos (id_alumno, fecha, minutos_retardo)
                        VALUES (
                            v_credencial.id_alumno,
                            current_date,
                            ROUND(EXTRACT(EPOCH FROM (localtime - v_config.hora_entrada_limite)) / 60)::INTEGER
                        );
                    END IF;
                ELSE
                    v_tipo_persona := 'profesor';
                    SELECT nombre_completo INTO v_nombre FROM profesores WHERE id_profesor = v_credencial.id_profesor;
                END IF;

                RETURN QUERY SELECT 'OK'::VARCHAR, v_nombre, v_tipo_persona, v_nuevo_tipo, now()::TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE FUNCTION reemplazar_credencial(
                p_nuevo_uid     VARCHAR,
                p_id_alumno     INTEGER DEFAULT NULL,
                p_id_profesor   INTEGER DEFAULT NULL
            ) RETURNS INTEGER AS $$
            DECLARE
                v_nuevo_id INTEGER;
            BEGIN
                IF (p_id_alumno IS NULL AND p_id_profesor IS NULL)
                   OR (p_id_alumno IS NOT NULL AND p_id_profesor IS NOT NULL) THEN
                    RAISE EXCEPTION 'Debe indicar exactamente un alumno o un profesor';
                END IF;

                UPDATE credenciales
                SET activa = false
                WHERE activa = true
                  AND ( (p_id_alumno IS NOT NULL AND id_alumno = p_id_alumno)
                     OR (p_id_profesor IS NOT NULL AND id_profesor = p_id_profesor) );

                INSERT INTO credenciales (uid_nfc, id_alumno, id_profesor)
                VALUES (p_nuevo_uid, p_id_alumno, p_id_profesor)
                RETURNING id_credencial INTO v_nuevo_id;

                RETURN v_nuevo_id;
            END;
            $$ LANGUAGE plpgsql;
            """,
        )

        # ------------------------------------------------------------------
        # Triggers del esquema oficial
        # ------------------------------------------------------------------
        await _exec(conn, "DROP TRIGGER IF EXISTS trg_validar_rol_prefecto ON reportes")
        await _exec(
            conn,
            "CREATE TRIGGER trg_validar_rol_prefecto "
            "BEFORE INSERT OR UPDATE ON reportes "
            "FOR EACH ROW EXECUTE FUNCTION validar_rol_prefecto()",
        )
        await _exec(conn, "DROP TRIGGER IF EXISTS trg_validar_credencial_unica_activa ON credenciales")
        await _exec(
            conn,
            "CREATE TRIGGER trg_validar_credencial_unica_activa "
            "BEFORE INSERT OR UPDATE ON credenciales "
            "FOR EACH ROW EXECUTE FUNCTION validar_credencial_unica_activa()",
        )

        # ------------------------------------------------------------------
        # Vistas del esquema oficial (version corregida del GROUP BY)
        # ------------------------------------------------------------------
        await _exec(
            conn,
            """
            CREATE OR REPLACE VIEW vista_estado_actual AS
            SELECT
                COALESCE(a.id_alumno, p.id_profesor)                           AS id_persona,
                CASE WHEN a.id_alumno IS NOT NULL THEN 'alumno' ELSE 'profesor' END AS tipo_persona,
                COALESCE(a.nombre_completo, p.nombre_completo)                 AS nombre_completo,
                COALESCE(a.matricula, p.num_nomina::text)                      AS clave,
                ultimo.tipo_evento                                             AS estado,
                ultimo.fecha_hora                                              AS ultima_actividad
            FROM credenciales c
            LEFT JOIN alumnos a    ON a.id_alumno = c.id_alumno
            LEFT JOIN profesores p ON p.id_profesor = c.id_profesor
            JOIN LATERAL (
                SELECT tipo_evento, fecha_hora
                FROM registros_acceso ra
                WHERE ra.id_credencial = c.id_credencial
                  AND ra.fecha_hora::date = current_date
                ORDER BY fecha_hora DESC
                LIMIT 1
            ) ultimo ON true
            WHERE c.activa = true;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE VIEW vista_asistencia_diaria AS
            SELECT
                COALESCE(a.id_alumno, p.id_profesor)                           AS id_persona,
                CASE WHEN a.id_alumno IS NOT NULL THEN 'alumno' ELSE 'profesor' END AS tipo_persona,
                COALESCE(a.nombre_completo, p.nombre_completo)                 AS nombre_completo,
                ra.fecha_hora::date                                            AS fecha,
                MIN(ra.fecha_hora) FILTER (WHERE ra.tipo_evento = 'ENTRADA')   AS primera_entrada,
                MAX(ra.fecha_hora) FILTER (WHERE ra.tipo_evento = 'SALIDA')    AS ultima_salida
            FROM registros_acceso ra
            JOIN credenciales c     ON c.id_credencial = ra.id_credencial
            LEFT JOIN alumnos a     ON a.id_alumno = c.id_alumno
            LEFT JOIN profesores p  ON p.id_profesor = c.id_profesor
            GROUP BY COALESCE(a.id_alumno, p.id_profesor), tipo_persona, COALESCE(a.nombre_completo, p.nombre_completo), ra.fecha_hora::date;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE VIEW vista_resumen_disciplina AS
            SELECT
                al.id_alumno,
                al.matricula,
                al.nombre_completo,
                g.clave_grupo,
                COUNT(DISTINCT r.id_reporte)   AS total_reportes,
                COUNT(DISTINCT rt.id_retardo)  AS total_retardos
            FROM alumnos al
            LEFT JOIN inscripciones i  ON i.id_alumno = al.id_alumno AND i.activo = true
            LEFT JOIN ciclos_escolares ce ON ce.id = i.ciclo_escolar_id AND ce.activo = true
            LEFT JOIN grupos g         ON g.id = i.id_grupo
            LEFT JOIN reportes r  ON r.id_alumno = al.id_alumno
            LEFT JOIN retardos rt ON rt.id_alumno = al.id_alumno
            GROUP BY al.id_alumno, al.matricula, al.nombre_completo, g.clave_grupo;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE VIEW vista_grupo_actual AS
            SELECT
                a.id_alumno,
                a.matricula,
                a.nombre_completo,
                g.clave_grupo,
                g.semestre,
                ce.nombre AS ciclo_escolar
            FROM alumnos a
            JOIN inscripciones i     ON i.id_alumno = a.id_alumno AND i.activo = true
            JOIN ciclos_escolares ce ON ce.id = i.ciclo_escolar_id AND ce.activo = true
            JOIN grupos g            ON g.id = i.id_grupo;
            """,
        )
        await _exec(
            conn,
            """
            CREATE OR REPLACE VIEW vista_historial_grupos AS
            SELECT
                i.id_alumno,
                a.matricula,
                a.nombre_completo,
                g.clave_grupo,
                g.semestre,
                ce.nombre AS ciclo_escolar,
                i.fecha_inscripcion
            FROM inscripciones i
            JOIN alumnos a           ON a.id_alumno = i.id_alumno
            JOIN grupos g            ON g.id = i.id_grupo
            JOIN ciclos_escolares ce ON ce.id = i.ciclo_escolar_id
            ORDER BY i.id_alumno, ce.fecha_inicio;
            """,
        )

        # ------------------------------------------------------------------
        # Seed del ciclo escolar (igual que bd_COBAO.sql)
        # ------------------------------------------------------------------
        await _exec(
            conn,
            "INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo) "
            "VALUES ('2025-2026', '2025-08-15', '2026-07-15', true) "
            "ON CONFLICT (nombre) DO NOTHING",
        )


async def seed_database():
    async with async_session() as db:
        roles_map = {}
        for rol_nombre in ["Directivo", "Prefectura", "Servicios Escolares", "Entrada"]:
            result = await db.execute(select(Rol).where(Rol.nombre == rol_nombre))
            rol = result.scalar_one_or_none()
            if not rol:
                rol = Rol(nombre=rol_nombre)
                db.add(rol)
                await db.flush()
            roles_map[rol_nombre] = rol.id_rol
        logger.info("Creando/verificando datos iniciales...")
        for u in USUARIOS_SEED:
            result = await db.execute(select(Usuario).where(Usuario.username == u["username"]))
            if result.scalar_one_or_none() is not None:
                continue
            db.add(Usuario(
                nombre_completo=u["nombre_completo"],
                username=u["username"],
                password_user=hash_password(u["password"]),
                id_rol=roles_map[u["rol"]],
                activo=True,
            ))
        await db.commit()
        logger.info("Seed completado.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.secret_key_insecure:
        logger.warning(
            "SECRET_KEY no configurado (usa el valor por defecto). "
            "Configuralo via variable de entorno SECRET_KEY antes de produccion."
        )
    if not settings.nfc_api_key_set:
        logger.warning(
            "NFC_API_KEY vacio: los lectores NFC externos no podran enviar "
            "lecturas. Configura NFC_API_KEY y pon la misma en nfc_key.txt "
            "de cada PC con lector."
        )
    await migrate_database()
    await seed_database()

    tarea_faltas = asyncio.create_task(run_faltas_automaticas_loop())
    logger.info("Tarea de faltas automaticas iniciada.")

    yield

    tarea_faltas.cancel()
    try:
        await tarea_faltas
    except asyncio.CancelledError:
        pass
    await engine.dispose()


app = FastAPI(
    title="COBAO - API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Detras de Cloudflare/nginx el TLS termina en el proxy y la app recibe HTTP.
# Sin esto, FastAPI genera redirects (trailing slash) con Location: http://...
# y el navegador bloquea Mixed Content en paginas HTTPS.
app.add_middleware(
    ProxyHeadersMiddleware, trusted_hosts=settings.trusted_hosts_set
)

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(
    roles.router,
    prefix=API_PREFIX,
    dependencies=[Depends(require_roles("Directivo", "Servicios Escolares"))],
)
app.include_router(
    usuarios.router,
    prefix=API_PREFIX,
    dependencies=[Depends(require_roles("Directivo", "Servicios Escolares"))],
)
app.include_router(ciclos_escolares.router, prefix=API_PREFIX)
app.include_router(
    configuracion.router,
    prefix=API_PREFIX,
    dependencies=[Depends(require_roles("Directivo", "Servicios Escolares"))],
)
app.include_router(alumnos.router, prefix=API_PREFIX)
app.include_router(profesores.router, prefix=API_PREFIX)
app.include_router(grupos.router, prefix=API_PREFIX)
app.include_router(inscripciones.router, prefix=API_PREFIX)
app.include_router(credenciales.router, prefix=API_PREFIX)
app.include_router(justificaciones.router, prefix=API_PREFIX)
app.include_router(permisos.router, prefix=API_PREFIX)
app.include_router(incidencias.router, prefix=API_PREFIX)
app.include_router(reportes.router, prefix=API_PREFIX)
app.include_router(
    reportes_programados.router,
    prefix=API_PREFIX,
    dependencies=[Depends(require_roles("Directivo", "Prefectura"))],
)
app.include_router(reposiciones.router, prefix=API_PREFIX)
app.include_router(registros_acceso.router, prefix=API_PREFIX)
app.include_router(retardos.router, prefix=API_PREFIX)
app.include_router(notificaciones.router, prefix=API_PREFIX)
app.include_router(
    respaldos.router,
    prefix=API_PREFIX,
    dependencies=[Depends(require_roles("Directivo", "Servicios Escolares"))],
)
app.include_router(nfc.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/", tags=["Root"])
async def root():
    return {"mensaje": "API COBAO funcionando"}


# --- Servir React SPA ---
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

CACHEABLE_IMAGE_EXTENSIONS = {".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg", ".ico"}


class CachedStaticFiles(StaticFiles):
    """Sirve los assets hasheados (JS/CSS/img) con cache inmutable por 1 anio."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets",
            CachedStaticFiles(directory=str(assets_dir)),
            name="static-assets",
        )

    SPA_INDEX = FRONTEND_DIR / "index.html"

    @app.middleware("http")
    async def spa_fallback(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if response.status_code == 404 and not path.startswith("/api/"):
            file_path = FRONTEND_DIR / path.lstrip("/")
            if file_path.is_file():
                headers = {}
                if file_path.suffix.lower() in CACHEABLE_IMAGE_EXTENSIONS:
                    headers["Cache-Control"] = "public, max-age=604800"
                return FileResponse(str(file_path), headers=headers)
            return FileResponse(str(SPA_INDEX))
        return response
