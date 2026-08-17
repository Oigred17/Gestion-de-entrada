import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock, AlertTriangle, Bell, Check, ChevronRight, Clock,
  LogOut, MoveRight, ScanLine, ShieldX, TrendingUp, UserCheck, X,
  type LucideIcon,
} from 'lucide-react';
import { registrosApi, retardosApi, alumnosApi, reportesApi, gruposApi, permisosApi } from '../api';
import type { RegistroAcceso, Retardo, Alumno, Reporte, Grupo, Permiso } from '../types';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

const tipoConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  ENTRADA: { label: 'Entrada', color: '#0F8122', bg: '#E8F5E9', icon: Check },
  retardo: { label: 'Fuera de horario', color: '#1792AB', bg: '#DCF5FF', icon: AlarmClock },
  SALIDA: { label: 'Salida', color: '#1792AB', bg: '#DCF5FF', icon: MoveRight },
  denegado: { label: 'Denegado', color: '#AB1748', bg: '#FEEBEE', icon: X },
};

function esHoy(fechaHora: string, hoy: string): boolean {
  return fechaHora.startsWith(hoy);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nombreCompleto(a?: Alumno | null): string {
  return a ? `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`.trim() : 'Sin datos';
}

function obtenerGravedad(reporte: Reporte): 'Leve' | 'Moderada' | 'Grave' {
  const sancion = (reporte.sancion || '').toLowerCase();
  if (/suspension|expulsion|grave/.test(sancion)) return 'Grave';
  if (/amonestacion|llamado/.test(sancion)) return 'Moderada';
  return 'Leve';
}

interface ActivityRecord {
  key: string;
  tipo: string;
  hora: string;
  alumno: Alumno | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const esServiciosEscolares = user?.rol === 'Servicios Escolares';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [registros, setRegistros] = useState<RegistroAcceso[]>([]);
  const [retardosData, setRetardosData] = useState<Retardo[]>([]);
  const [alumnosData, setAlumnosData] = useState<Alumno[]>([]);
  const [reportesData, setReportesData] = useState<Reporte[]>([]);
  const [gruposData, setGruposData] = useState<Grupo[]>([]);
  const [permisosData, setPermisosData] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [absentModalOpen, setAbsentModalOpen] = useState(false);
  const absentCloseRef = useRef<HTMLButtonElement>(null);

  const alumnoMap = Object.fromEntries(alumnosData.map(a => [a.id, a]));
  const grupoMap = Object.fromEntries(gruposData.map(g => [g.id, g.nombre]));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [registrosRes, retardosRes, alumnosRes, reportesRes, gruposRes, permisosRes] = await Promise.all([
          registrosApi.getAll(),
          retardosApi.getAll(),
          alumnosApi.getAll(),
          reportesApi.getAll(),
          gruposApi.getAll(),
          permisosApi.getAll(),
        ]);
        setRegistros(registrosRes);
        setRetardosData(retardosRes);
        setAlumnosData(alumnosRes);
        setReportesData(reportesRes);
        setGruposData(gruposRes);
        setPermisosData(permisosRes);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('No se pudo conectar con el servidor. Revisa que el backend esté corriendo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!absentModalOpen) return;
    absentCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbsentModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [absentModalOpen]);

  const hoy = formatLocalDate(new Date());
  const totalAlumnos = alumnosData.length;
  const registrosHoy = registros.filter(r => esHoy(r.fecha_hora, hoy));
  const retardosHoy = retardosData.filter(r => esHoy(r.fecha, hoy));

  const estadoAlumno = new Map<number, string>();
  for (const r of [...registrosHoy].sort((a, b) => (a.fecha_hora || '').localeCompare(b.fecha_hora || ''))) {
    estadoAlumno.set(r.alumno_id, r.tipo_acceso);
  }

  const entradosHoy = new Set(registrosHoy.filter(r => r.tipo_acceso === 'ENTRADA').map(r => r.alumno_id));
  const presentes = Array.from(estadoAlumno.values()).filter(v => v === 'ENTRADA').length;
  const salidas = Array.from(estadoAlumno.values()).filter(v => v === 'SALIDA').length;
  const retardosCount = retardosHoy.length;
  const denegadosHoy = registrosHoy.filter(r => r.tipo_acceso === 'denegado').length;

  const conPermisoHoy = new Set(
    permisosData
      .filter(p => p.estado === 'Aprobado' && (p.fecha_salida || '').startsWith(hoy))
      .map(p => p.id_alumno)
  );
  const conPermisoAusentes = [...conPermisoHoy].filter(id => !entradosHoy.has(id)).length;
  const faltasCount = Math.max(0, totalAlumnos - entradosHoy.size - conPermisoAusentes);

  const absentStudents = alumnosData
    .filter(a => !entradosHoy.has(a.id) && !conPermisoHoy.has(a.id))
    .sort(
      (a, b) =>
        (a.id_grupo ?? 0) - (b.id_grupo ?? 0) ||
        `${a.apellido_paterno} ${a.nombre}`.localeCompare(`${b.apellido_paterno} ${b.nombre}`)
    );

  const reportesPendientes = reportesData.filter(r => !r.sancion_cumplida);
  const unresolvedIncidents: Array<{ id: number; tipo: string; alumno?: Alumno; fecha: string; gravedad: string }> = reportesPendientes
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      tipo: r.motivo,
      alumno: r.alumno || alumnoMap[r.id_alumno] as Alumno | undefined,
      fecha: r.fecha,
      gravedad: obtenerGravedad(r),
    }));

  const retardoKeys = new Set(
    retardosHoy.map(r => `${r.alumno_id}|${(r.hora_llegada || '').slice(0, 5)}`)
  );

  const recentActivity: ActivityRecord[] = [
    ...registrosHoy
      .filter(r => {
        if (r.tipo_acceso !== 'ENTRADA') return true;
        const hora = (r.fecha_hora.split('T')[1] || r.fecha_hora.split(' ')[1] || '').slice(0, 5);
        return !retardoKeys.has(`${r.alumno_id}|${hora}`);
      })
      .map(r => ({
        key: `reg-${r.id}`,
        tipo: r.tipo_acceso,
        hora: (r.fecha_hora.split('T')[1] || r.fecha_hora.split(' ')[1] || '').slice(0, 5),
        alumno: r.alumno || alumnoMap[r.alumno_id] || null,
      })),
    ...retardosHoy.map(r => ({
      key: `ret-${r.id}`,
      tipo: 'retardo' as const,
      hora: (r.hora_llegada || '').slice(0, 5),
      alumno: r.alumno || alumnoMap[r.alumno_id] || null,
    })),
  ].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 10);

  const attendanceByGroup = Array.from(new Set(alumnosData.map(s => s.id_grupo ? s.id_grupo : 0))).map(idGrupo => {
    const groupStudents = alumnosData.filter(s => (s.id_grupo ?? 0) === idGrupo);
    const groupRegistros = registros.filter(r => {
      if (!esHoy(r.fecha_hora, hoy)) return false;
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return (alumno?.id_grupo ?? 0) === idGrupo;
    });
    const groupEstados = new Map<number, string>();
    for (const r of [...groupRegistros].sort((a, b) => (a.fecha_hora || '').localeCompare(b.fecha_hora || ''))) {
      groupEstados.set(r.alumno_id, r.tipo_acceso);
    }
    const groupRetardos = retardosHoy.filter(r => {
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return (alumno?.id_grupo ?? 0) === idGrupo;
    });
    return {
      idGrupo,
      group: idGrupo ? (grupoMap[idGrupo] || `Grupo ${idGrupo}`) : 'Sin grupo',
      total: groupStudents.length,
      presentes: Array.from(groupEstados.values()).filter(v => v === 'ENTRADA').length,
      retardos: groupRetardos.length,
    };
  }).sort((a, b) => b.total - a.total);

  const currentTimeStr = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const currentDateStr = currentTime.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats: Array<{ key: string; label: string; value: number; total: number; color: string; bg: string; icon: LucideIcon; title?: string; action?: () => void }> = [
    { key: 'presentes', label: 'Presentes', value: presentes, total: totalAlumnos, color: '#0F8122', bg: '#E8F5E9', icon: UserCheck },
    { key: 'retardos', label: 'Fuera de horario', value: retardosCount, total: totalAlumnos, color: '#1792AB', bg: '#DCF5FF', icon: Clock, title: esServiciosEscolares ? undefined : 'Ver reportes de retardos', action: esServiciosEscolares ? undefined : () => navigate('/reportes') },
    { key: 'faltas', label: 'Faltas', value: faltasCount, total: totalAlumnos, color: '#EB2466', bg: '#FEEBEE', icon: AlertTriangle, title: 'Ver alumnos ausentes de hoy', action: () => setAbsentModalOpen(true) },
    { key: 'salidas', label: 'Salidas', value: salidas, total: entradosHoy.size || 1, color: '#5F5657', bg: '#F0EFEF', icon: LogOut },
    { key: 'denegados', label: 'Denegados', value: denegadosHoy, total: registrosHoy.length || 1, color: '#AB1748', bg: '#FEEBEE', icon: ShieldX, title: esServiciosEscolares ? undefined : 'Ver reportes de denegados', action: esServiciosEscolares ? undefined : () => navigate('/reportes') },
  ];

  if (loading) {
    return <Loader message="Cargando datos del panel..." height={300} />;
  }

  if (error) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #FEEBEE',
        padding: 40, textAlign: 'center', color: '#5F5657', fontSize: 15,
      }}>
        <AlertTriangle size={32} color="#EB2466" style={{ marginBottom: 12 }} />
        <div>{error}</div>
        <button
          className="btn btn--primary"
          style={{ marginTop: 16 }}
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1C1819', fontFamily: 'var(--font-mono)' }}>{currentTimeStr}</div>
          <div style={{ fontSize: 13, color: 'var(--color-gris-carbon)', textTransform: 'capitalize' }}>{currentDateStr}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {stats.map(stat => {
          const pct = stat.total > 0 ? Math.round((stat.value / stat.total) * 100) : 0;
          const content = (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: stat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <stat.icon size={20} color={stat.color} />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--color-gris-carbon)' }}>
                  {pct}%
                  {stat.action && <ChevronRight size={14} color="var(--color-gris-carbon)" />}
                </span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-gris-carbon)', marginTop: 4 }}>{stat.label}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--color-blanco-grisaceo)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: stat.color, borderRadius: 2 }} />
              </div>
            </>
          );
          return stat.action ? (
            <button key={stat.key} className="stat-card stat-card--clickable" onClick={stat.action} title={stat.title}>
              {content}
            </button>
          ) : (
            <div key={stat.key} className="stat-card">{content}</div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1px solid #CAC6C7',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1819', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScanLine size={20} color="#EB2466" />
              Actividad de hoy
            </h2>
            {!esServiciosEscolares && (
              <button
                onClick={() => navigate('/reportes')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: '#EB2466', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                }}
              >
                Ver reportes <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--color-gris-carbon)', fontSize: 14 }}>
                      No hay actividad de hoy
                    </td>
                  </tr>
                ) : recentActivity.map(record => {
                  const cfg = tipoConfig[record.tipo] ?? { label: record.tipo, color: '#5F5657', bg: '#F0EFEF', icon: X };
                  return (
                    <tr key={record.key}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1C1819' }}>{record.hora}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1C1819' }}>{nombreCompleto(record.alumno)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-gris-carbon)', marginTop: 2 }}>
                          {record.alumno?.matricula ?? 'Sin datos'}
                          {record.alumno?.capacitacion ? ` · ${record.alumno.capacitacion}` : ''}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-gris-carbon)' }}>
                        {record.alumno?.id_grupo ? (grupoMap[record.alumno.id_grupo] || `Grupo ${record.alumno.id_grupo}`) : 'Sin grupo'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                          background: cfg.bg, color: cfg.color,
                        }}>
                          <cfg.icon size={13} /> {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7', padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1819', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} color="#1792AB" />
            Asistencia por grupo
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attendanceByGroup.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-gris-carbon)', fontSize: 14 }}>
                No hay grupos registrados
              </div>
            ) : attendanceByGroup.map(g => {
              const pct = g.total > 0 ? Math.round((g.presentes / g.total) * 100) : 0;
              let presW = g.total > 0 ? (g.presentes / g.total) * 100 : 0;
              let retW = g.total > 0 ? (g.retardos / g.total) * 100 : 0;
              const totalW = presW + retW;
              const scale = totalW > 100 ? 100 / totalW : 1;
              presW *= scale;
              retW *= scale;
              return (
                <div key={g.group} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 56, fontSize: 13, fontWeight: 600, color: '#1C1819', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.group}</span>
                  <div style={{ flex: 1, height: 20, background: 'var(--color-blanco-grisaceo)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${presW}%`, background: '#0F8122', height: '100%' }} />
                    <div style={{ width: `${retW}%`, background: '#1792AB', height: '100%' }} />
                  </div>
                  <span style={{ width: 40, fontSize: 12, fontWeight: 600, color: 'var(--color-gris-carbon)', textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-blanco-grisaceo)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-gris-carbon)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0F8122' }} /> Presentes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-gris-carbon)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1792AB' }} /> Fuera de horario
            </span>
          </div>
        </div>

        {!esServiciosEscolares && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1819', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="#EB2466" />
                Alertas
                {reportesPendientes.length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11,
                    background: '#EB2466', color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>
                    {reportesPendientes.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => navigate('/faltas')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: '#EB2466', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                }}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reportesPendientes.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-gris-carbon)', fontSize: 14 }}>
                  No hay alertas pendientes
                </div>
              ) : (
                unresolvedIncidents.map(incident => {
                  const isGrave = incident.gravedad === 'Grave';
                  return (
                    <button
                      key={incident.id}
                      className={`alert-item-btn ${isGrave ? 'alert-item-btn--grave' : ''}`}
                      onClick={() => navigate('/faltas')}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isGrave ? '#EB2466' : '#1792AB' }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1819', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {incident.tipo}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--color-gris-carbon)' }}>
                          {nombreCompleto(incident.alumno)} — {incident.fecha}
                        </span>
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: isGrave ? '#FEEBEE' : '#DCF5FF',
                        color: isGrave ? '#EB2466' : '#1792AB', flexShrink: 0,
                      }}>
                        {incident.gravedad}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {absentModalOpen && (
        <div className="modal-backdrop" onClick={() => setAbsentModalOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="absent-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="absent-modal-title">Alumnos ausentes de hoy</h3>
              <button ref={absentCloseRef} className="modal-close" onClick={() => setAbsentModalOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {absentStudents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-gris-carbon)', padding: '16px 0' }}>
                  No hay alumnos ausentes de hoy.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: 'var(--color-gris-carbon)', marginBottom: 12 }}>
                    {absentStudents.length} alumno{absentStudents.length === 1 ? '' : 's'} sin registro de entrada. Los que cuentan con permiso aprobado no se listan aquí.
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                    {absentStudents.map(a => (
                      <li
                        key={a.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', gap: 12,
                          padding: '10px 12px', border: '1px solid var(--color-gris-plata)',
                          borderRadius: 8, background: 'var(--color-white)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1819' }}>{nombreCompleto(a)}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-gris-carbon)', marginTop: 2 }}>{a.matricula || 'Sin datos'}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1819' }}>
                            {a.id_grupo ? (grupoMap[a.id_grupo] || `Grupo ${a.id_grupo}`) : 'Sin grupo'}
                          </div>
                          {a.capacitacion && (
                            <div style={{ fontSize: 12, color: 'var(--color-gris-carbon)', marginTop: 2 }}>{a.capacitacion}</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => { setAbsentModalOpen(false); navigate('/alumnos'); }}
              >
                Gestionar alumnos
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => setAbsentModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
