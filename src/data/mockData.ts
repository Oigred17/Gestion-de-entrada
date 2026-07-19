export interface Alumno {
  idAlumno: number;
  matricula: string;
  nombreCompleto: string;
  curp: string;
  nss: string | null;
  tipoSangre: string | null;
  domicilio: string | null;
  tutorNombre: string | null;
  tutorTelefono: string | null;
  activo: boolean;
  fechaRegistro: string;
  grupo: string;
  turno: 'Matutino' | 'Vespertino';
  capacitacion: string;
  cohorte: string;
}

export interface Credencial {
  idCredencial: number;
  uidNfc: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  activa: boolean;
  idAlumno: number | null;
  idProfesor: number | null;
}

export interface RegistroAcceso {
  idRegistro: number;
  idCredencial: number;
  fechaHora: string;
  tipoEvento: 'ENTRADA' | 'SALIDA';
}

export interface Retardo {
  idRetardo: number;
  idAlumno: number;
  fecha: string;
  minutosRetardo: number;
  observaciones: string | null;
}

export interface Grupo {
  id: number;
  claveGrupo: number;
  semestre: number;
  cicloEscolarId: number;
}

export interface Inscripcion {
  id: number;
  idAlumno: number;
  idGrupo: number;
  cicloEscolarId: number;
  fechaInscripcion: string;
}

export interface Profesor {
  idProfesor: number;
  numeroEmpleado: string;
  nombreCompleto: string;
  telefono: string | null;
  domicilio: string | null;
  activo: boolean;
  fechaRegistro: string;
}

export interface CicloEscolar {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface Rol {
  idRol: number;
  nombre: string;
}

export interface Usuario {
  idUsuario: number;
  nombreCompleto: string;
  username: string;
  passwordUser: string;
  idRol: number;
  activo: boolean;
  fechaCreacion: string;
}

export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado';

export interface Permission {
  id: number;
  alumno: Alumno;
  fecha: string;
  esVariosDias?: boolean;
  diasSemana?: DiaSemana[];
  horaSalida: string;
  motivo: string;
  solicitadoPor: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido';
  codigo?: string;
}

export interface Incident {
  id: number;
  fecha: string;
  tipo: string;
  alumno?: Alumno;
  descripcion: string;
  registradoPor: string;
  estado: 'Abierto' | 'En revision' | 'Resuelto';
  gravedad: 'Leve' | 'Moderada' | 'Grave';
}

export interface DashboardStats {
  presentes: number;
  total: number;
  retardos: number;
  faltas: number;
  salidas: number;
  incidencias: number;
}

export const alumnos: Alumno[] = [
  {
    idAlumno: 1,
    nombreCompleto: 'HERNANDEZ DOROTEO DIEGO JEZRAEL',
    matricula: '25B2707058',
    grupo: '201',
    tutorNombre: 'Maria Doroteo Hernandez',
    tutorTelefono: '9512345678',
    curp: 'HEGD050815MOCRRL09',
    tipoSangre: 'O+',
    nss: '06160958425',
    domicilio: 'Calle Juarez 15, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2025-08-10',
    turno: 'Matutino',
    capacitacion: 'Ciberseguridad',
    cohorte: '2025',
  },
  {
    idAlumno: 2,
    nombreCompleto: 'JUAREZ SANTIAGO KAREN AISLINN',
    matricula: '25B2707111',
    grupo: '201',
    tutorNombre: 'Rosa Santiago Lopez',
    tutorTelefono: '9513456789',
    curp: 'JUSK060322MOCRRLA1',
    tipoSangre: 'A+',
    nss: '06160958426',
    domicilio: 'Av. Independencia 42, Col. Reforma, Miahuatlan, Oaxaca CP 70805',
    activo: true,
    fechaRegistro: '2025-08-10',
    turno: 'Matutino',
    capacitacion: 'Ciberseguridad',
    cohorte: '2025',
  },
  {
    idAlumno: 3,
    nombreCompleto: 'ANTONIO GARCIA KIMBERLY NAOMI',
    matricula: '24B2706554',
    grupo: '401',
    tutorNombre: 'Pedro Antonio Garcia',
    tutorTelefono: '9514567890',
    curp: 'AAGK080710MOCRRN02',
    tipoSangre: 'B+',
    nss: '06160958427',
    domicilio: 'Calle Morelos 8, Barrio de San Francisco, Miahuatlan, Oaxaca CP 70805',
    activo: true,
    fechaRegistro: '2024-08-12',
    turno: 'Vespertino',
    capacitacion: 'Mecanica',
    cohorte: '2024',
  },
  {
    idAlumno: 4,
    nombreCompleto: 'ALEIDA XIMENA GARCIA CANSECO',
    matricula: '24B2706630',
    grupo: '260',
    tutorNombre: 'Agustina Canseco Antonio',
    tutorTelefono: '9513949530',
    curp: 'GACA090509MOCRNLA9',
    tipoSangre: 'O+',
    nss: '06160958424',
    domicilio: 'Callejon de la Guadalupe sin numero, Barrio San Francisco, Miahuatlan, Oaxaca CP 70805',
    activo: true,
    fechaRegistro: '2024-08-12',
    turno: 'Matutino',
    capacitacion: 'Mecanica',
    cohorte: '2024',
  },
  {
    idAlumno: 5,
    nombreCompleto: 'MARTINEZ LOPEZ CARLOS EDUARDO',
    matricula: '25B2707012',
    grupo: '202',
    tutorNombre: 'Laura Lopez Sanchez',
    tutorTelefono: '9515678901',
    curp: 'MLCE070212HOCRRL04',
    tipoSangre: 'AB+',
    nss: '06160958428',
    domicilio: 'Calle 5 de Mayo 23, Col. Juarez, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2025-08-10',
    turno: 'Matutino',
    capacitacion: 'Ciberseguridad',
    cohorte: '2025',
  },
  {
    idAlumno: 6,
    nombreCompleto: 'RODRIGUEZ PEREZ MARIA FERNANDA',
    matricula: '24B2706501',
    grupo: '402',
    tutorNombre: 'Juan Rodriguez Mendez',
    tutorTelefono: '9516789012',
    curp: 'RPMF060918MOCRRF08',
    tipoSangre: 'O-',
    nss: '06160958429',
    domicilio: 'Av. Hidalgo 67, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2024-08-12',
    turno: 'Vespertino',
    capacitacion: 'Mecanica',
    cohorte: '2024',
  },
  {
    idAlumno: 7,
    nombreCompleto: 'SANCHEZ GARCIA ANDRES TIMOTEO',
    matricula: '23B2705890',
    grupo: '301',
    tutorNombre: 'Teresa Garcia Flores',
    tutorTelefono: '9517890123',
    curp: 'SGAT050530HOCRRA06',
    tipoSangre: 'A-',
    nss: '06160958430',
    domicilio: 'Calle Reforma 12, Col. Lindavista, Miahuatlan, Oaxaca CP 70805',
    activo: true,
    fechaRegistro: '2023-08-14',
    turno: 'Matutino',
    capacitacion: 'Administracion',
    cohorte: '2023',
  },
  {
    idAlumno: 8,
    nombreCompleto: 'HERNANDEZ GOMEZ VALENTINA',
    matricula: '25B2707089',
    grupo: '201',
    tutorNombre: 'Roberto Hernandez Diaz',
    tutorTelefono: '9518901234',
    curp: 'HGV080205MOCRRL01',
    tipoSangre: 'O+',
    nss: '06160958431',
    domicilio: 'Calle Allende 34, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2025-08-10',
    turno: 'Matutino',
    capacitacion: 'Ciberseguridad',
    cohorte: '2025',
  },
  {
    idAlumno: 9,
    nombreCompleto: 'TORRES RUIZ EMILIANO',
    matricula: '24B2706600',
    grupo: '401',
    tutorNombre: 'Ana Ruiz Castillo',
    tutorTelefono: '9519012345',
    curp: 'TRRE070812HOCRRS03',
    tipoSangre: 'B-',
    nss: '06160958432',
    domicilio: 'Av. Independencia 98, Col. Progreso, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2024-08-12',
    turno: 'Vespertino',
    capacitacion: 'Mecanica',
    cohorte: '2024',
  },
  {
    idAlumno: 10,
    nombreCompleto: 'CRUZ GONZALEZ SOFIA ALEJANDRA',
    matricula: '25B2707145',
    grupo: '202',
    tutorNombre: 'Miguel Cruz Martinez',
    tutorTelefono: '9510123456',
    curp: 'CGSA090115MOCRRZ07',
    tipoSangre: 'O+',
    nss: '06160958433',
    domicilio: 'Calle Zapata 56, Col. Emiliano Zapata, Miahuatlan, Oaxaca CP 70805',
    activo: true,
    fechaRegistro: '2025-08-10',
    turno: 'Matutino',
    capacitacion: 'Ciberseguridad',
    cohorte: '2025',
  },
  {
    idAlumno: 11,
    nombreCompleto: 'GARCIA MARTINEZ DIEGO ALEXIS',
    matricula: '23B2705920',
    grupo: '302',
    tutorNombre: 'Claudia Martinez Perez',
    tutorTelefono: '9511234567',
    curp: 'GMDA060620HOCRRG05',
    tipoSangre: 'A+',
    nss: '06160958434',
    domicilio: 'Calle Hidalgo 78, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    activo: false,
    fechaRegistro: '2023-08-14',
    turno: 'Matutino',
    capacitacion: 'Administracion',
    cohorte: '2023',
  },
  {
    idAlumno: 12,
    nombreCompleto: 'MENDOZA HERNANDEZ PAULINA ANDREA',
    matricula: '24B2706575',
    grupo: '402',
    tutorNombre: 'Jorge Mendoza Lopez',
    tutorTelefono: '9512345670',
    curp: 'MHPA080318MOCRRN06',
    tipoSangre: 'O+',
    nss: '06160958435',
    domicilio: 'Av. Universidad 45, Col. Universitaria, Miahuatlan, Oaxaca CP 70800',
    activo: true,
    fechaRegistro: '2024-08-12',
    turno: 'Vespertino',
    capacitacion: 'Mecanica',
    cohorte: '2024',
  },
];

export const credenciales: Credencial[] = alumnos.map((a, i) => ({
  idCredencial: i + 1,
  uidNfc: `NFC-${String(a.idAlumno).padStart(4, '0')}-COBAO`,
  fechaEmision: `2025-0${(i % 3) + 1}-${String(10 + i).padStart(2, '0')}`,
  fechaVencimiento: null,
  activa: i === 10 ? false : i === 5 ? false : true,
  idAlumno: a.idAlumno,
  idProfesor: null,
}));

export const registrosAcceso: RegistroAcceso[] = [
  { idRegistro: 1, idCredencial: 1, fechaHora: '2026-07-10T07:15:23', tipoEvento: 'ENTRADA' },
  { idRegistro: 2, idCredencial: 2, fechaHora: '2026-07-10T07:18:45', tipoEvento: 'ENTRADA' },
  { idRegistro: 3, idCredencial: 4, fechaHora: '2026-07-10T07:45:10', tipoEvento: 'ENTRADA' },
  { idRegistro: 4, idCredencial: 3, fechaHora: '2026-07-10T07:20:00', tipoEvento: 'ENTRADA' },
  { idRegistro: 5, idCredencial: 5, fechaHora: '2026-07-10T07:22:33', tipoEvento: 'ENTRADA' },
  { idRegistro: 6, idCredencial: 6, fechaHora: '2026-07-10T13:05:12', tipoEvento: 'SALIDA' },
  { idRegistro: 7, idCredencial: 8, fechaHora: '2026-07-10T07:12:55', tipoEvento: 'ENTRADA' },
  { idRegistro: 8, idCredencial: 9, fechaHora: '2026-07-10T07:25:18', tipoEvento: 'ENTRADA' },
  { idRegistro: 9, idCredencial: 10, fechaHora: '2026-07-10T13:10:45', tipoEvento: 'SALIDA' },
];

export const retardos: Retardo[] = [
  { idRetardo: 1, idAlumno: 4, fecha: '2026-07-10', minutosRetardo: 15, observaciones: 'Llegada tardia sin justificacion' },
];

export function getAlumnoById(id: number): Alumno | undefined {
  return alumnos.find(a => a.idAlumno === id);
}

export function getCredencialByAlumnoId(idAlumno: number): Credencial | undefined {
  return credenciales.find(c => c.idAlumno === idAlumno);
}

export function getAlumnoByCredencialId(idCredencial: number): Alumno | undefined {
  const cred = credenciales.find(c => c.idCredencial === idCredencial);
  if (!cred || !cred.idAlumno) return undefined;
  return alumnos.find(a => a.idAlumno === cred.idAlumno);
}

export function getAlumnoNombre(idAlumno: number): string {
  return getAlumnoById(idAlumno)?.nombreCompleto ?? 'Desconocido';
}

export function getAlumnoMatricula(idAlumno: number): string {
  return getAlumnoById(idAlumno)?.matricula ?? '---';
}

export function getAlumnoGrupo(idAlumno: number): string {
  return getAlumnoById(idAlumno)?.grupo ?? '---';
}

export const permissions: Permission[] = [
  { id: 1, alumno: alumnos[0], fecha: '2026-07-10', horaSalida: '12:00', motivo: 'Cita medica', solicitadoPor: 'Directivo (Lic. Fabian Ocampo)', estado: 'Aprobado', codigo: 'X7K2M9' },
  { id: 2, alumno: alumnos[2], fecha: '2026-07-10', horaSalida: '11:30', motivo: 'Asunto familiar', solicitadoPor: 'Directivo (Lic. Fabian Ocampo)', estado: 'Pendiente' },
  { id: 3, alumno: alumnos[4], fecha: '2026-07-09', horaSalida: '14:00', motivo: 'Tramite personal', solicitadoPor: 'Prefecto (Vigilancia)', estado: 'Rechazado' },
  { id: 4, alumno: alumnos[1], fecha: '2026-07-09', horaSalida: '12:30', motivo: 'Consulta medica', solicitadoPor: 'Directivo (Lic. Fabian Ocampo)', estado: 'Vencido' },
  { id: 5, alumno: alumnos[3], fecha: '2026-07-11', esVariosDias: true, diasSemana: ['Lunes', 'Miercoles', 'Viernes'], horaSalida: '10:00', motivo: 'Terapia fisica recurrente', solicitadoPor: 'Prefecto (Vigilancia)', estado: 'Pendiente' },
];

export const incidents: Incident[] = [
  { id: 1, fecha: '2026-07-10 08:30', tipo: 'Acceso sin credencial', alumno: alumnos[6], descripcion: 'El alumno intento ingresar sin credencial NFC', registradoPor: 'Vigilancia', estado: 'Abierto', gravedad: 'Leve' },
  { id: 2, fecha: '2026-07-10 07:45', tipo: 'Intento no autorizado', descripcion: 'Persona no identificada intento acceder por entrada lateral', registradoPor: 'Vigilancia', estado: 'En revision', gravedad: 'Grave' },
  { id: 3, fecha: '2026-07-09 14:20', tipo: 'Credencial danada', alumno: alumnos[5], descripcion: 'Credencial con chip danado, no lee correctamente', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Moderada' },
  { id: 4, fecha: '2026-07-09 07:15', tipo: 'Acceso fuera de horario', alumno: alumnos[10], descripcion: 'Alumno intento acceder fuera del horario establecido', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Leve' },
  { id: 5, fecha: '2026-07-08 16:00', tipo: 'Alumno no registrado', descripcion: 'Individuo sin registro en el sistema intento acceder con credencial de otro plantel', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Grave' },
];

export const dashboardStats: DashboardStats = {
  presentes: 847,
  total: 1000,
  retardos: 23,
  faltas: 130,
  salidas: 45,
  incidencias: 3,
};

export const roles: Rol[] = [
  { idRol: 1, nombre: 'Directivo' },
  { idRol: 2, nombre: 'Prefectura' },
  { idRol: 3, nombre: 'Administrador' },
];

export const usuarios: Usuario[] = [
  { idUsuario: 1, nombreCompleto: 'Director Perez', username: 'director', passwordUser: 'admin123', idRol: 1, activo: true, fechaCreacion: '2025-01-15' },
  { idUsuario: 2, nombreCompleto: 'Prefecto Ramirez', username: 'prefecto', passwordUser: 'pref123', idRol: 2, activo: true, fechaCreacion: '2025-01-15' },
];

export const ciclosEscolares: CicloEscolar[] = [
  { id: 1, nombre: '2025-2026', fechaInicio: '2025-08-11', fechaFin: '2026-07-15', activo: true },
  { id: 2, nombre: '2024-2025', fechaInicio: '2024-08-12', fechaFin: '2025-07-11', activo: false },
  { id: 3, nombre: '2023-2024', fechaInicio: '2023-08-14', fechaFin: '2024-07-12', activo: false },
];

export const grupos: Grupo[] = [
  { id: 1, claveGrupo: 201, semestre: 2, cicloEscolarId: 1 },
  { id: 2, claveGrupo: 202, semestre: 2, cicloEscolarId: 1 },
  { id: 3, claveGrupo: 260, semestre: 2, cicloEscolarId: 1 },
  { id: 4, claveGrupo: 301, semestre: 3, cicloEscolarId: 1 },
  { id: 5, claveGrupo: 302, semestre: 3, cicloEscolarId: 1 },
  { id: 6, claveGrupo: 401, semestre: 4, cicloEscolarId: 1 },
  { id: 7, claveGrupo: 402, semestre: 4, cicloEscolarId: 1 },
];

export const inscripciones: Inscripcion[] = [
  { id: 1, idAlumno: 1, idGrupo: 1, cicloEscolarId: 1, fechaInscripcion: '2025-08-10' },
  { id: 2, idAlumno: 2, idGrupo: 1, cicloEscolarId: 1, fechaInscripcion: '2025-08-10' },
  { id: 3, idAlumno: 3, idGrupo: 6, cicloEscolarId: 1, fechaInscripcion: '2024-08-12' },
  { id: 4, idAlumno: 4, idGrupo: 3, cicloEscolarId: 1, fechaInscripcion: '2024-08-12' },
  { id: 5, idAlumno: 5, idGrupo: 2, cicloEscolarId: 1, fechaInscripcion: '2025-08-10' },
  { id: 6, idAlumno: 6, idGrupo: 7, cicloEscolarId: 1, fechaInscripcion: '2024-08-12' },
  { id: 7, idAlumno: 7, idGrupo: 4, cicloEscolarId: 1, fechaInscripcion: '2023-08-14' },
  { id: 8, idAlumno: 8, idGrupo: 1, cicloEscolarId: 1, fechaInscripcion: '2025-08-10' },
  { id: 9, idAlumno: 9, idGrupo: 6, cicloEscolarId: 1, fechaInscripcion: '2024-08-12' },
  { id: 10, idAlumno: 10, idGrupo: 2, cicloEscolarId: 1, fechaInscripcion: '2025-08-10' },
  { id: 11, idAlumno: 11, idGrupo: 5, cicloEscolarId: 1, fechaInscripcion: '2023-08-14' },
  { id: 12, idAlumno: 12, idGrupo: 7, cicloEscolarId: 1, fechaInscripcion: '2024-08-12' },
];

export const profesores: Profesor[] = [
  { idProfesor: 1, numeroEmpleado: 'EMP001', nombreCompleto: 'Lic. Fabian Ocampo Godinez', telefono: '9511111111', domicilio: 'Av. Principal 100, Miahuatlan', activo: true, fechaRegistro: '2020-01-15' },
  { idProfesor: 2, numeroEmpleado: 'EMP002', nombreCompleto: 'Lic. Maria Santos Luna', telefono: '9512222222', domicilio: 'Calle Reforma 50, Miahuatlan', activo: true, fechaRegistro: '2021-03-10' },
];
