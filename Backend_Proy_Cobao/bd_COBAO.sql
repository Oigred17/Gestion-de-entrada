-- Esquema COBAO: base tomada de bd_cobao (esquema oficial) más
-- funcionalidades propias del proyecto (email de usuarios, campos
-- extra de alumnos, reportes programados y reposiciones).

CREATE TABLE roles (
    id_rol      SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE configuracion_asistencia (
    id                      SMALLINT PRIMARY KEY DEFAULT 1,
    hora_entrada_limite     TIME NOT NULL DEFAULT '07:00:00',
    minutos_tolerancia      SMALLINT NOT NULL DEFAULT 10,
    segundos_antirebote     SMALLINT NOT NULL DEFAULT 15,   -- ignora taps repetidos en este lapso
    CHECK (id = 1)
);
INSERT INTO configuracion_asistencia (id) VALUES (1) ON CONFLICT (id) DO nothing;

CREATE TABLE usuarios (
    id_usuario          SERIAL PRIMARY KEY,
    nombre_completo     VARCHAR(150) NOT NULL,
    username            VARCHAR(50) NOT NULL UNIQUE,
    password_user       VARCHAR(255) NOT NULL,
    email               VARCHAR(120),
    id_rol              INTEGER NOT NULL REFERENCES roles(id_rol),
    activo              BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE ciclos_escolares (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(20) NOT NULL UNIQUE,
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT false,
    CHECK (fecha_fin > fecha_inicio)
);

CREATE UNIQUE INDEX idx_un_solo_ciclo_activo
    ON ciclos_escolares (activo)
    WHERE activo = true;

CREATE TABLE grupos (
    id                  SERIAL PRIMARY KEY,
    clave_grupo         SMALLINT NOT NULL,
    semestre            SMALLINT GENERATED ALWAYS AS (clave_grupo / 100) STORED,
    ciclo_escolar_id    INT NOT NULL REFERENCES ciclos_escolares(id),
    CHECK (clave_grupo BETWEEN 101 AND 609),
    CHECK (clave_grupo % 100 BETWEEN 1 AND 9),
    UNIQUE (clave_grupo, ciclo_escolar_id)
);

CREATE TABLE alumnos (
    id_alumno           SERIAL PRIMARY KEY,
    matricula            VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo      VARCHAR(150) NOT NULL,
    curp                 CHAR(18) NOT NULL UNIQUE,
    nss                  VARCHAR(11) UNIQUE,
    tipo_sangre          VARCHAR(3) CHECK (tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    capacitacion         VARCHAR(100),
    turno                VARCHAR(20),
    cohorte              VARCHAR(10),
    fecha_nacimiento     VARCHAR(20),
    domicilio            TEXT,
    tutor_nombre         VARCHAR(150),
    tutor_telefono       VARCHAR(15),
    id_grupo             INTEGER REFERENCES grupos(id),
    activo               BOOLEAN NOT NULL DEFAULT true,
    fecha_registro       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_alumnos_grupo ON alumnos(id_grupo);

CREATE TABLE inscripciones (
    id_inscripcion       SERIAL PRIMARY KEY,
    id_alumno            INTEGER NOT NULL REFERENCES alumnos(id_alumno),
    id_grupo             INTEGER NOT NULL REFERENCES grupos(id),
    ciclo_escolar_id     INTEGER NOT NULL REFERENCES ciclos_escolares(id),
    fecha_inscripcion    DATE NOT NULL DEFAULT CURRENT_DATE,
    activo               BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_alumno, ciclo_escolar_id)
);

CREATE INDEX idx_inscripciones_alumno ON inscripciones(id_alumno);
CREATE INDEX idx_inscripciones_grupo ON inscripciones(id_grupo);

CREATE TABLE profesores (
    id_profesor         SERIAL PRIMARY KEY,
    num_nomina          INTEGER UNIQUE NOT NULL,
    nombre_completo     VARCHAR(150) NOT NULL,
    telefono            VARCHAR(20),
    domicilio           TEXT,
    activo              BOOLEAN NOT NULL DEFAULT true,
    fecha_registro      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credenciales (
    id_credencial       SERIAL PRIMARY KEY,
    uid_nfc             VARCHAR(100) UNIQUE NOT NULL,
    fecha_emision       DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE,
    activa              BOOLEAN DEFAULT TRUE,
    id_alumno           INTEGER,
    id_profesor         INTEGER,
    CONSTRAINT fk_credencial_alumno FOREIGN KEY(id_alumno) REFERENCES alumnos(id_alumno),
    CONSTRAINT fk_credencial_profesor FOREIGN KEY(id_profesor) REFERENCES profesores(id_profesor),
    CHECK (
        (id_alumno IS NOT NULL AND id_profesor IS NULL)
        OR
        (id_alumno IS NULL AND id_profesor IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_credencial_activa_alumno
    ON credenciales (id_alumno)
    WHERE activa = true AND id_alumno IS NOT NULL;

CREATE UNIQUE INDEX idx_credencial_activa_profesor
    ON credenciales (id_profesor)
    WHERE activa = true AND id_profesor IS NOT NULL;

CREATE TABLE registros_acceso (
    id_registro     SERIAL PRIMARY KEY,
    id_credencial   INTEGER NOT NULL REFERENCES credenciales(id_credencial),
    fecha_hora      TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_evento     VARCHAR(10) NOT NULL CHECK (tipo_evento IN ('ENTRADA','SALIDA'))
);

CREATE INDEX idx_registros_credencial_fecha
    ON registros_acceso (id_credencial, fecha_hora);

CREATE TABLE retardos (
    id_retardo          SERIAL PRIMARY KEY,
    id_alumno           INTEGER NOT NULL REFERENCES alumnos(id_alumno),
    fecha                DATE NOT NULL,
    minutos_retardo      INTEGER NOT NULL CHECK (minutos_retardo >= 0),
    observaciones        TEXT
);

CREATE TABLE justificaciones (
    id_justificacion    SERIAL PRIMARY KEY,
    id_alumno           INTEGER REFERENCES alumnos(id_alumno),
    id_grupo            INTEGER REFERENCES grupos(id),
    fecha_inicio         DATE NOT NULL,
    fecha_fin            DATE NOT NULL,
    motivo               TEXT NOT NULL,
    id_usuario_registro  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_registro       TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (fecha_fin >= fecha_inicio),
    CHECK (
        (id_alumno IS NOT NULL AND id_grupo IS NULL)
        OR
        (id_alumno IS NULL AND id_grupo IS NOT NULL)
    )
);

CREATE INDEX idx_justificaciones_alumno ON justificaciones(id_alumno, fecha_inicio, fecha_fin);
CREATE INDEX idx_justificaciones_grupo ON justificaciones(id_grupo, fecha_inicio, fecha_fin);

-- Tabla propia del proyecto: permisos de salida de alumnos
CREATE TABLE permisos (
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
);

-- registros_acceso puede ligarse a un permiso de salida
ALTER TABLE registros_acceso
    ADD COLUMN IF NOT EXISTS id_permiso INTEGER REFERENCES permisos(id_permiso);

-- Tabla propia del proyecto: incidencias disciplinarias
CREATE TABLE incidencias (
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
);

-- Tabla propia del proyecto: configuracion general (datos del plantel y notificaciones)
CREATE TABLE configuracion_general (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    plantel_nombre  VARCHAR(150) DEFAULT 'COBAO Plantel 27 Miahuatlan',
    telefono        VARCHAR(15) DEFAULT '',
    direccion       VARCHAR(255) DEFAULT '',
    correo          VARCHAR(120) DEFAULT '',
    logo_base64     TEXT,
    hora_entrada    VARCHAR(5) DEFAULT '07:00',
    hora_salida     VARCHAR(5) DEFAULT '14:00',
    dias_habiles    VARCHAR(200) DEFAULT 'Lunes,Martes,Miercoles,Jueves,Viernes',
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
);
INSERT INTO configuracion_general (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Tabla propia del proyecto: respaldos de la base de datos
CREATE TABLE respaldos (
    id_respaldo   SERIAL PRIMARY KEY,
    fecha         TIMESTAMP NOT NULL DEFAULT now(),
    tamano_bytes  INTEGER NOT NULL DEFAULT 0,
    tipo          VARCHAR(20) NOT NULL DEFAULT 'Manual',
    estado        VARCHAR(20) NOT NULL DEFAULT 'Completado',
    contenido     TEXT NOT NULL
);

-- Tabla propia del proyecto: horarios de entrada/salida
CREATE TABLE horarios (
    id           SERIAL PRIMARY KEY,
    descripcion  VARCHAR(120) NOT NULL,
    hora_entrada VARCHAR(5) NOT NULL,
    hora_salida  VARCHAR(5) NOT NULL,
    dias         VARCHAR(200) DEFAULT '',
    activo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabla propia del proyecto (no existe en el esquema oficial)
CREATE TABLE reportes_programados (
    id_reporte_programado SERIAL PRIMARY KEY,
    nombre               VARCHAR(150) NOT NULL,
    frecuencia           VARCHAR(20) NOT NULL,
    ultima_generacion    DATE,
    proxima_generacion   DATE,
    destinatarios        VARCHAR(300),
    activo               BOOLEAN NOT NULL DEFAULT true,
    fecha_registro       TIMESTAMP NOT NULL DEFAULT now()
);

-- Tabla propia del proyecto (no existe en el esquema oficial)
CREATE TABLE reposiciones (
    id_reposicion      SERIAL PRIMARY KEY,
    id_alumno          INTEGER NOT NULL REFERENCES alumnos(id_alumno),
    id_credencial      INTEGER REFERENCES credenciales(id_credencial),
    motivo             TEXT NOT NULL,
    fecha_solicitud    DATE NOT NULL DEFAULT current_date,
    fecha_entrega      DATE,
    id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_registro     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_reposiciones_alumno ON reposiciones(id_alumno, fecha_solicitud);

CREATE TABLE reportes (
    id_reporte          SERIAL PRIMARY KEY,
    id_alumno           INTEGER NOT NULL REFERENCES alumnos(id_alumno),
    id_prefecto         INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    motivo               TEXT NOT NULL,
    sancion               TEXT NOT NULL,
    sancion_cumplida      BOOLEAN NOT NULL DEFAULT FALSE,
    fecha                 DATE NOT NULL DEFAULT current_date,
    fecha_registro        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_reportes_alumno ON reportes(id_alumno, fecha);

-- Funciones

-- Adaptado al proyecto: el rol de prefecto se llama "Prefectura" en el seed,
-- pero tambien se acepta "prefecto" por compatibilidad con el esquema oficial.
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

CREATE TRIGGER trg_validar_rol_prefecto
    BEFORE INSERT OR UPDATE ON reportes
    FOR EACH ROW EXECUTE FUNCTION validar_rol_prefecto();

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

    -- Anti-rebote: si el último tap de esta credencial fue hace muy poco, se ignora
    SELECT * INTO v_ultimo_todos
    FROM registros_acceso
    WHERE id_credencial = v_credencial.id_credencial
    ORDER BY fecha_hora DESC
    LIMIT 1;

    IF FOUND AND (now() - v_ultimo_todos.fecha_hora) < make_interval(secs => v_config.segundos_antirebote) THEN
        RETURN QUERY SELECT 'IGNORADO: lectura duplicada'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
                            v_ultimo_todos.tipo_evento, v_ultimo_todos.fecha_hora;
        RETURN;
    END IF;

    SELECT * INTO v_ultimo_dia
    FROM registros_acceso
    WHERE id_credencial = v_credencial.id_credencial
      AND fecha_hora::date = current_date
    ORDER BY fecha_hora DESC
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

        -- Retardo automático: solo en la entrada, solo una vez al día, solo si pasó la tolerancia
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

-- SELECT * FROM registrar_acceso('04A3B2C1D0');

-- -------------------------------------------------
-- FUNCIÓN: reemplazar_credencial
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

-- SELECT reemplazar_credencial('04FFEEDD01', p_id_alumno => 123);

-- 3. TRIGGER: evitar credenciales activas duplicadas por seguridad extra
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

CREATE TRIGGER trg_validar_credencial_unica_activa
    BEFORE INSERT OR UPDATE ON credenciales
    FOR EACH ROW EXECUTE FUNCTION validar_credencial_unica_activa();

-- VISTA: esta vista muestra quién está dentro/fuera del plantel
CREATE VIEW vista_estado_actual AS
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

-- VISTA: asistencia diaria (primera entrada / última salida por día)
CREATE VIEW vista_asistencia_diaria AS
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

-- VISTA: resumen disciplinario por alumno (reportes + retardos)
CREATE VIEW vista_resumen_disciplina AS
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

CREATE INDEX idx_reportes_prefecto ON reportes(id_prefecto);
CREATE INDEX idx_justificaciones_usuario ON justificaciones(id_usuario_registro);
CREATE INDEX idx_credenciales_alumno ON credenciales(id_alumno);
CREATE INDEX idx_credenciales_profesor ON credenciales(id_profesor);

-- Grupo actual de cada alumno (según el ciclo escolar activo)
CREATE VIEW vista_grupo_actual AS
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

-- Historial completo: todos los grupos que ha cursado un alumno
CREATE VIEW vista_historial_grupos AS
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

-- Seed data
INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
VALUES ('2025-2026', '2025-08-15', '2026-07-15', true);
