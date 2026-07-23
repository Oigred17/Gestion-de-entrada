export interface Alumno {
  id: number;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  grupo_id?: number;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  capacitacion?: string;
  cohorte?: string;
  turno?: string;
  grupo_nombre?: string;
}

export interface AlumnoCreate {
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  grupo_id?: number;
  estatus?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  capacitacion?: string;
  cohorte?: string;
  turno?: string;
  grupo_nombre?: string;
}

export interface AlumnoUpdate {
  matricula?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  grupo_id?: number;
  estatus?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  capacitacion?: string;
  cohorte?: string;
  turno?: string;
  grupo_nombre?: string;
}

export interface Profesor {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfesorCreate {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  estatus?: string;
}

export interface Grupo {
  id: number;
  nombre: string;
  descripcion?: string;
  ciclo_escolar_id?: number;
  profesor_id?: number;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface GrupoCreate {
  nombre: string;
  descripcion?: string;
  ciclo_escolar_id?: number;
  profesor_id?: number;
  estatus?: string;
}

export interface Credencial {
  id: number;
  alumno_id: number;
  numero?: string;
  tipo?: string;
  estatus: string;
  fecha_emision?: string;
  fecha_expiracion?: string;
  created_at?: string;
  updated_at?: string;
  alumno?: Alumno;
}

export interface CredencialCreate {
  alumno_id: number;
  numero?: string;
  tipo?: string;
  estatus?: string;
  fecha_emision?: string;
  fecha_expiracion?: string;
}

export interface RegistroAcceso {
  id: number;
  alumno_id: number;
  credencial_id?: number;
  fecha_hora: string;
  tipo_acceso: string;
  ubicacion?: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  alumno?: Alumno;
  credencial?: Credencial;
}

export interface RegistroAccesoCreate {
  alumno_id: number;
  credencial_id?: number;
  fecha_hora?: string;
  tipo_acceso?: string;
  ubicacion?: string;
  estatus?: string;
}

export interface Retardo {
  id: number;
  alumno_id: number;
  fecha: string;
  hora_llegada: string;
  hora_esperada?: string;
  observaciones?: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  alumno?: Alumno;
}

export interface RetardoCreate {
  alumno_id: number;
  fecha: string;
  hora_llegada: string;
  hora_esperada?: string;
  observaciones?: string;
  estatus?: string;
}

export interface CicloEscolar {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface CicloEscolarCreate {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estatus?: string;
}

export interface Inscripcion {
  id: number;
  alumno_id: number;
  ciclo_escolar_id: number;
  grupo_id?: number;
  fecha_inscripcion: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  alumno?: Alumno;
  ciclo_escolar?: CicloEscolar;
  grupo?: Grupo;
}

export interface InscripcionCreate {
  alumno_id: number;
  ciclo_escolar_id: number;
  grupo_id?: number;
  fecha_inscripcion?: string;
  estatus?: string;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rol_id: number;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
  modulo: string;
  estatus: string;
}

export interface Incidencia {
  id: number;
  alumno_id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  alumno?: Alumno;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rol: string;
}
