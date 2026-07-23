CREATE TABLE roles (
    id_rol      SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE usuarios (
    id_usuario          SERIAL PRIMARY KEY,
    nombre_completo     VARCHAR(150) NOT NULL,
    username            VARCHAR(50) NOT NULL UNIQUE,
    password_user       VARCHAR(255) NOT NULL, 
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
    matricula           VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo     VARCHAR(150) NOT NULL,
    curp                CHAR(18) NOT NULL UNIQUE,
    nss                 VARCHAR(11) UNIQUE, 
    tipo_sangre         VARCHAR(3) CHECK (tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    domicilio           TEXT,
    tutor_nombre        VARCHAR(150),
    tutor_telefono      VARCHAR(15),
    activo              BOOLEAN NOT NULL DEFAULT true,
    fecha_registro      TIMESTAMP NOT NULL DEFAULT now(),
    grupo_id            INTEGER REFERENCES grupos(id),
    fecha_nacimiento    DATE,
    genero              VARCHAR(10)
);

CREATE TABLE profesores (
    id_profesor         SERIAL PRIMARY KEY,
    numero_empleado     VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo     VARCHAR(150) NOT NULL,
    telefono            VARCHAR(20),
    domicilio           TEXT,
    activo              BOOLEAN NOT NULL DEFAULT true,
    fecha_registro      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inscripciones (
    id                  SERIAL PRIMARY KEY,
    id_alumno           INT NOT NULL REFERENCES alumnos(id_alumno),
    id_grupo            INT NOT NULL REFERENCES grupos(id),
    ciclo_escolar_id    INT NOT NULL REFERENCES ciclos_escolares(id),
    fecha_inscripcion   DATE NOT NULL DEFAULT current_date,
    UNIQUE (id_alumno, ciclo_escolar_id)
);

CREATE TABLE credenciales (
    id_credencial       SERIAL PRIMARY KEY,
    uid_nfc             VARCHAR(100) UNIQUE NOT NULL,
    fecha_emision       DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE,
    activa              BOOLEAN DEFAULT TRUE,
    id_alumno           INTEGER,
    id_profesor         INTEGER,
    CONSTRAINT fk_credencial_alumno
        FOREIGN KEY(id_alumno) REFERENCES alumnos(id_alumno),
    CONSTRAINT fk_credencial_profesor
        FOREIGN KEY(id_profesor) REFERENCES profesores(id_profesor),
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
