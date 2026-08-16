# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Directivo (usuario principal):** revisa reportes (asistencia, retardos, incidencias, faltas al reglamento, credenciales por vencer) y toma decisiones sobre la asistencia; gestiona alumnos, grupos, profesores, credenciales, permisos y configuración. No opera el kiosco a diario.
- **Prefectura:** opera el kiosco NFC y registra incidencias, permisos y faltas al reglamento; controla el acceso del alumnado en el día a día.
- **Servicios Escolares:** administra catálogos (alumnos, grupos, profesores, credenciales) y permisos.

## Product Purpose

Controlar la entrada y salida de alumnos y profesores del plantel mediante credenciales NFC: registrar cada acceso en tiempo real, detectar retardos y faltas, y generar automáticamente incidencias, reportes y faltas al reglamento para que la dirección tome decisiones de asistencia. El éxito se define por el registro fiel de cada evento y por la automatización consistente de retardos, incidencias y faltas, sin duplicados.

## Positioning

Un sistema de control de acceso escolar basado en credenciales NFC que convierte cada entrada o salida en evidencia: en lugar de una bitácora manual, cada evento genera automáticamente retardos, incidencias y faltas al reglamento listos para la administración.

## Operating Context

- Aplicación web con roles: Directivo, Prefectura y Servicios Escolares.
- Un kiosco con lector NFC registra los pases de credenciales (alumnos y profesores); el sistema interpreta cada evento (entrada, salida, sin salida, sin credencial, fuera de horario, acceso no autorizado, etc.).
- Un corte diario automático genera al día siguiente las incidencias de "Falta por inasistencia" y los reportes de "Registro de entrada sin salida" como faltas al reglamento con sanción pendiente.
- El personal administrativo opera desde el navegador dentro del plantel (COBAO Plantel 27 Miahuatlán).

## Capabilities and Constraints

- Registro de entradas y salidas por NFC de alumnos y profesores a través del kiosco web.
- Catálogos: alumnos, grupos, profesores, credenciales (con fecha de vencimiento), permisos y configuración.
- Incidencias (registro manual y automático), retardos, reportes, faltas al reglamento con sanción (cumplida o pendiente) y reportes programados.
- Reglas automáticas idempotentes por fecha de corte; un trigger de base de datos exige rol de prefectura para asignar reportes.
- Los roles restringen las páginas que cada usuario puede operar.

## Brand Commitments

- Sistema de control de acceso del plantel COBAO 27 Miahuatlán, con el logo del plantel. Sin otras restricciones vinculantes confirmadas.

## Evidence on Hand

- Código existente: frontend React + TypeScript + Vite; backend FastAPI + PostgreSQL ejecutado en Docker.
- Datos de demostración: usuarios semilla (admin/admin, prefecto/admin, servicios/admin, entrada/admin) y datos de prueba en la base de datos.
- Sin testimonios, casos de estudio ni material de prensa: no inventar.

## Product Principles

- El registro puntual y fiel de cada acceso es la fuente de verdad.
- La automatización (retardos, incidencias, faltas al reglamento) debe ser idempotente y sin duplicados.
- Cada rol ve únicamente lo que necesita para su trabajo.
- El estado de cada registro (permiso, reporte, sanción) debe ser claro y auditable.
