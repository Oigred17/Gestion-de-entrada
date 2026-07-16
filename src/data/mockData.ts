export interface Student {
  id: number;
  nombre: string;
  numControl: string;
  grupo: string;
  capacitacion: string;
  cohorte: string;
  tutor: string;
  telefonoTutor: string;
  curp: string;
  fechaNacimiento: string;
  tipoSangre: string;
  numAfiliacion: string;
  domicilio: string;
  estado: 'Activo' | 'De baja';
  foto: string;
  turno: 'Matutino' | 'Vespertino';
}

export interface Credential {
  id: number;
  alumnoId: number;
  chipId: string;
  fechaAsignacion: string;
  estado: 'Activa' | 'Inactiva' | 'Bloqueada' | 'Pendiente';
}

export interface ScanRecord {
  id: number;
  alumno: Student;
  tipo: 'entrada' | 'salida' | 'retardo' | 'denegado';
  hora: string;
  fecha: string;
  offline?: boolean;
}

export interface Permission {
  id: number;
  alumno: Student;
  fecha: string;
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
  alumno?: Student;
  descripcion: string;
  registradoPor: string;
  estado: 'Abierto' | 'En revision' | 'Resuelto';
  gravedad: 'Leve' | 'Moderada' | 'Grave';
}

export const students: Student[] = [
  {
    id: 1,
    nombre: 'HERNANDEZ DOROTEO DIEGO JEZRAEL',
    numControl: '25B2707058',
    grupo: '201',
    capacitacion: 'Higiene y Salud Comunitaria',
    cohorte: '2025B',
    tutor: 'Maria Doroteo Hernandez',
    telefonoTutor: '9512345678',
    curp: 'HEGD050815MOCRRL09',
    fechaNacimiento: '2005-08-15',
    tipoSangre: 'O+',
    numAfiliacion: '06160958425',
    domicilio: 'Calle Juarez 15, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 2,
    nombre: 'JUAREZ SANTIAGO KAREN AISLINN',
    numControl: '25B2707111',
    grupo: '201',
    capacitacion: 'Higiene y Salud Comunitaria',
    cohorte: '2025B',
    tutor: 'Rosa Santiago Lopez',
    telefonoTutor: '9513456789',
    curp: 'JUSK060322MOCRRLA1',
    fechaNacimiento: '2006-03-22',
    tipoSangre: 'A+',
    numAfiliacion: '06160958426',
    domicilio: 'Av. Independencia 42, Col. Reforma, Miahuatlan, Oaxaca CP 70805',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 3,
    nombre: 'ANTONIO GARCIA KIMBERLY NAOMI',
    numControl: '24B2706554',
    grupo: '401',
    capacitacion: 'Quimico-Biologico',
    cohorte: '2024B',
    tutor: 'Pedro Antonio Garcia',
    telefonoTutor: '9514567890',
    curp: 'AAGK080710MOCRRN02',
    fechaNacimiento: '2008-07-10',
    tipoSangre: 'B+',
    numAfiliacion: '06160958427',
    domicilio: 'Calle Morelos 8, Barrio de San Francisco, Miahuatlan, Oaxaca CP 70805',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 4,
    nombre: 'ALEIDA XIMENA GARCIA CANSECO',
    numControl: '24B2706630',
    grupo: '26B',
    capacitacion: 'Humanidades',
    cohorte: '2024B',
    tutor: 'Agustina Canseco Antonio',
    telefonoTutor: '9513949530',
    curp: 'GACA090509MOCRNLA9',
    fechaNacimiento: '2009-05-09',
    tipoSangre: 'O+',
    numAfiliacion: '06160958424',
    domicilio: 'Callejon de la Guadalupe sin numero, Barrio San Francisco, Miahuatlan, Oaxaca CP 70805',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 5,
    nombre: 'MARTINEZ LOPEZ CARLOS EDUARDO',
    numControl: '25B2707012',
    grupo: '202',
    capacitacion: 'Higiene y Salud Comunitaria',
    cohorte: '2025B',
    tutor: 'Laura Lopez Sanchez',
    telefonoTutor: '9515678901',
    curp: 'MLCE070212HOCRRL04',
    fechaNacimiento: '2007-02-12',
    tipoSangre: 'AB+',
    numAfiliacion: '06160958428',
    domicilio: 'Calle 5 de Mayo 23, Col. Juarez, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 6,
    nombre: 'RODRIGUEZ PEREZ MARIA FERNANDA',
    numControl: '24B2706501',
    grupo: '402',
    capacitacion: 'Quimico-Biologico',
    cohorte: '2024B',
    tutor: 'Juan Rodriguez Mendez',
    telefonoTutor: '9516789012',
    curp: 'RPMF060918MOCRRF08',
    fechaNacimiento: '2006-09-18',
    tipoSangre: 'O-',
    numAfiliacion: '06160958429',
    domicilio: 'Av. Hidalgo 67, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Vespertino',
  },
  {
    id: 7,
    nombre: 'SANCHEZ GARCIA ANDRES TIMOTEO',
    numControl: '23B2705890',
    grupo: '301',
    capacitacion: 'Economia',
    cohorte: '2023B',
    tutor: 'Teresa Garcia Flores',
    telefonoTutor: '9517890123',
    curp: 'SGAT050530HOCRRA06',
    fechaNacimiento: '2005-05-30',
    tipoSangre: 'A-',
    numAfiliacion: '06160958430',
    domicilio: 'Calle Reforma 12, Col. Lindavista, Miahuatlan, Oaxaca CP 70805',
    estado: 'Activo',
    foto: '',
    turno: 'Vespertino',
  },
  {
    id: 8,
    nombre: 'HERNANDEZ GOMEZ VALENTINA',
    numControl: '25B2707089',
    grupo: '201',
    capacitacion: 'Higiene y Salud Comunitaria',
    cohorte: '2025B',
    tutor: 'Roberto Hernandez Diaz',
    telefonoTutor: '9518901234',
    curp: 'HGV080205MOCRRL01',
    fechaNacimiento: '2008-02-05',
    tipoSangre: 'O+',
    numAfiliacion: '06160958431',
    domicilio: 'Calle Allende 34, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 9,
    nombre: 'TORRES RUIZ EMILIANO',
    numControl: '24B2706600',
    grupo: '401',
    capacitacion: 'Quimico-Biologico',
    cohorte: '2024B',
    tutor: 'Ana Ruiz Castillo',
    telefonoTutor: '9519012345',
    curp: 'TRRE070812HOCRRS03',
    fechaNacimiento: '2007-08-12',
    tipoSangre: 'B-',
    numAfiliacion: '06160958432',
    domicilio: 'Av. Independencia 98, Col. Progreso, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 10,
    nombre: 'CRUZ GONZALEZ SOFIA ALEJANDRA',
    numControl: '25B2707145',
    grupo: '202',
    capacitacion: 'Higiene y Salud Comunitaria',
    cohorte: '2025B',
    tutor: 'Miguel Cruz Martinez',
    telefonoTutor: '9510123456',
    curp: 'CGSA090115MOCRRZ07',
    fechaNacimiento: '2009-01-15',
    tipoSangre: 'O+',
    numAfiliacion: '06160958433',
    domicilio: 'Calle Zapata 56, Col. Emiliano Zapata, Miahuatlan, Oaxaca CP 70805',
    estado: 'Activo',
    foto: '',
    turno: 'Matutino',
  },
  {
    id: 11,
    nombre: 'GARCIA MARTINEZ DIEGO ALEXIS',
    numControl: '23B2705920',
    grupo: '302',
    capacitacion: 'Economia',
    cohorte: '2023B',
    tutor: 'Claudia Martinez Perez',
    telefonoTutor: '9511234567',
    curp: 'GMDA060620HOCRRG05',
    fechaNacimiento: '2006-06-20',
    tipoSangre: 'A+',
    numAfiliacion: '06160958434',
    domicilio: 'Calle Hidalgo 78, Col. Centro, Miahuatlan, Oaxaca CP 70800',
    estado: 'De baja',
    foto: '',
    turno: 'Vespertino',
  },
  {
    id: 12,
    nombre: 'MENDOZA HERNANDEZ PAULINA ANDREA',
    numControl: '24B2706575',
    grupo: '402',
    capacitacion: 'Quimico-Biologico',
    cohorte: '2024B',
    tutor: 'Jorge Mendoza Lopez',
    telefonoTutor: '9512345670',
    curp: 'MHPA080318MOCRRN06',
    fechaNacimiento: '2008-03-18',
    tipoSangre: 'O+',
    numAfiliacion: '06160958435',
    domicilio: 'Av. Universidad 45, Col. Universitaria, Miahuatlan, Oaxaca CP 70800',
    estado: 'Activo',
    foto: '',
    turno: 'Vespertino',
  },
];

export const credentials: Credential[] = students.map((s, i) => ({
  id: i + 1,
  alumnoId: s.id,
  chipId: `NFC-${String(s.id).padStart(4, '0')}-COBAO`,
  fechaAsignacion: `2025-0${(i % 3) + 1}-${String(10 + i).padStart(2, '0')}`,
  estado: i === 10 ? 'Inactiva' : i === 5 ? 'Bloqueada' : 'Activa',
}));

export const recentRecords: ScanRecord[] = [
  { id: 1, alumno: students[0], tipo: 'entrada', hora: '07:15:23', fecha: '2026-07-10' },
  { id: 2, alumno: students[1], tipo: 'entrada', hora: '07:18:45', fecha: '2026-07-10' },
  { id: 3, alumno: students[3], tipo: 'retardo', hora: '07:45:10', fecha: '2026-07-10' },
  { id: 4, alumno: students[2], tipo: 'entrada', hora: '07:20:00', fecha: '2026-07-10' },
  { id: 5, alumno: students[4], tipo: 'entrada', hora: '07:22:33', fecha: '2026-07-10' },
  { id: 6, alumno: students[5], tipo: 'salida', hora: '13:05:12', fecha: '2026-07-10' },
  { id: 7, alumno: students[6], tipo: 'denegado', hora: '08:30:00', fecha: '2026-07-10' },
  { id: 8, alumno: students[7], tipo: 'entrada', hora: '07:12:55', fecha: '2026-07-10' },
  { id: 9, alumno: students[8], tipo: 'entrada', hora: '07:25:18', fecha: '2026-07-10' },
  { id: 10, alumno: students[9], tipo: 'salida', hora: '13:10:45', fecha: '2026-07-10' },
];

export const permissions: Permission[] = [
  { id: 1, alumno: students[0], fecha: '2026-07-10', horaSalida: '12:00', motivo: 'Cita medica', solicitadoPor: 'Directivo', estado: 'Aprobado', codigo: 'X7K2M9' },
  { id: 2, alumno: students[2], fecha: '2026-07-10', horaSalida: '11:30', motivo: 'Asunto familiar', solicitadoPor: 'Directivo', estado: 'Pendiente' },
  { id: 3, alumno: students[4], fecha: '2026-07-09', horaSalida: '14:00', motivo: 'Tramite personal', solicitadoPor: 'Directivo', estado: 'Rechazado' },
  { id: 4, alumno: students[1], fecha: '2026-07-09', horaSalida: '12:30', motivo: 'Consulta medica', solicitadoPor: 'Directivo', estado: 'Vencido' },
  { id: 5, alumno: students[3], fecha: '2026-07-11', horaSalida: '10:00', motivo: 'Emergencia familiar', solicitadoPor: 'Directivo', estado: 'Pendiente' },
];

export const incidents: Incident[] = [
  { id: 1, fecha: '2026-07-10 08:30', tipo: 'Acceso sin credencial', alumno: students[6], descripcion: 'El alumno intento ingresar sin credencial NFC', registradoPor: 'Vigilancia', estado: 'Abierto', gravedad: 'Leve' },
  { id: 2, fecha: '2026-07-10 07:45', tipo: 'Intento no autorizado', descripcion: 'Persona no identificada intento acceder por entrada lateral', registradoPor: 'Vigilancia', estado: 'En revision', gravedad: 'Grave' },
  { id: 3, fecha: '2026-07-09 14:20', tipo: 'Credencial danada', alumno: students[5], descripcion: 'Credencial con chip danado, no lee correctamente', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Moderada' },
  { id: 4, fecha: '2026-07-09 07:15', tipo: 'Acceso fuera de horario', alumno: students[10], descripcion: 'Alumno intento acceder fuera del horario establecido', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Leve' },
  { id: 5, fecha: '2026-07-08 16:00', tipo: 'Alumno no registrado', descripcion: 'Individuo sin registro en el sistema intento acceder con credencial de otro plantel', registradoPor: 'Vigilancia', estado: 'Resuelto', gravedad: 'Grave' },
];

export interface DashboardStats {
  presentes: number;
  total: number;
  retardos: number;
  faltas: number;
  salidas: number;
  incidencias: number;
}

export const dashboardStats: DashboardStats = {
  presentes: 847,
  total: 1000,
  retardos: 23,
  faltas: 130,
  salidas: 45,
  incidencias: 3,
};
