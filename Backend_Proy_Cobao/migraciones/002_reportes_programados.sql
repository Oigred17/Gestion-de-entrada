-- Migracion: tabla de reportes programados
-- Aplicar a una BD que ya exista:
--   psql cobao_db < migraciones/002_reportes_programados.sql

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
