# Cobao NFC - Sistema de Gestion de Entrada

Sistema web para la gestion de entrada y control de acceso mediante credenciales NFC para el centro de capacitacion COBAO.

## Tecnologias

- React 19.2
- TypeScript 6.0
- Vite 8.1
- react-router-dom 7.18
- Lucide React (iconografia)
- Recharts (graficas)
- jsPDF (generacion de PDF)
- SheetJS / xlsx (importacion de archivos Excel)
- Oxlint (linting)

## Estructura del proyecto

```
src/
  components/
    Layout.tsx          -- Layout principal con barra lateral
  data/
    mockData.ts         -- Interfaces de tipos y datos de prueba
  pages/
    LoginPage.tsx       -- Pagina de inicio de sesion
    DashboardPage.tsx   -- Panel principal con estadisticas
    StudentsPage.tsx    -- Gestion de alumnos (lista, agregar, editar, importar)
    GruposPage.tsx      -- Gestion de grupos
    CredentialsPage.tsx -- Asignacion y gestion de credenciales NFC
    CredentialDetailPage.tsx -- Detalle de una credencial
    PermissionsPage.tsx -- Solicitudes de permiso de alumnos
    IncidentsPage.tsx   -- Registro de incidentes
    ReportsPage.tsx     -- Generacion de reportes y asistencia
    ScanPage.tsx        -- Escaneo NFC y entrada manual
    ConfigPage.tsx      -- Configuracion del sistema
  styles/
    index.css           -- Estilos globales y variables CSS
  utils/
    generateStudentListPDF.ts  -- Generacion de PDF con lista de alumnos
    generateCredentialsPDF.ts  -- Generacion de PDF de credenciales
  App.tsx               -- Rutas de la aplicacion
  main.tsx              -- Punto de entrada
```

## Paginas y funcionalidades

- **Login**: Autenticacion de usuarios con selector de rol (Administrador, Supervisor, Operador, Capturista).
- **Dashboard**: Resumen de asistencia, entradas/salidas recientes, asistencia por grupo y alertas.
- **Alumnos**: Lista paginada con busqueda, creacion manual, importacion desde archivo .xls/.xlsx/.csv, edicion y vista detallada.
- **Grupos**: Vista de grupos con conteo de alumnos y desglose por estado.
- **Credenciales NFC**: Asignacion de chips NFC a alumnos mediante proceso de 3 pasos (seleccionar, escribir, verificar), reasignacion y exportacion a PDF.
- **Permisos**: Solicitudes de salida con aprobacion, codigo de autorizacion y notificacion al tutor.
- **Incidentes**: Registro de incidentes con nivel de severidad y estados.
- **Reportes**: Generacion de reportes por grupo, asistencia, graficas de barras y exportacion.
- **Escaneo NFC**: Modo escaneo por NFC y modo manual para registro de entradas/salidas.
- **Configuracion**: Ajustes generales, horarios, usuarios del sistema, layout de credencial y subida de logo.

## Como ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para produccion
npm run build

# Vista previa de produccion
npm run preview

# Linting
npm run lint
```

## Formato de importacion de alumnos

Para importar alumnos desde un archivo Excel (.xls, .xlsx o .csv), el archivo debe contener las siguientes columnas:

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
