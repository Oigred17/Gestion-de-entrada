import { useState } from 'react';
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
  BarChart3,
  ChevronDown,
  User,
  Users,
  Filter,
} from 'lucide-react';
import { students, recentRecords, type ScanRecord } from '../data/mockData';

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
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'puntualidad', label: 'Puntualidad' },
  { id: 'incidencias', label: 'Incidencias' },
  { id: 'credenciales', label: 'Credenciales' },
];

const mockScheduledReports = [
  { id: 1, nombre: 'Asistencia Diaria', frecuencia: 'Diaria', ultimaGeneracion: '2026-07-12', proximaGeneracion: '2026-07-13', destinatarios: 'admin@escuela.mx', activo: true },
  { id: 2, nombre: 'Retardos Semanales', frecuencia: 'Semanal', ultimaGeneracion: '2026-07-07', proximaGeneracion: '2026-07-14', destinatarios: 'direccion@escuela.mx', activo: true },
  { id: 3, nombre: 'Resumen Mensual', frecuencia: 'Mensual', ultimaGeneracion: '2026-06-30', proximaGeneracion: '2026-07-31', destinatarios: 'admin@escuela.mx', activo: false },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('asistencia');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [reportMode, setReportMode] = useState<'individual' | 'grupo'>('individual');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scheduledReports, setScheduledReports] = useState(mockScheduledReports);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendByEmail, setSendByEmail] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const allGroups = ['Todos', ...Array.from(new Set(students.map(s => s.grupo)))];

  const filteredStudents = students.filter(s =>
    s.nombre.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.numControl.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null;

  const filteredRecords: ScanRecord[] = recentRecords.filter(r => {
    if (reportMode === 'individual' && selectedStudentId !== null) {
      if (r.alumno.id !== selectedStudentId) return false;
    }
    if (reportMode === 'grupo' && selectedGroup !== 'Todos') {
      if (r.alumno.grupo !== selectedGroup) return false;
    }
    if (startDate && r.fecha < startDate) return false;
    if (endDate && r.fecha > endDate) return false;
    return true;
  });

  const studentStats = reportMode === 'individual' && selectedStudent ? {
    nombre: selectedStudent.nombre,
    grupo: selectedStudent.grupo,
    totalRegistros: filteredRecords.length,
    entradas: filteredRecords.filter(r => r.tipo === 'entrada').length,
    retardos: filteredRecords.filter(r => r.tipo === 'retardo').length,
    salidas: filteredRecords.filter(r => r.tipo === 'salida').length,
  } : null;

  const groupStats = allGroups.filter(g => g !== 'Todos').map(group => {
    const groupRecords = recentRecords.filter(r => r.alumno.grupo === group);
    return {
      group,
      asistencias: groupRecords.filter(r => r.tipo === 'entrada').length,
      retardos: groupRecords.filter(r => r.tipo === 'retardo').length,
      salidas: groupRecords.filter(r => r.tipo === 'salida').length,
    };
  });

  const maxBarValue = Math.max(1, ...groupStats.map(d => Math.max(d.asistencias, d.retardos, d.salidas)));

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
    setScheduledReports(prev =>
      prev.map(r => (r.id === id ? { ...r, activo: !r.activo } : r))
    );
  };

  const handleDelete = (id: number) => {
    setScheduledReports(prev => prev.filter(r => r.id !== id));
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      entrada: { bg: COLORS.lightGreen, color: COLORS.success, label: 'Entrada' },
      retardo: { bg: COLORS.lightPink, color: COLORS.primary, label: 'Retardo' },
      salida: { bg: COLORS.bg, color: COLORS.textSec, label: 'Salida' },
      denegado: { bg: COLORS.lightPink, color: COLORS.primaryDark, label: 'Denegado' },
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
                        setSearchStudent(s.nombre);
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
                      <strong>{s.nombre}</strong>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>
                        {s.numControl} - {s.grupo}
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
                  <strong style={{ color: COLORS.text }}>{selectedStudent.nombre}</strong>
                  <span style={{ color: COLORS.textSec }}>- {selectedStudent.grupo} - {selectedStudent.numControl}</span>
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

          <div>
            <label style={fieldLabel}>
              <Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Desde
            </label>
            <input type="date" style={formInput} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>
              <Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              Hasta
            </label>
            <input type="date" style={formInput} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

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
              ? `Reporte de ${selectedStudent?.nombre}`
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
                {[
                  { label: 'Total', value: studentStats.totalRegistros, bg: COLORS.bg, color: COLORS.text },
                  { label: 'Entradas', value: studentStats.entradas, bg: COLORS.lightGreen, color: COLORS.success },
                  { label: 'Retardos', value: studentStats.retardos, bg: COLORS.lightPink, color: COLORS.primary },
                  { label: 'Salidas', value: studentStats.salidas, bg: COLORS.bg, color: COLORS.textSec },
                ].map(stat => (
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
                          <td style={tdStyle}>{record.fecha}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500 }}>{record.hora}</td>
                          <td style={tdStyle}>{tipoBadge(record.tipo)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {reportMode === 'grupo' && (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Grupo</th>
                      <th style={thStyle}>Entradas</th>
                      <th style={thStyle}>Retardos</th>
                      <th style={thStyle}>Salidas</th>
                      <th style={thStyle}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map(row => (
                      <tr key={row.group}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.group}</td>
                        <td style={tdStyle}>{row.asistencias}</td>
                        <td style={tdStyle}>{row.retardos}</td>
                        <td style={tdStyle}>{row.salidas}</td>
                        <td style={tdStyle}>{row.asistencias + row.retardos + row.salidas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                            height: `${(data.asistencias / maxBarValue) * 160}px`,
                          }}
                          title={`Entradas: ${data.asistencias}`}
                        />
                        <div
                          style={{
                            width: 20,
                            borderRadius: '4px 4px 0 0',
                            background: COLORS.primary,
                            height: `${(data.retardos / maxBarValue) * 160}px`,
                          }}
                          title={`Retardos: ${data.retardos}`}
                        />
                        <div
                          style={{
                            width: 20,
                            borderRadius: '4px 4px 0 0',
                            background: COLORS.info,
                            height: `${(data.salidas / maxBarValue) * 160}px`,
                          }}
                          title={`Salidas: ${data.salidas}`}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSec }}>{data.group}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'center' }}>
                  {[
                    { label: 'Entradas', color: COLORS.success },
                    { label: 'Retardos', color: COLORS.primary },
                    { label: 'Salidas', color: COLORS.info },
                  ].map(item => (
                    <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.textSec }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Acciones de exportacion */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button style={btnOutline}><Download size={16} /> PDF</button>
            <button style={btnOutline}><Download size={16} /> Excel</button>
            <button style={btnOutline}><Download size={16} /> CSV</button>
            <button style={btnOutline}><Printer size={16} /> Imprimir</button>
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
                  <td style={tdStyle}>{report.ultimaGeneracion}</td>
                  <td style={tdStyle}>{report.proximaGeneracion}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.textSec }}>
                    {report.destinatarios}
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
                      <button title="Ejecutar ahora" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
                        background: COLORS.white, color: COLORS.textSec, cursor: 'pointer',
                      }}>
                        <Play size={14} />
                      </button>
                      <button title="Editar" style={{
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
    </div>
  );
}
