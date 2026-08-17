import { jsPDF } from 'jspdf';
import type { Alumno } from '../types';

/**
 * Genera un PDF carta con 4 bloques de datos de credencial, apilados en columna.
 * Si es reposicion, agrega etiqueta "REPOSICION" en cada bloque.
 * Las posiciones se cargan de localStorage ("credentialLayout") o usan defaults.
 */

// Conversion mm a pt: 1mm = 2.835pt
const MM = 2.835;

// Valores fijos de layout
const X_IZQ_BASE = 127.4;
const X_DER = 347.4;
const X_FIRMA = 398.9;
const X_IZQ = X_IZQ_BASE + 8.4 * MM;
const NOMBRE_MAX_W = 55.9 * MM;

// Paso medido en hoja fisica pre-impresa: 65.8 mm entre credenciales.
// Ajustar en decimas de mm si se recalibra con regla fisica.
const BLOCK_HEIGHT_MM = 65.8;
const BLOCK_HEIGHT = BLOCK_HEIGHT_MM * MM; // ≈ 186.54 pt
const FIRST_TOP = 23.0;
const N_BLOQUES = 4;

// Offsets solicitados: bajar izq/der 3.5mm, lado derecho 2mm mas arriba
const DOWN_DATA = 3.5 * MM;         // +3.5mm (hacia abajo) - lado izquierdo
const DOWN_DATA_DER = DOWN_DATA - 2 * MM; // +1.5mm - lado derecho (2mm mas arriba)

// Version del layout - cambiar cuando se modifiquen los defaults para auto-reset
export const LAYOUT_VERSION = 7;

export const DEFAULT_CREDENTIAL_LAYOUT = {
  nombre:       { y: 62.1 - 23.0 + 3 * MM + DOWN_DATA, size: 8, x: 'izq' as const, xOffset: 0 },
  plantel:      { y: 79.7 - 23.0 + 3 * MM + DOWN_DATA, size: 8, x: 'izq' as const, xOffset: 0 },
  no_control:   { y: 98.2 - 23.0 + 3 * MM + DOWN_DATA, size: 8, x: 'izq' as const, xOffset: 0 },
  domicilio1:   { y: 23.0 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  domicilio2:   { y: 33.4 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  domicilio3:   { y: 43.8 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  curp:         { y: 54.3 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  tipo_sangre:  { y: 64.7 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  afiliacion:   { y: 75.1 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  tutor:        { y: 85.5 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  tel_tutor:    { y: 95.9 - 23.0 + 15.6 * MM + DOWN_DATA_DER, size: 7.5, x: 'der' as const, xOffset: 0 },
  firma:        { y: 152.90, size: 7.5, x: 'firma' as const, xOffset: 0, text: 'LIC. FABIAN OCAMPO GODINEZ' },
};

export type CredentialLayout = typeof DEFAULT_CREDENTIAL_LAYOUT;

function getCredentialLayout(): CredentialLayout {
  try {
    const savedVersion = localStorage.getItem('credentialLayoutVersion');
    const saved = localStorage.getItem('credentialLayout');
    if (saved && savedVersion === String(LAYOUT_VERSION)) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CREDENTIAL_LAYOUT, ...parsed };
    }
    // Version mismatch - limpiar y usar defaults nuevos
    localStorage.removeItem('credentialLayout');
    localStorage.removeItem('credentialLayoutVersion');
  } catch { }
  return { ...DEFAULT_CREDENTIAL_LAYOUT };
}

function studentToBlock(s: Alumno, reposicion: boolean, layout: CredentialLayout) {
  const nombreCompleto = `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno}`;
  const domicilio = s.direccion?.toUpperCase() ?? '';
  const domicilioParts = domicilio.split(/,|(?=C\.P\.)/i).map(p => p.trim()).filter(Boolean);

  const overrides = Object.fromEntries(
    Object.entries(layout)
      .filter(([, v]) => (v as { text?: string }).text)
      .map(([k, v]) => [k, (v as { text: string }).text])
  );

  return {
    nombre: reposicion ? `NOMBRE: ${nombreCompleto}  [REPOSICIÓN]` : `NOMBRE: ${nombreCompleto}`,
    plantel: overrides.plantel ?? 'PLANTEL 27 MIAHUATLAN',
    no_control: `NO. DE CONTROL: ${s.matricula}`,
    domicilio1: `DOMICILIO: ${domicilioParts[0] ?? ''}`,
    domicilio2: domicilioParts[1] ?? '',
    domicilio3: domicilioParts[2] ?? '',
    curp: `CURP: ${s.curp ?? ''}`,
    tipo_sangre: `TIPO DE SANGRE: ${s.tipo_sangre ?? ''}`,
    afiliacion: `NÚMERO DE AFILIACIÓN: ${s.nss ?? ''}`,
    tutor: `TUTOR: ${s.tutor_nombre ?? ''}`,
    tel_tutor: `TELÉFONO: ${s.tutor_telefono ?? s.telefono ?? ''}`,
    firma: overrides.firma ?? 'LIC. FABIAN OCAMPO GODINEZ',
  };
}

function drawBlock(doc: jsPDF, data: Record<string, string>, topBlock: number, layout: CredentialLayout) {
  const keys = Object.keys(layout) as (keyof CredentialLayout)[];

  for (const key of keys) {
    const campo = layout[key];
    const texto = data[key] ?? '';
    if (!texto) continue;

    const yPdf = topBlock + campo.y + campo.size;
    const xOff = campo.xOffset ?? 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(campo.size);

    if (key === 'nombre') {
      const lines = doc.splitTextToSize(texto, NOMBRE_MAX_W);
      const lineHeight = campo.size * 1.15;
      lines.forEach((line: string, idx: number) => {
        doc.text(line, X_IZQ + xOff, yPdf + idx * lineHeight);
      });
    } else if (campo.x === 'izq') {
      doc.text(texto, X_IZQ + xOff, yPdf);
    } else if (campo.x === 'der') {
      doc.text(texto, X_DER + xOff, yPdf);
    } else {
      doc.text(texto, X_FIRMA + xOff, yPdf);
    }
  }
}

export interface GeneratePDFOptions {
  students: Alumno[];
  groupName: string;
  reposicion?: boolean;
}

export function generateCredentialsPDF(options: GeneratePDFOptions) {
  const { students: alumnos, groupName, reposicion = false } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const layout = getCredentialLayout();

  const chunks: Alumno[][] = [];
  for (let i = 0; i < alumnos.length; i += N_BLOQUES) {
    chunks.push(alumnos.slice(i, i + N_BLOQUES));
  }

  chunks.forEach((chunk, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage('letter', 'portrait');
    }

    for (let i = 0; i < N_BLOQUES; i++) {
      const topBlock = FIRST_TOP + i * BLOCK_HEIGHT;
      const student = chunk[i];

      if (student) {
        const data = studentToBlock(student, reposicion, layout);
        drawBlock(doc, data as Record<string, string>, topBlock, layout);
      }
    }
  });

  // Nombre del archivo segun grupo
  const nombreArchivo = reposicion
    ? `reposicion_${groupName.toLowerCase().replace(/\s+/g, '_')}.pdf`
    : `credenciales_${groupName.toLowerCase().replace(/\s+/g, '_')}.pdf`;

  doc.save(nombreArchivo);
}
