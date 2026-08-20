import { jsPDF } from 'jspdf';
import type { Alumno } from '../types';

interface GenerateListOptions {
  students: Alumno[];
  groupName: string;
  gruposMap: Record<number, string>;
}

export function generateStudentListPDF(options: GenerateListOptions) {
  const { students: alumnos, groupName, gruposMap } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 60;
  const rowH = 22;
  const headerH = 28;

  const columns = [
    { label: '#', x: marginX, w: 30 },
    { label: 'Nombre', x: marginX + 30, w: 200 },
    { label: 'No. Control', x: marginX + 230, w: 90 },
    { label: 'Grupo', x: marginX + 320, w: 60 },
    { label: 'Estado', x: marginX + 380, w: 60 },
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
  doc.text(`${labelGrupo}  |  Total: ${alumnos.length} alumnos  |  Fecha: ${new Date().toLocaleDateString('es-MX')}`, marginX, 46);

  currentY = marginTop;
  drawHeader();

  // Filas
  alumnos.forEach((s, idx) => {
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
      `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno}`,
      s.matricula,
      s.id_grupo ? (gruposMap[s.id_grupo] || String(s.id_grupo)) : 'S/I',
      s.estatus === 'Activo' ? 'Activo' : 'De baja',
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

  const fileName = groupName === 'general'
    ? 'lista_alumnos_general.pdf'
    : `lista_grupo_${groupName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
