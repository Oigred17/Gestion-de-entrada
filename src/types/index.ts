export interface Alumno {
  id: number;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono?: string;
  direccion?: string;
  estatus: string;
  created_at?: string;
  updated_at?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  capacitacion?: string;
  turno?: string;
  cohorte?: string;
  fecha_nacimiento?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  id_grupo?: number;
}

export interface AlumnoCreate {
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono?: string;
  direccion?: string;
  estatus?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  capacitacion?: string;
  turno?: string;
  cohorte?: string;
  fecha_nacimiento?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  id_grupo?: number;
}

export interface AlumnoUpdate {
  matricula?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  telefono?: string;
  direccion?: string;
  estatus?: string;
  curp?: string;
  nss?: string;
  tipo_sangre?: string;
  capacitacion?: string;
  turno?: string;
  cohorte?: string;
  fecha_nacimiento?: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  id_grupo?: number;
}

export interface Profesor {
  id: number;
  num_nomina: number;
  nombre_completo: string;
  telefono?: string;
  domicilio?: string;
  activo: boolean;
  fecha_registro?: string;
}

export interface ProfesorCreate {
  num_nomina: number;
  nombre_completo: string;
  telefono?: string;
  domicilio?: string;
  estatus?: string;
}

export interface Grupo {
  id: number;
  nombre: string;
  clave_grupo?: number;
  descripcion?: string;
  ciclo_escolar_id?: number;
  profesor_id?: number;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

export interface GrupoCreate {
  nombre: string;
  clave_grupo?: number;
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
  codigo_autorizacion?: string;
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

export interface Justificacion {
  id: number;
  id_alumno?: number;
  id_grupo?: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  id_usuario_registro: number;
  fecha_registro?: string;
  alumno?: Alumno;
}

export interface JustificacionCreate {
  id_alumno?: number;
  id_grupo?: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  id_usuario_registro: number;
}

export interface Reposicion {
  id: number;
  id_alumno: number;
  id_credencial?: number;
  motivo: string;
  fecha_solicitud: string;
  fecha_entrega?: string;
  id_usuario_registro?: number;
  fecha_registro?: string;
  alumno?: Alumno;
}

export interface ReposicionCreate {
  id_alumno: number;
  id_credencial?: number;
  motivo: string;
  fecha_solicitud?: string;
  fecha_entrega?: string;
  id_usuario_registro?: number;
}

export interface ReporteProgramado {
  id: number;
  nombre: string;
  frecuencia: string;
  ultima_generacion?: string;
  proxima_generacion?: string;
  destinatarios?: string;
  activo: boolean;
  fecha_registro?: string;
}

export interface ReporteProgramadoCreate {
  nombre: string;
  frecuencia: string;
  ultima_generacion?: string;
  proxima_generacion?: string;
  destinatarios?: string;
  activo?: boolean;
}

export interface Reporte {
  id: number;
  id_alumno: number;
  id_prefecto: number;
  motivo: string;
  sancion: string;
  fecha: string;
  fecha_registro?: string;
  alumno?: Alumno;
  prefecto?: { id: number; username: string; nombre_completo: string };
}

export interface ReporteCreate {
  id_alumno: number;
  id_prefecto: number;
  motivo: string;
  sancion: string;
  fecha?: string;
}

export interface FaltaAsistencia {
  id: number;
  id_alumno: number;
  fecha: string;
  tipo: 'FALTANTE' | 'SIN_SALIDA';
  motivo?: string;
  fecha_registro?: string;
  alumno?: Alumno;
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

export interface PermisoAlumno {
  id: number;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  tutor_nombre?: string;
  tutor_telefono?: string;
  grupo?: string;
}

export interface Permiso {
  id: number;
  id_alumno: number;
  motivo: string;
  fecha_salida?: string;
  fecha_solicitud?: string;
  estado: string;
  codigo_autorizacion?: string;
  notificar_tutor: boolean;
  id_usuario_registro: number;
  fecha_registro?: string;
  alumno?: PermisoAlumno;
}

export interface PermisoCreate {
  id_alumno: number;
  motivo: string;
  fecha_salida?: string;
  notificar_tutor?: boolean;
  id_usuario_registro: number;
}

export interface Incidencia {
  id: number;
  id_alumno: number;
  tipo: string;
  descripcion: string;
  estado: string;
  notificar: boolean;
  evidencia_base64?: string;
  id_usuario_registro: number;
  fecha_registro?: string;
  fecha_resolucion?: string;
  alumno?: PermisoAlumno;
}

export interface IncidenciaCreate {
  id_alumno: number;
  tipo: string;
  descripcion: string;
  notificar?: boolean;
  evidencia_base64?: string;
  id_usuario_registro: number;
}

export interface Horario {
  id: number;
  descripcion: string;
  hora_entrada: string;
  hora_salida: string;
  dias?: string;
  activo: boolean;
}

export interface Configuracion {
  plantel: {
    plantel_nombre: string;
    telefono: string;
    direccion: string;
    correo: string;
    logo_base64?: string;
    hora_entrada: string;
    hora_salida: string;
    dias_habiles?: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_from: string;
    notif_email: boolean;
  };
  horarios: Horario[];
  asistencia: {
    hora_entrada_limite: string;
    minutos_tolerancia: number;
    segundos_antirebote: number;
  };
}

export interface ConfiguracionUpdate {
  plantel_nombre?: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
  logo_base64?: string;
  hora_entrada?: string;
  hora_salida?: string;
  dias_habiles?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
  notif_email?: boolean;
  hora_entrada_limite?: string;
  minutos_tolerancia?: number;
  segundos_antirebote?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RecoveryResponse {
  status: string;
  email?: string;
  message?: string;
}

export interface ResetPasswordRequest {
  username: string;
  code: string;
  new_password: string;
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
