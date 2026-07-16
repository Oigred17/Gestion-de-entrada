import { jsPDF } from 'jspdf';
import type { Student } from '../data/mockData';

/**
 * Genera un PDF con la lista de alumnos (nomina/roster).
 * Incline: #, Nombre, No. Control, Grupo, Turno, Estado.
 * Nombre del archivo: lista_grupo_X.pdf o lista_alumnos_general.pdf
 */

interface GenerateListOptions {
  students: Student[];
  groupName: string;
}

export function generateStudentListPDF(options: GenerateListOptions) {
  const { students, groupName } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 60;
  const rowH = 22;
  const headerH = 28;

  const columns = [
    { label: '#', x: marginX, w: 30 },
    { label: 'Nombre', x: marginX + 30, w: 170 },
    { label: 'No. Control', x: marginX + 200, w: 90 },
    { label: 'Grupo', x: marginX + 290, w: 45 },
    { label: 'Turno', x: marginX + 335, w: 55 },
    { label: 'Capacitacion', x: marginX + 390, w: 100 },
    { label: 'Estado', x: marginX + 490, w: 50 },
  ];

  let currentY = marginTop;

  const drawHeader = () => {
    doc.setFillColor(235, 36, 102);
    doc.rect(marginX, currentY, pageW - marginX * 2, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    columns.forEach((col) => {
      doc.text(col.label, col.x + 4, currentY + 18);
    });
    currentY += headerH;
  };

  // Titulo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 24, 25);
  doc.text('COBAO Plantel 27 - Lista de Alumnos', marginX, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(95, 86, 87);
  const labelGrupo = groupName === 'general' ? 'Todos los grupos' : `Grupo ${groupName}`;
  doc.text(`${labelGrupo}  |  Total: ${students.length} alumnos  |  Fecha: ${new Date().toLocaleDateString('es-MX')}`, marginX, 46);

  currentY = marginTop;
  drawHeader();

  // Filas
  students.forEach((s, idx) => {
    if (currentY + rowH > pageH - 40) {
      doc.addPage('letter', 'portrait');
      currentY = marginTop;
      drawHeader();
    }

    // Fondo alternado
    if (idx % 2 === 0) {
      doc.setFillColor(245, 244, 244);
      doc.rect(marginX, currentY, pageW - marginX * 2, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(28, 24, 25);

    const rowData = [
      String(idx + 1),
      s.nombre,
      s.numControl,
      s.grupo,
      s.turno,
      s.capacitacion,
      s.estado,
    ];

    columns.forEach((col, i) => {
      const text = rowData[i] ?? '';
      const maxW = col.w - 8;
      const lines = doc.splitTextToSize(text, maxW);
      doc.text(lines[0] ?? '', col.x + 4, currentY + 15);
    });

    currentY += rowH;
  });

  // Pie de pagina
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 150, 150);
  doc.text(
    `Documento generado automaticamente por el Sistema NFC - COBAO Plantel 27`,
    marginX,
    pageH - 20
  );

  const fileName = `lista_${groupName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
