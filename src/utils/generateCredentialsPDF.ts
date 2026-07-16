import { jsPDF } from 'jspdf';
import type { Student } from '../data/mockData';

/**
 * Genera un PDF carta con 4 bloques de datos de credencial, apilados en columna.
 * Si es reposicion, agrega etiqueta "REPOSICION" en cada bloque.
 * Las posiciones se cargan de localStorage ("credentialLayout") o usan defaults.
 */

// Conversion mm a pt: 1mm = 2.835pt
const MM = 2.835;

// Defaults de layout de credenciales (se pueden overridear desde Config)
export const DEFAULT_CREDENTIAL_LAYOUT = {
  // Posiciones Y de cada campo (offset desde top del bloque, en pt)
  nombre:       { y: 62.1 - 23.0 + 3 * MM, size: 8, x: 'izq' as const },
  plantel:      { y: 79.7 - 23.0 + 3 * MM, size: 8, x: 'izq' as const },
  no_control:   { y: 98.2 - 23.0 + 3 * MM, size: 8, x: 'izq' as const },
  domicilio1:   { y: 23.0 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  domicilio2:   { y: 33.4 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  domicilio3:   { y: 43.8 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  curp:         { y: 54.3 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  tipo_sangre:  { y: 64.7 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  afiliacion:   { y: 75.1 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  tutor:        { y: 85.5 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  tel_tutor:    { y: 95.9 - 23.0 + 15.6 * MM, size: 7.5, x: 'der' as const },
  firma:        { y: 127.2 - 23.0, size: 7.5, x: 'firma' as const },
};

export type CredentialLayout = typeof DEFAULT_CREDENTIAL_LAYOUT;

// Valores fijos de layout
const X_IZQ_BASE = 127.4;
const X_DER = 347.4;
const X_FIRMA = 398.9;
const X_IZQ = X_IZQ_BASE + 8.4 * MM;
const NOMBRE_MAX_W = 55.9 * MM;

const BLOCK_HEIGHT = 182.1;
const FIRST_TOP = 23.0;
const N_BLOQUES = 4;

function getCredentialLayout(): CredentialLayout {
  try {
    const saved = localStorage.getItem('credentialLayout');
    if (saved) return { ...DEFAULT_CREDENTIAL_LAYOUT, ...JSON.parse(saved) };
  } catch { }
  return { ...DEFAULT_CREDENTIAL_LAYOUT };
}

function studentToBlock(s: Student, reposicion: boolean) {
  const domicilio = s.domicilio?.toUpperCase() ?? '';
  const domicilioParts = domicilio.split(/,|(?=C\.P\.)/i).map(p => p.trim()).filter(Boolean);

  return {
    nombre: reposicion ? `NOMBRE: ${s.nombre}  [REPOSICION]` : `NOMBRE: ${s.nombre}`,
    plantel: 'PLANTEL 27 MIAHUATLAN',
    no_control: `NO. DE CONTROL: ${s.numControl}`,
    domicilio1: `DOMICILIO: ${domicilioParts[0] ?? ''}`,
    domicilio2: domicilioParts[1] ?? '',
    domicilio3: domicilioParts[2] ?? '',
    curp: `CURP: ${s.curp}`,
    tipo_sangre: `TIPO DE SANGRE: ${s.tipoSangre}`,
    afiliacion: `NUMERO DE AFILIACION: ${s.numAfiliacion}`,
    tutor: `TUTOR: ${s.tutor?.toUpperCase() ?? ''}`,
    tel_tutor: `TELEFONO TUTOR: ${s.telefonoTutor ?? ''}`,
    firma: 'LIC. FABIAN OCAMPO GODINEZ',
  };
}

function drawBlock(doc: jsPDF, data: Record<string, string>, topBlock: number, layout: CredentialLayout) {
  const keys = Object.keys(layout) as (keyof CredentialLayout)[];

  for (const key of keys) {
    const campo = layout[key];
    const texto = data[key] ?? '';
    if (!texto) continue;

    const yPdf = topBlock + campo.y + campo.size;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(campo.size);

    if (key === 'nombre') {
      const lines = doc.splitTextToSize(texto, NOMBRE_MAX_W);
      doc.text(lines, X_IZQ, yPdf);
    } else if (campo.x === 'izq') {
      doc.text(texto, X_IZQ, yPdf);
    } else if (campo.x === 'der') {
      doc.text(texto, X_DER, yPdf);
    } else {
      doc.text(texto, X_FIRMA, yPdf);
    }
  }
}

export interface GeneratePDFOptions {
  students: Student[];
  groupName: string;
  reposicion?: boolean;
}

export function generateCredentialsPDF(options: GeneratePDFOptions) {
  const { students, groupName, reposicion = false } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const layout = getCredentialLayout();

  const chunks: Student[][] = [];
  for (let i = 0; i < students.length; i += N_BLOQUES) {
    chunks.push(students.slice(i, i + N_BLOQUES));
  }

  chunks.forEach((chunk, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage('letter', 'portrait');
    }

    for (let i = 0; i < N_BLOQUES; i++) {
      const topBlock = FIRST_TOP + i * BLOCK_HEIGHT;
      const student = chunk[i];

      if (student) {
        const data = studentToBlock(student, reposicion);
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
