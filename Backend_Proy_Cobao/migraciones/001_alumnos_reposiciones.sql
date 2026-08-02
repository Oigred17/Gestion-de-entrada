-- Migracion: campos nuevos de alumnos y tabla de reposiciones
-- Aplicar a una BD que ya exista (creada antes de estos cambios):
--   psql cobao_db < migraciones/001_alumnos_reposiciones.sql

ALTER TABLE alumnos
    ADD COLUMN IF NOT EXISTS capacitacion VARCHAR(100),
    ADD COLUMN IF NOT EXISTS turno VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cohorte VARCHAR(10),
    ADD COLUMN IF NOT EXISTS fecha_nacimiento VARCHAR(20);

CREATE TABLE IF NOT EXISTS reposiciones (
    id_reposicion      SERIAL PRIMARY KEY,
    id_alumno          INTEGER NOT NULL REFERENCES alumnos(id_alumno),
    id_credencial      INTEGER REFERENCES credenciales(id_credencial),
    motivo             TEXT NOT NULL,
    fecha_solicitud    DATE NOT NULL DEFAULT current_date,
    fecha_entrega      DATE,
    id_usuario_registro INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_registro     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reposiciones_alumno ON reposiciones(id_alumno, fecha_solicitud);

CREATE TABLE IF NOT EXISTS reportes_programados (
    id_reporte_programado SERIAL PRIMARY KEY,
    nombre               VARCHAR(150) NOT NULL,
    frecuencia           VARCHAR(20) NOT NULL,
    ultima_generacion    DATE,
    proxima_generacion   DATE,
    destinatarios        VARCHAR(300),
    activo               BOOLEAN NOT NULL DEFAULT true,
    fecha_registro       TIMESTAMP NOT NULL DEFAULT now()
);
