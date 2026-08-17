import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Mail,
  Search,
  Play,
  Edit,
  Trash2,
  ChevronDown,
  User,
  Users,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import { alumnosApi, registrosApi, retardosApi, gruposApi, reportesProgramadosApi, incidenciasApi, reportesApi } from '../api';
import type { Alumno, RegistroAcceso, Retardo, Grupo, ReporteProgramado, Incidencia, Reporte } from '../types';
import Loader from '../components/Loader';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';
import DateRangePicker from '../components/DateRangePicker';
import { toastSuccess, toastError } from '../lib/toast';
import { jsPDF } from 'jspdf';

const COLORS = {
  primary: '#EB2466',
  primaryDark: '#AB1748',
  success: '#0F8122',
  info: '#1792AB',
  bg: '#F0EFEF',
  white: '#FFFFFF',
  border: '#CAC6C7',
  text: '#1C1819',
  textSec: '#5F5657',
  textMuted: '#85787A',
  lightPink: '#FEEBEE',
  lightGreen: '#E8F5E9',
} as const;

const reportTypes = [
  { id: 'gestion', label: 'Gestión de entrada' },
  { id: 'incidencias', label: 'Incidencias' },
  { id: 'faltas', label: 'Faltas al reglamento' },
];

const getNombreCompleto = (a: Alumno): string =>
  `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`;

export default function ReportsPage() {
  const [alumnosData, setAlumnosData] = useState<Alumno[]>([]);
  const [registrosData, setRegistrosData] = useState<RegistroAcceso[]>([]);
  const [retardosData, setRetardosData] = useState<Retardo[]>([]);
  const [gruposData, setGruposData] = useState<Grupo[]>([]);
  const [incidenciasData, setIncidenciasData] = useState<Incidencia[]>([]);
  const [reportesData, setReportesData] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState('gestion');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [reportMode, setReportMode] = useState<'individual' | 'grupo'>('individual');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scheduledReports, setScheduledReports] = useState<ReporteProgramado[]>([]);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendByEmail, setSendByEmail] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const [showProgramadoModal, setShowProgramadoModal] = useState(false);
  const [editProgramado, setEditProgramado] = useState<ReporteProgramado | null>(null);
  const [progNombre, setProgNombre] = useState('');
  const [progFrecuencia, setProgFrecuencia] = useState('Diaria');
  const [progDestinatarios, setProgDestinatarios] = useState('');
  const [progActivo, setProgActivo] = useState(true);
  const [savingProgramado, setSavingProgramado] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null);

  const alumnoMap = Object.fromEntries(alumnosData.map(a => [a.id, a]));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alumnosRes, registrosRes, retardosRes, gruposRes, reportesProgRes, incidenciasRes, reportesRes] = await Promise.all([
          alumnosApi.getAll(),
          registrosApi.getAll(),
          retardosApi.getAll(),
          gruposApi.getAll(),
          reportesProgramadosApi.getAll(),
          incidenciasApi.getAll(),
          reportesApi.getAll(),
        ]);
        setAlumnosData(alumnosRes);
        setRegistrosData(registrosRes);
        setRetardosData(retardosRes);
        setGruposData(gruposRes);
        setScheduledReports(reportesProgRes);
        setIncidenciasData(incidenciasRes);
        setReportesData(reportesRes);
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGrupoNombre = (grupoId?: number): string => {
    if (!grupoId) return 'Sin grupo';
    return gruposData.find(g => g.id === grupoId)?.nombre ?? 'Sin grupo';
  };

  const allGroups = ['Todos', ...Array.from(new Set(gruposData.map(g => g.nombre)))];

  const filteredStudents = alumnosData.filter(s =>
    getNombreCompleto(s).toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.matricula.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const selectedStudent = alumnosData.find(s => s.id === selectedStudentId) ?? null;

  const filterByStudent = (alumnoId: number): boolean => {
    if (reportMode === 'individual' && selectedStudentId !== null) {
      return alumnoId === selectedStudentId;
    }
    if (reportMode === 'grupo' && selectedGroup !== 'Todos') {
      const alumno = alumnosData.find(a => a.id === alumnoId);
      if (alumno && getGrupoNombre(alumno.id_grupo) !== selectedGroup) return false;
    }
    return true;
  };

  const filterByDate = (fechaHora: string): boolean => {
    const datePart = fechaHora.slice(0, 10);
    if (startDate && datePart < startDate) return false;
    if (endDate && datePart > endDate) return false;
    return true;
  };

  const filteredRecords: { id: number; fechaHora: string; tipo: string }[] = [
    ...registrosData
      .filter(r => {
        const alumno = r.alumno || alumnoMap[r.alumno_id];
        return alumno && filterByStudent(alumno.id) && filterByDate(r.fecha_hora);
      })
      .map(r => ({ id: r.id, fechaHora: r.fecha_hora, tipo: r.tipo_acceso })),
    ...retardosData
      .filter(r => {
        return r.alumno && filterByStudent(r.alumno.id) && filterByDate(r.fecha);
      })
      .map(r => ({ id: r.id, fechaHora: r.fecha, tipo: 'retardo' })),
  ];

  const filteredIncidencias = incidenciasData.filter(i =>
    filterByStudent(i.id_alumno) && filterByDate(i.fecha_registro ?? '')
  );

  const filteredReportes = reportesData.filter(r =>
    filterByStudent(r.id_alumno) && filterByDate(r.fecha ?? '')
  );

  const studentStats = reportMode === 'individual' && selectedStudent ? (() => {
    const base = {
      nombre: getNombreCompleto(selectedStudent),
      grupo: getGrupoNombre(selectedStudent.id_grupo),
    };
    if (reportType === 'gestion') {
      return {
        ...base,
        stats: [
          { label: 'Total', value: filteredRecords.length, bg: COLORS.bg, color: COLORS.text },
          { label: 'Entradas', value: filteredRecords.filter(r => r.tipo === 'ENTRADA').length, bg: COLORS.lightGreen, color: COLORS.success },
          { label: 'Fuera de horario', value: filteredRecords.filter(r => r.tipo === 'retardo').length, bg: COLORS.lightPink, color: COLORS.primary },
          { label: 'Salidas', value: filteredRecords.filter(r => r.tipo === 'SALIDA').length, bg: COLORS.bg, color: COLORS.textSec },
        ],
      };
    }
    if (reportType === 'incidencias') {
      return {
        ...base,
        stats: [
          { label: 'Total', value: filteredIncidencias.length, bg: COLORS.bg, color: COLORS.text },
          { label: 'Abiertas', value: filteredIncidencias.filter(i => i.estado === 'Abierto').length, bg: COLORS.lightPink, color: COLORS.primary },
          { label: 'En revisión', value: filteredIncidencias.filter(i => i.estado === 'En revision').length, bg: COLORS.lightPink, color: COLORS.primaryDark },
          { label: 'Resueltas', value: filteredIncidencias.filter(i => i.estado === 'Resuelto').length, bg: COLORS.lightGreen, color: COLORS.success },
        ],
      };
    }
    return {
      ...base,
      stats: [
        { label: 'Total', value: filteredReportes.length, bg: COLORS.bg, color: COLORS.text },
        { label: 'Pendientes', value: filteredReportes.filter(r => !r.sancion_cumplida).length, bg: COLORS.lightPink, color: COLORS.primary },
        { label: 'Cumplidas', value: filteredReportes.filter(r => r.sancion_cumplida).length, bg: COLORS.lightGreen, color: COLORS.success },
      ],
    };
  })() : null;

  type GroupStat = {
    group: string;
    entradas?: number;
    retardos?: number;
    salidas?: number;
    incidencias?: number;
    faltas?: number;
    pendientes?: number;
    cumplidas?: number;
  };

  const groupStats: GroupStat[] = allGroups.filter(g => g !== 'Todos' && (selectedGroup === 'Todos' || g === selectedGroup)).map(group => {
    const enGrupo = (alumnoId: number): boolean => {
      const alumno = alumnosData.find(a => a.id === alumnoId);
      return !!alumno && getGrupoNombre(alumno.id_grupo) === group;
    };
    if (reportType === 'incidencias') {
      return { group, incidencias: filteredIncidencias.filter(i => enGrupo(i.id_alumno)).length };
    }
    if (reportType === 'faltas') {
      const faltas = filteredReportes.filter(r => enGrupo(r.id_alumno));
      return {
        group,
        faltas: faltas.length,
        pendientes: faltas.filter(r => !r.sancion_cumplida).length,
        cumplidas: faltas.filter(r => r.sancion_cumplida).length,
      };
    }
    const asistencias = registrosData.filter(r => {
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return alumno && getGrupoNombre(alumno.id_grupo) === group && r.tipo_acceso === 'ENTRADA' && filterByDate(r.fecha_hora);
    }).length;
    const retardosCount = retardosData.filter(r => {
      return r.alumno && getGrupoNombre(r.alumno.id_grupo) === group && filterByDate(r.fecha);
    }).length;
    const salidas = registrosData.filter(r => {
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return alumno && getGrupoNombre(alumno.id_grupo) === group && r.tipo_acceso === 'SALIDA' && filterByDate(r.fecha_hora);
    }).length;
    return { group, entradas: asistencias, retardos: retardosCount, salidas };
  });

  const maxBarValue = Math.max(1, ...groupStats.map(d => Math.max(d.entradas ?? 0, d.retardos ?? 0, d.salidas ?? 0)));

  const itemsPerPage = 5;
  const totalPages = Math.ceil(scheduledReports.length / itemsPerPage);
  const paginatedReports = scheduledReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleGenerate = () => {
    if (reportMode === 'individual' && selectedStudentId === null) return;
    setReportGenerated(true);
  };

  const handleToggleActive = (id: number) => {
    const report = scheduledReports.find(r => r.id === id);
    if (!report) return;
    reportesProgramadosApi.update(id, { activo: !report.activo })
      .then(updated => {
        setScheduledReports(prev => prev.map(r => (r.id === id ? updated : r)));
        toastSuccess(updated.activo ? 'Reporte activado.' : 'Reporte desactivado.');
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        toastError(typeof detail === 'string' ? detail : 'No se pudo actualizar el reporte.');
      });
  };

  const handleDelete = (id: number) => {
    const report = scheduledReports.find(r => r.id === id);
    setConfirmDelete({
      title: 'Eliminar reporte programado',
      message: `¿Seguro que deseas eliminar el reporte programado "${report?.nombre ?? id}"? Esta acción no se puede deshacer. Ingrese su contraseña para confirmar.`,
      run: () => reportesProgramadosApi.delete(id)
        .then(() => {
          setScheduledReports(prev => prev.filter(r => r.id !== id));
          setCurrentPage(1);
          toastSuccess('Reporte eliminado.');
        })
        .catch((err) => {
          const detail = err?.response?.data?.detail;
          toastError(typeof detail === 'string' ? detail : 'No se pudo eliminar el reporte.');
        }),
    });
  };

  const handleRunNow = async (id: number) => {
    setExecutingId(id);
    try {
      const result = await reportesProgramadosApi.ejecutar(id);
      setScheduledReports(prev => prev.map(r => r.id === id
        ? { ...r, ultima_generacion: result.ultima_generacion, proxima_generacion: result.proxima_generacion }
        : r));
      toastSuccess(result.mensaje || `Reporte generado con ${result.lineas ?? 0} lineas.`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo ejecutar el reporte.');
    } finally {
      setExecutingId(null);
    }
  };

  const openCreateProgramado = () => {
    setEditProgramado(null);
    setProgNombre('');
    setProgFrecuencia('Diaria');
    setProgDestinatarios('');
    setProgActivo(true);
    setShowProgramadoModal(true);
  };

  const openEditProgramado = (r: ReporteProgramado) => {
    setEditProgramado(r);
    setProgNombre(r.nombre);
    setProgFrecuencia(r.frecuencia);
    setProgDestinatarios(r.destinatarios ?? '');
    setProgActivo(r.activo);
    setShowProgramadoModal(true);
  };

  const handleSaveProgramado = async () => {
    if (!progNombre.trim()) {
      toastError('El nombre del reporte es obligatorio.');
      return;
    }
    setSavingProgramado(true);
    const payload = {
      nombre: progNombre.trim(),
      frecuencia: progFrecuencia,
      destinatarios: progDestinatarios.trim() || undefined,
      activo: progActivo,
    };
    try {
      if (editProgramado) {
        const updated = await reportesProgramadosApi.update(editProgramado.id, payload);
        setScheduledReports(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        toastSuccess('Reporte actualizado correctamente.');
      } else {
        const created = await reportesProgramadosApi.create(payload);
        setScheduledReports(prev => [...prev, created]);
        toastSuccess('Reporte programado creado.');
      }
      setShowProgramadoModal(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo guardar el reporte.');
    } finally {
      setSavingProgramado(false);
    }
  };

  const reporteTitulo = reportMode === 'individual'
    ? `Reporte de ${selectedStudent ? getNombreCompleto(selectedStudent) : ''}`
    : `Reporte del grupo ${selectedGroup}`;

  const buildCSV = () => {
    if (reportType === 'incidencias') {
      const header = reportMode === 'individual'
        ? 'Fecha,Tipo,Descripción,Estado\n'
        : 'Grupo,Incidencias\n';
      const rows = reportMode === 'individual'
        ? filteredIncidencias.map(i =>
            `${(i.fecha_registro ?? '').slice(0, 10)},${i.tipo},${i.descripcion.replace(/,/g, ';')},${i.estado}`).join('\n')
        : groupStats.map(g => `${g.group},${g.incidencias ?? 0}`).join('\n');
      return header + rows;
    }
    if (reportType === 'faltas') {
      const header = reportMode === 'individual'
        ? 'Fecha,Motivo,Sanción,Estado\n'
        : 'Grupo,Faltas,Pendientes,Cumplidas\n';
      const rows = reportMode === 'individual'
        ? filteredReportes.map(r =>
            `${(r.fecha ?? '').slice(0, 10)},${r.motivo.replace(/,/g, ';')},${r.sancion.replace(/,/g, ';')},${r.sancion_cumplida ? 'Cumplida' : 'Pendiente'}`).join('\n')
        : groupStats.map(g => `${g.group},${g.faltas ?? 0},${g.pendientes ?? 0},${g.cumplidas ?? 0}`).join('\n');
      return header + rows;
    }
    const header = reportMode === 'individual'
      ? 'Fecha,Hora,Tipo\n'
      : 'Grupo,Entradas,Retardos,Salidas,Total\n';
    const rows = reportMode === 'individual'
      ? filteredRecords.map(r => {
          const [fecha, hora] = r.fechaHora.split('T');
          return `${fecha},${hora?.slice(0, 5) ?? ''},${r.tipo}`;
        }).join('\n')
      : groupStats.map(g => `${g.group},${g.entradas ?? 0},${g.retardos ?? 0},${g.salidas ?? 0},${(g.entradas ?? 0) + (g.retardos ?? 0) + (g.salidas ?? 0)}`).join('\n');
    return header + rows;
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const filename = `reporte_${reportType}_${startDate || 'inicio'}_${endDate || 'hoy'}.csv`;
    downloadBlob(buildCSV(), filename, 'text/csv;charset=utf-8;');
    toastSuccess('Reporte CSV descargado.');
  };

  const buildExcelHtml = () => {
    const cells = (vals: (string | number)[]) => `<tr>${vals.map(v => `<td>${String(v)}</td>`).join('')}</tr>`;
    const head = (cols: string[]) => `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    if (reportType === 'incidencias') {
      const body = reportMode === 'individual'
        ? filteredIncidencias.map(i => cells([(i.fecha_registro ?? '').slice(0, 10), i.tipo, i.descripcion, i.estado])).join('')
        : groupStats.map(g => cells([g.group, g.incidencias ?? 0])).join('');
      const cols = reportMode === 'individual' ? ['Fecha', 'Tipo', 'Descripción', 'Estado'] : ['Grupo', 'Incidencias'];
      return head(cols) + body;
    }
    if (reportType === 'faltas') {
      const body = reportMode === 'individual'
        ? filteredReportes.map(r => cells([(r.fecha ?? '').slice(0, 10), r.motivo, r.sancion, r.sancion_cumplida ? 'Cumplida' : 'Pendiente'])).join('')
        : groupStats.map(g => cells([g.group, g.faltas ?? 0, g.pendientes ?? 0, g.cumplidas ?? 0])).join('');
      const cols = reportMode === 'individual' ? ['Fecha', 'Motivo', 'Sanción', 'Estado'] : ['Grupo', 'Faltas', 'Pendientes', 'Cumplidas'];
      return head(cols) + body;
    }
    const body = reportMode === 'individual'
      ? filteredRecords.map(r => {
          const [fecha, hora] = r.fechaHora.split('T');
          return cells([fecha, hora?.slice(0, 5) ?? '', r.tipo]);
        }).join('')
      : groupStats.map(g => cells([g.group, g.entradas ?? 0, g.retardos ?? 0, g.salidas ?? 0, (g.entradas ?? 0) + (g.retardos ?? 0) + (g.salidas ?? 0)])).join('');
    const cols = reportMode === 'individual' ? ['Fecha', 'Hora', 'Tipo'] : ['Grupo', 'Entradas', 'Retardos', 'Salidas', 'Total'];
    return head(cols) + body;
  };

  const handleExportExcel = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">${buildExcelHtml()}</table></body></html>`;
    downloadBlob(html, `reporte_${reportType}.xls`, 'application/vnd.ms-excel');
    toastSuccess('Reporte Excel descargado.');
  };

  const buildPrintTable = (): { headers: string; rows: string } => {
    const row = (vals: (string | number)[]) => `<tr>${vals.map(v => `<td>${String(v)}</td>`).join('')}</tr>`;
    const head = (cols: string[]) => `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    if (reportType === 'incidencias') {
      if (reportMode === 'individual') {
        return {
          headers: head(['Fecha', 'Tipo', 'Descripción', 'Estado']),
          rows: filteredIncidencias.map(i => row([(i.fecha_registro ?? '').slice(0, 10), i.tipo, i.descripcion, i.estado])).join(''),
        };
      }
      return {
        headers: head(['Grupo', 'Incidencias']),
        rows: groupStats.map(g => row([g.group, g.incidencias ?? 0])).join(''),
      };
    }
    if (reportType === 'faltas') {
      if (reportMode === 'individual') {
        return {
          headers: head(['Fecha', 'Motivo', 'Sanción', 'Estado']),
          rows: filteredReportes.map(r => row([(r.fecha ?? '').slice(0, 10), r.motivo, r.sancion, r.sancion_cumplida ? 'Cumplida' : 'Pendiente'])).join(''),
        };
      }
      return {
        headers: head(['Grupo', 'Faltas', 'Pendientes', 'Cumplidas']),
        rows: groupStats.map(g => row([g.group, g.faltas ?? 0, g.pendientes ?? 0, g.cumplidas ?? 0])).join(''),
      };
    }
    if (reportMode === 'individual') {
      return {
        headers: head(['Fecha', 'Hora', 'Tipo']),
        rows: filteredRecords.map(r => {
          const [fecha, hora] = r.fechaHora.split('T');
          return row([fecha, hora?.slice(0, 5) ?? '', r.tipo]);
        }).join(''),
      };
    }
    return {
      headers: head(['Grupo', 'Entradas', 'Retardos', 'Salidas', 'Total']),
      rows: groupStats.map(g => row([g.group, g.entradas ?? 0, g.retardos ?? 0, g.salidas ?? 0, (g.entradas ?? 0) + (g.retardos ?? 0) + (g.salidas ?? 0)])).join(''),
    };
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toastError('El navegador bloqueo la ventana de impresion.');
      return;
    }
    const { headers, rows } = buildPrintTable();
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${reporteTitulo}</title><style>body{font-family:'IBM Plex Sans',Arial,sans-serif;padding:24px}h1{color:#1C1819;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #CAC6C7;padding:8px;text-align:left;font-size:13px}th{background:#F0EFEF}</style></head><body><h1>COBAO Plantel 27 - ${reporteTitulo}</h1><p style="color:#5F5657">Tipo: ${reportTypes.find(r => r.id === reportType)?.label ?? reportType} | Periodo: ${startDate || 'inicio'} - ${endDate || 'hoy'}</p><table>${headers}${rows}</table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const marginX = 40;
    let y = 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 24, 25);
    doc.text(`COBAO Plantel 27 - ${reporteTitulo}`, marginX, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(95, 86, 87);
    doc.text(`Tipo: ${reportTypes.find(r => r.id === reportType)?.label ?? reportType} | Periodo: ${startDate || 'inicio'} - ${endDate || 'hoy'}`, marginX, y);
    y += 30;

    doc.setFontSize(10);
    doc.setTextColor(28, 24, 25);

    if (reportMode === 'individual') {
      const lines = reportType === 'incidencias'
        ? filteredIncidencias.map(i => `${(i.fecha_registro ?? '').slice(0, 10)}   ${i.tipo}   ${i.descripcion}`)
        : reportType === 'faltas'
          ? filteredReportes.map(r => `${(r.fecha ?? '').slice(0, 10)}   ${r.motivo}   ${r.sancion}   ${r.sancion_cumplida ? 'Cumplida' : 'Pendiente'}`)
          : filteredRecords.map(r => {
              const [fecha, hora] = r.fechaHora.split('T');
              return `${fecha}   ${hora?.slice(0, 5) ?? ''}   ${r.tipo}`;
            });
      lines.forEach((line) => {
        if (y > 720) { doc.addPage('letter', 'portrait'); y = 60; }
        doc.text(line, marginX, y);
        y += 16;
      });
    } else {
      const colW = 90;
      if (reportType === 'incidencias') {
        ['Grupo', 'Incidencias'].forEach((c, i) => doc.text(c, marginX + i * colW, y));
        y += 18;
        groupStats.forEach((g) => {
          if (y > 720) { doc.addPage('letter', 'portrait'); y = 60; }
          doc.text(g.group, marginX, y);
          doc.text(String(g.incidencias ?? 0), marginX + colW, y);
          y += 18;
        });
      } else if (reportType === 'faltas') {
        ['Grupo', 'Faltas', 'Pendientes', 'Cumplidas'].forEach((c, i) => doc.text(c, marginX + i * colW, y));
        y += 18;
        groupStats.forEach((g) => {
          if (y > 720) { doc.addPage('letter', 'portrait'); y = 60; }
          doc.text(g.group, marginX, y);
          doc.text(String(g.faltas ?? 0), marginX + colW, y);
          doc.text(String(g.pendientes ?? 0), marginX + colW * 2, y);
          doc.text(String(g.cumplidas ?? 0), marginX + colW * 3, y);
          y += 18;
        });
      } else {
        ['Grupo', 'Entradas', 'Retardos', 'Salidas', 'Total'].forEach((c, i) => doc.text(c, marginX + i * colW, y));
        y += 18;
        groupStats.forEach((g) => {
          if (y > 720) { doc.addPage('letter', 'portrait'); y = 60; }
          doc.text(g.group, marginX, y);
          doc.text(String(g.entradas ?? 0), marginX + colW, y);
          doc.text(String(g.retardos ?? 0), marginX + colW * 2, y);
          doc.text(String(g.salidas ?? 0), marginX + colW * 3, y);
          doc.text(String((g.entradas ?? 0) + (g.retardos ?? 0) + (g.salidas ?? 0)), marginX + colW * 4, y);
          y += 18;
        });
      }
    }

    doc.save(`reporte_${reportType}_${startDate || 'inicio'}.pdf`);
    toastSuccess('Reporte PDF descargado.');
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      ENTRADA: { bg: COLORS.lightGreen, color: COLORS.success, label: 'Entrada' },
      retardo: { bg: COLORS.lightPink, color: COLORS.primary, label: 'Fuera de horario' },
      SALIDA: { bg: COLORS.bg, color: COLORS.textSec, label: 'Salida' },
      DENEGADO: { bg: COLORS.lightPink, color: COLORS.primaryDark, label: 'Denegado' },
    };
    const b = map[tipo] ?? { bg: COLORS.bg, color: COLORS.textSec, label: tipo };
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: b.bg,
        color: b.color,
      }}>
        {b.label}
      </span>
    );
  };

  const sectionCard: React.CSSProperties = {
    background: COLORS.white,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    padding: 20,
    marginBottom: 16,
  };

  const sectionTitle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.text,
    marginBottom: 20,
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textSec,
    marginBottom: 6,
  };

  const formInput: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.white,
    fontSize: 14,
    color: COLORS.text,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const customSelect: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.white,
    fontSize: 14,
    color: COLORS.text,
    outline: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 8,
    border: 'none',
    background: COLORS.primary,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const btnOutline: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.white,
    color: COLORS.textSec,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 14px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.textSec,
    background: COLORS.bg,
    borderBottom: `2px solid ${COLORS.border}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.text,
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 32px', background: COLORS.bg, minHeight: '100vh' }}>
        <Loader message="Cargando datos..." fullScreen={false} height="70vh" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', background: COLORS.bg, minHeight: '100vh' }}>

      {/* Selector de modo de reporte */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { id: 'individual' as const, label: 'Por Alumno', icon: User },
          { id: 'grupo' as const, label: 'Por Grupo', icon: Users },
        ]).map(mode => (
          <button
            key={mode.id}
            onClick={() => { setReportMode(mode.id); setReportGenerated(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              border: `1.5px solid ${reportMode === mode.id ? COLORS.primary : COLORS.border}`,
              background: reportMode === mode.id ? COLORS.lightPink : COLORS.white,
              color: reportMode === mode.id ? COLORS.primary : COLORS.textSec,
              fontWeight: reportMode === mode.id ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <mode.icon size={18} />
            {mode.label}
          </button>
        ))}
      </div>

      <div style={sectionCard}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {reportMode === 'individual' && (
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <label style={fieldLabel}>
                <Search size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                Buscar alumno
              </label>
              <input
                type="text"
                style={formInput}
                placeholder="Nombre o No. Control..."
                value={searchStudent}
                onChange={e => { setSearchStudent(e.target.value); setShowStudentDropdown(true); }}
                onFocus={() => setShowStudentDropdown(true)}
              />
              {showStudentDropdown && filteredStudents.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 10,
                }}>
                  {filteredStudents.slice(0, 10).map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSearchStudent(getNombreCompleto(s));
                        setShowStudentDropdown(false);
                        setReportGenerated(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: `1px solid ${COLORS.bg}`,
                        background: selectedStudentId === s.id ? COLORS.lightPink : COLORS.white,
                        color: COLORS.text,
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <strong>{getNombreCompleto(s)}</strong>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>
                        {s.matricula} - {getGrupoNombre(s.id_grupo)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: COLORS.lightPink,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                }}>
                  <User size={16} color={COLORS.primary} />
                  <strong style={{ color: COLORS.text }}>{getNombreCompleto(selectedStudent)}</strong>
                  <span style={{ color: COLORS.textSec }}>- {getGrupoNombre(selectedStudent.id_grupo)} - {selectedStudent.matricula}</span>
                  <button
                    onClick={() => { setSelectedStudentId(null); setSearchStudent(''); setReportGenerated(false); }}
                    style={{
                      marginLeft: 'auto',
                      background: 'none',
                      border: 'none',
                      color: COLORS.primary,
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    x
                  </button>
                </div>
              )}
            </div>
          )}

          {reportMode === 'grupo' && (
            <div style={{ minWidth: 160, position: 'relative' }}>
              <label style={fieldLabel}>
                <Users size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                Grupo
              </label>
              <button
                type="button"
                style={customSelect}
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              >
                {selectedGroup}
                <ChevronDown size={16} />
              </button>
              {showGroupDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 10,
                }}>
                  {allGroups.map(g => (
                    <button
                      key={g}
                      onClick={() => { setSelectedGroup(g); setShowGroupDropdown(false); setReportGenerated(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: `1px solid ${COLORS.bg}`,
                        background: selectedGroup === g ? COLORS.lightPink : COLORS.white,
                        color: COLORS.text,
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ minWidth: 160 }}>
            <label style={fieldLabel}>
              <Filter size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Tipo de reporte
            </label>
            <select
              style={customSelect}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              {reportTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
          </div>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setReportGenerated(false);
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={reportMode === 'individual' && selectedStudentId === null}
            style={{
              ...btnPrimary,
              opacity: reportMode === 'individual' && selectedStudentId === null ? 0.5 : 1,
              cursor: reportMode === 'individual' && selectedStudentId === null ? 'not-allowed' : 'pointer',
            }}
          >
            <FileText size={16} />
            Generar
          </button>
        </div>
      </div>

      {/* Vista previa del reporte */}
      {reportGenerated && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <FileText size={20} />
            {reportMode === 'individual'
              ? `Reporte de ${selectedStudent ? getNombreCompleto(selectedStudent) : ''}`
              : `Reporte del grupo ${selectedGroup}`
            }
          </h2>

          {reportMode === 'individual' && studentStats && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 24,
              }}>
                {studentStats.stats.map(stat => (
                  <div key={stat.label} style={{
                    padding: 16,
                    borderRadius: 10,
                    background: stat.bg,
                    textAlign: 'center',
                    border: `1px solid ${COLORS.border}`,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSec, marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                {reportType === 'gestion' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Hora</th>
                        <th style={thStyle}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: COLORS.textMuted }}>
                            No hay registros para este alumno en el periodo seleccionado
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map(record => (
                          <tr key={record.id}>
                            <td style={tdStyle}>{record.fechaHora.split('T')[0]}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500 }}>{record.fechaHora.split('T')[1]?.slice(0, 5)}</td>
                            <td style={tdStyle}>{tipoBadge(record.tipo)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {reportType === 'incidencias' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Tipo</th>
                        <th style={thStyle}>Descripción</th>
                        <th style={thStyle}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidencias.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: COLORS.textMuted }}>
                            No hay incidencias para este alumno en el periodo seleccionado
                          </td>
                        </tr>
                      ) : (
                        filteredIncidencias.map(i => (
                          <tr key={i.id}>
                            <td style={tdStyle}>{i.fecha_registro?.slice(0, 10)}</td>
                            <td style={tdStyle}>{i.tipo}</td>
                            <td style={tdStyle}>{i.descripcion}</td>
                            <td style={tdStyle}>{i.estado}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {reportType === 'faltas' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Motivo</th>
                        <th style={thStyle}>Sanción</th>
                        <th style={thStyle}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReportes.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: COLORS.textMuted }}>
                            No hay faltas al reglamento para este alumno en el periodo seleccionado
                          </td>
                        </tr>
                      ) : (
                        filteredReportes.map(r => (
                          <tr key={r.id}>
                            <td style={tdStyle}>{r.fecha?.slice(0, 10)}</td>
                            <td style={tdStyle}>{r.motivo}</td>
                            <td style={tdStyle}>{r.sancion}</td>
                            <td style={tdStyle}>{r.sancion_cumplida ? 'Cumplida' : 'Pendiente'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {reportMode === 'grupo' && (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                {reportType === 'gestion' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Grupo</th>
                        <th style={thStyle}>Entradas</th>
                        <th style={thStyle}>Fuera de horario</th>
                        <th style={thStyle}>Salidas</th>
                        <th style={thStyle}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStats.map(row => (
                        <tr key={row.group}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{row.group}</td>
                          <td style={tdStyle}>{row.entradas ?? 0}</td>
                          <td style={tdStyle}>{row.retardos ?? 0}</td>
                          <td style={tdStyle}>{row.salidas ?? 0}</td>
                          <td style={tdStyle}>{(row.entradas ?? 0) + (row.retardos ?? 0) + (row.salidas ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'incidencias' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Grupo</th>
                        <th style={thStyle}>Incidencias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStats.map(row => (
                        <tr key={row.group}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{row.group}</td>
                          <td style={tdStyle}>{row.incidencias ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'faltas' && (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Grupo</th>
                        <th style={thStyle}>Faltas</th>
                        <th style={thStyle}>Pendientes</th>
                        <th style={thStyle}>Cumplidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStats.map(row => (
                        <tr key={row.group}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{row.group}</td>
                          <td style={tdStyle}>{row.faltas ?? 0}</td>
                          <td style={tdStyle}>{row.pendientes ?? 0}</td>
                          <td style={tdStyle}>{row.cumplidas ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {reportType === 'gestion' && (
              <div style={{
                background: COLORS.white,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                padding: 20,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>
                  Distribución por grupo
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 24,
                  height: 200,
                  padding: '0 16px',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  {groupStats.map(data => (
                    <div key={data.group} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      gap: 4,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
                        <div
                          style={{
                            width: 20,
                            borderRadius: '4px 4px 0 0',
                            background: COLORS.success,
                            height: `${((data.entradas ?? 0) / maxBarValue) * 160}px`,
                          }}
                          title={`Entradas: ${data.entradas ?? 0}`}
                        />
                        <div
                          style={{
                            width: 20,
                            borderRadius: '4px 4px 0 0',
                            background: COLORS.primary,
                            height: `${((data.retardos ?? 0) / maxBarValue) * 160}px`,
                          }}
                           title={`Fuera de horario: ${data.retardos ?? 0}`}
                        />
                        <div
                          style={{
                            width: 20,
                            borderRadius: '4px 4px 0 0',
                            background: COLORS.info,
                            height: `${((data.salidas ?? 0) / maxBarValue) * 160}px`,
                          }}
                          title={`Salidas: ${data.salidas ?? 0}`}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSec }}>{data.group}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'center' }}>
                  {[
                    { label: 'Entradas', color: COLORS.success },
                    { label: 'Fuera de horario', color: COLORS.primary },
                    { label: 'Salidas', color: COLORS.info },
                  ].map(item => (
                    <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.textSec }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
              )}
            </>
          )}

          {/* Acciones de exportacion */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button style={btnOutline} onClick={handleExportPDF}><Download size={16} /> PDF</button>
            <button style={btnOutline} onClick={handleExportExcel}><Download size={16} /> Excel</button>
            <button style={btnOutline} onClick={handleExportCSV}><Download size={16} /> CSV</button>
            <button style={btnOutline} onClick={handlePrint}><Printer size={16} /> Imprimir</button>
          </div>

          {/* Envio por correo */}
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${COLORS.border}`,
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: COLORS.text,
              cursor: 'pointer',
              marginBottom: sendByEmail ? 12 : 0,
            }}>
              <input
                type="checkbox"
                checked={sendByEmail}
                onChange={e => setSendByEmail(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: COLORS.primary }}
              />
              <Mail size={16} /> Enviar por correo
            </label>
            {sendByEmail && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="email"
                  style={{ ...formInput, flex: 1 }}
                  placeholder="Correo del destinatario"
                  value={emailToSend}
                  onChange={e => setEmailToSend(e.target.value)}
                />
                <button style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>
                  <Mail size={14} /> Enviar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reportes programados */}
      <div style={sectionCard}>
        <h2 style={sectionTitle}>
          <Calendar size={20} />
          Reportes programados
          <button
            onClick={openCreateProgramado}
            style={{
              ...btnPrimary,
              marginLeft: 'auto',
              padding: '7px 14px',
              fontSize: 13,
            }}
          >
            <Plus size={15} /> Nuevo reporte
          </button>
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Frecuencia</th>
                <th style={thStyle}>Última generación</th>
                <th style={thStyle}>Próxima generación</th>
                <th style={thStyle}>Destinatarios</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map(report => (
                <tr key={report.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{report.nombre}</td>
                  <td style={tdStyle}>{report.frecuencia}</td>
                  <td style={tdStyle}>{report.ultima_generacion ?? '---'}</td>
                  <td style={tdStyle}>{report.proxima_generacion ?? '---'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.textSec }}>
                    {report.destinatarios ?? '---'}
                  </td>
                  <td style={tdStyle}>
                    {/* Interruptor */}
                    <div
                      onClick={() => handleToggleActive(report.id)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        background: report.activo ? COLORS.success : COLORS.border,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 200ms',
                      }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: COLORS.white,
                        position: 'absolute',
                        top: 2,
                        left: report.activo ? 20 : 2,
                        transition: 'left 200ms',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Ejecutar ahora" onClick={() => handleRunNow(report.id)} disabled={executingId === report.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
                        background: COLORS.white, color: COLORS.textSec, cursor: 'pointer', opacity: executingId === report.id ? 0.5 : 1,
                      }}>
                        <Play size={14} />
                      </button>
                      <button title="Editar" onClick={() => openEditProgramado(report)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
                        background: COLORS.white, color: COLORS.textSec, cursor: 'pointer',
                      }}>
                        <Edit size={14} />
                      </button>
                      <button title="Eliminar" onClick={() => handleDelete(report.id)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.lightPink}`,
                        background: COLORS.lightPink, color: COLORS.primary, cursor: 'pointer',
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 20,
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            style={{
              ...btnOutline,
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Anterior
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1.5px solid ${currentPage === page ? COLORS.primary : COLORS.border}`,
                  background: currentPage === page ? COLORS.primary : COLORS.white,
                  color: currentPage === page ? COLORS.white : COLORS.textSec,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            style={{
              ...btnOutline,
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* ========== MODAL REPORTE PROGRAMADO ========== */}
      {showProgramadoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,25,0.5)', zIndex: 1000, backdropFilter: 'blur(2px)' }} onClick={() => setShowProgramadoModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '90%', maxWidth: 440, background: COLORS.white, borderRadius: 16,
              zIndex: 1001, boxShadow: '0 20px 60px rgba(28,24,25,0.3)', padding: '28px 24px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.text }}>
                {editProgramado ? 'Editar reporte programado' : 'Nuevo reporte programado'}
              </h3>
              <button onClick={() => setShowProgramadoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={fieldLabel}>Nombre del reporte</label>
                <input className="input" value={progNombre} onChange={e => setProgNombre(e.target.value)} placeholder="Ej. Reporte de asistencia diaria" />
              </div>
              <div>
                <label style={fieldLabel}>Frecuencia</label>
                <select className="select" value={progFrecuencia} onChange={e => setProgFrecuencia(e.target.value)}>
                  <option value="Diaria">Diaria</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensual">Mensual</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Destinatarios (correos separados por coma)</label>
                <input className="input" value={progDestinatarios} onChange={e => setProgDestinatarios(e.target.value)} placeholder="admin@cobao.edu.mx, prefectura@cobao.edu.mx" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.text, cursor: 'pointer' }}>
                <input type="checkbox" checked={progActivo} onChange={e => setProgActivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: COLORS.primary }} />
                Reporte activo
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn--secondary" onClick={() => setShowProgramadoModal(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSaveProgramado} disabled={savingProgramado || !progNombre.trim()}>
                {savingProgramado ? 'Guardando...' : (editProgramado ? 'Guardar cambios' : 'Crear reporte')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPasswordModal
        open={!!confirmDelete}
        title={confirmDelete?.title ?? ''}
        message={confirmDelete?.message ?? ''}
        confirmLabel="Eliminar"
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDelete?.run ?? (() => {})}
      />
    </div>
  );
}
