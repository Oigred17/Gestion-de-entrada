export type FieldErrors = Record<string, string>;

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function required(value: unknown, label: string): string {
  if (value == null) return `${label} es obligatorio`;
  if (typeof value === 'string' && !value.trim()) return `${label} es obligatorio`;
  return '';
}

export function minLength(value: string, min: number, label: string): string {
  if (!value.trim()) return '';
  if (value.trim().length < min) return `${label} debe tener al menos ${min} caracteres`;
  return '';
}

export function fullName(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return 'Ingresa nombre y al menos un apellido';
  return '';
}

export function email(value: string, label = 'Correo'): string {
  if (!value.trim()) return '';
  if (!EMAIL_RE.test(value.trim())) return `${label} no es válido`;
  return '';
}

export function emailsList(value: string): string {
  if (!value.trim()) return '';
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = parts.find((p) => !EMAIL_RE.test(p));
  return bad ? `Correo no válido: ${bad}` : '';
}

export function phoneMx(value: string): string {
  if (!value.trim()) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) return 'El teléfono debe tener 10 dígitos';
  return '';
}

export function curp(value: string): string {
  if (!value.trim()) return '';
  const v = value.trim().toUpperCase();
  if (v.length !== 18) return 'La CURP debe tener 18 caracteres';
  if (!CURP_RE.test(v)) return 'La CURP no tiene un formato válido';
  return '';
}

export function nss(value: string): string {
  if (!value.trim()) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5 || digits.length > 11) return 'El número de afiliación debe tener entre 5 y 11 dígitos';
  return '';
}

export function matricula(value: string): string {
  if (!value.trim()) return 'El número de control es obligatorio';
  if (!/^[A-Za-z0-9-]{4,20}$/.test(value.trim())) {
    return 'El número de control debe tener entre 4 y 20 caracteres (letras, números o guion)';
  }
  return '';
}

export function bloodType(value: string): string {
  if (!value.trim()) return '';
  const v = value.trim().toUpperCase().replace(/^0/, 'O');
  if (!(BLOOD_TYPES as readonly string[]).includes(v)) return 'Tipo de sangre no válido (ej. O+, A-)';
  return '';
}

export function dateValue(value: string): string {
  if (!value.trim()) return '';
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? 'Fecha no válida' : '';
  }
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? 'Fecha no válida' : '';
  }
  return 'Usa el formato AAAA-MM-DD o DD/MM/AAAA';
}

export function positiveInt(value: string, label: string): string {
  if (!value.trim()) return `${label} es obligatorio`;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return `${label} debe ser un número entero positivo`;
  return '';
}

export function port(value: string): string {
  if (!value.trim()) return '';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return 'El puerto debe estar entre 1 y 65535';
  return '';
}

export function passwordMin(value: string, min = 4): string {
  if (value.length < min) return `La contraseña debe tener al menos ${min} caracteres`;
  return '';
}

export function codigoPermiso(value: string): string {
  if (!value.trim()) return '';
  if (!/^[A-Z0-9]{4,12}$/i.test(value.trim())) {
    return 'El código debe tener entre 4 y 12 caracteres alfanuméricos';
  }
  return '';
}

export function imageFile(file: File, maxMb = 5): string {
  if (!file.type.startsWith('image/')) return 'Solo se permiten imágenes (JPG, PNG)';
  if (file.size > maxMb * 1024 * 1024) return `La imagen no debe superar ${maxMb}MB`;
  return '';
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function validateAlumnoFields(data: {
  nombre: string;
  matricula: string;
  grupo?: string;
  grupoRequired?: boolean;
  curp?: string;
  telefono?: string;
  nss?: string;
  tipoSangre?: string;
  fechaNacimiento?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const nombreErr = required(data.nombre, 'Nombre') || fullName(data.nombre);
  const matriculaErr = matricula(data.matricula);
  if (nombreErr) errors.nombre = nombreErr;
  if (matriculaErr) errors.matricula = matriculaErr;
  if (data.grupoRequired) {
    const grupoErr = required(data.grupo, 'Grupo');
    if (grupoErr) errors.grupo = grupoErr;
  }
  const curpErr = curp(data.curp ?? '');
  const telErr = phoneMx(data.telefono ?? '');
  const nssErr = nss(data.nss ?? '');
  const sangreErr = bloodType(data.tipoSangre ?? '');
  const fechaErr = dateValue(data.fechaNacimiento ?? '');
  if (curpErr) errors.curp = curpErr;
  if (telErr) errors.telefono = telErr;
  if (nssErr) errors.nss = nssErr;
  if (sangreErr) errors.tipoSangre = sangreErr;
  if (fechaErr) errors.fechaNacimiento = fechaErr;
  return errors;
}
