import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Clock, AlertTriangle, LogOut, TrendingUp,
  ChevronRight, Bell, ScanLine,
} from 'lucide-react';
import { registrosApi, retardosApi, alumnosApi, reportesApi, gruposApi } from '../api';
import type { RegistroAcceso, Retardo, Alumno, Reporte, Grupo } from '../types';
import Loader from '../components/Loader';

const tipoConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  ENTRADA: { label: 'Entrada', color: '#0F8122', bg: '#E8F5E9', icon: '✓' },
  retardo: { label: 'Entrada fuera de horario', color: '#EB2466', bg: '#FEEBEE', icon: '⏰' },
  SALIDA: { label: 'Salida', color: '#1792AB', bg: '#DCF5FF', icon: '→' },
  denegado: { label: 'Denegado', color: '#AB1748', bg: '#FEEBEE', icon: '✗' },
};

function esHoy(fechaHora: string, hoy: string): boolean {
  return fechaHora.startsWith(hoy);
}

function obtenerGravedad(reporte: Reporte): 'Leve' | 'Moderada' | 'Grave' {
  const sancion = (reporte.sancion || '').toLowerCase();
  if (/suspension|expulsion|grave/.test(sancion)) return 'Grave';
  if (/amonestacion|llamado/.test(sancion)) return 'Moderada';
  return 'Leve';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [registros, setRegistros] = useState<RegistroAcceso[]>([]);
  const [retardosData, setRetardosData] = useState<Retardo[]>([]);
  const [alumnosData, setAlumnosData] = useState<Alumno[]>([]);
  const [reportesData, setReportesData] = useState<Reporte[]>([]);
  const [gruposData, setGruposData] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [registrosRes, retardosRes, alumnosRes, reportesRes, gruposRes] = await Promise.all([
          registrosApi.getAll(),
          retardosApi.getAll(),
          alumnosApi.getAll(),
          reportesApi.getAll(),
          gruposApi.getAll(),
        ]);
        setRegistros(registrosRes);
        setRetardosData(retardosRes);
        setAlumnosData(alumnosRes);
        setReportesData(reportesRes);
        setGruposData(gruposRes);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('No se pudo conectar con el servidor. Revisa que el backend este corriendo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const totalAlumnos = alumnosData.length;
  const presentes = new Set(
    registros
      .filter(r => r.tipo_acceso === 'ENTRADA' && esHoy(r.fecha_hora, hoy))
      .map(r => r.alumno_id)
  ).size;
  const salidas = new Set(
    registros
      .filter(r => r.tipo_acceso === 'SALIDA' && esHoy(r.fecha_hora, hoy))
      .map(r => r.alumno_id)
  ).size;
  const retardosCount = retardosData.filter(r => esHoy(r.fecha, hoy)).length;
  const reportesCount = reportesData.length;

  const stats = [
    { label: 'Presentes', value: presentes, total: totalAlumnos, color: '#0F8122', bg: '#E8F5E9', icon: UserCheck },
    { label: 'Fuera de horario', value: retardosCount, total: totalAlumnos, color: '#1792AB', bg: '#DCF5FF', icon: Clock },
    { label: 'Faltas', value: Math.max(0, totalAlumnos - presentes - retardosCount), total: totalAlumnos, color: '#EB2466', bg: '#FEEBEE', icon: AlertTriangle },
    { label: 'Salidas', value: salidas, total: totalAlumnos, color: '#5F5657', bg: '#F0EFEF', icon: LogOut },
    { label: 'Reportes', value: reportesCount, total: totalAlumnos, color: '#AB1748', bg: '#FEEBEE', icon: AlertTriangle },
  ];

  const recentActivity = [
    ...registros.map(r => ({
      key: `reg-${r.id}`,
      tipo: r.tipo_acceso,
      sort: r.fecha_hora,
      hora: r.fecha_hora.split('T')[1] || r.fecha_hora.split(' ')[1] || '',
      fecha: r.fecha_hora.split('T')[0] || r.fecha_hora.split(' ')[0] || '',
      alumno: r.alumno || alumnoMap[r.alumno_id] || null,
    })),
    ...retardosData.map(r => ({
      key: `ret-${r.id}`,
      tipo: 'retardo' as const,
      sort: `${r.fecha}T${r.hora_llegada || '00:00:00'}`,
      hora: r.hora_llegada,
      fecha: r.fecha,
      alumno: r.alumno || alumnoMap[r.alumno_id] || null,
    })),
  ].sort((a, b) => b.sort.localeCompare(a.sort)).slice(0, 10);

  const attendanceByGroup = Array.from(new Set(alumnosData.map(s => s.id_grupo ? s.id_grupo : 0))).map(idGrupo => {
    const groupStudents = alumnosData.filter(s => (s.id_grupo ?? 0) === idGrupo);
    const groupRegistros = registros.filter(r => {
      if (!esHoy(r.fecha_hora, hoy)) return false;
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return (alumno?.id_grupo ?? 0) === idGrupo;
    });
    const groupRetardos = retardosData.filter(r => {
      if (!esHoy(r.fecha, hoy)) return false;
      const alumno = r.alumno || alumnoMap[r.alumno_id];
      return (alumno?.id_grupo ?? 0) === idGrupo;
    });
    return {
      idGrupo,
      group: idGrupo ? (grupoMap[idGrupo] || `Grupo ${idGrupo}`) : 'Sin grupo',
      total: groupStudents.length,
      presentes: new Set(groupRegistros.filter(r => r.tipo_acceso === 'ENTRADA').map(r => r.alumno_id)).size,
      retardos: groupRetardos.length,
    };
  }).sort((a, b) => b.total - a.total);

  const unresolvedIncidents: Array<{id: number; tipo: string; alumno?: {nombre: string; apellido_paterno: string; apellido_materno: string}; fecha: string; gravedad: string}> = reportesData
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      tipo: r.motivo,
      alumno: r.alumno || alumnoMap[r.id_alumno] as Alumno | undefined,
      fecha: r.fecha,
      gravedad: obtenerGravedad(r),
    }));

  const currentTimeStr = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const currentDateStr = currentTime.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
          <div style={{ fontSize: 13, color: '#85787A', textTransform: 'capitalize' }}>{currentDateStr}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {stats.map(stat => {
          const pct = stat.total > 0 ? Math.round((stat.value / stat.total) * 100) : 0;
          return (
            <div key={stat.label} style={{
              background: '#fff', borderRadius: 12, padding: 20,
              border: '1px solid #CAC6C7', transition: 'transform 150ms',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: stat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <stat.icon size={20} color={stat.color} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#85787A' }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#5F5657', marginTop: 4 }}>{stat.label}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#F0EFEF', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: stat.color, borderRadius: 2, transition: 'width 400ms' }} />
              </div>
            </div>
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
              Actividad reciente
            </h2>
            <button
              onClick={() => navigate('/reportes')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                color: '#EB2466', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              }}
            >
              Ver reportes <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F0EFEF' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Hora</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Alumno</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>No. Control</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Grupo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Capacitacion</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((record, idx) => {
                  const cfg = tipoConfig[record.tipo] ?? { label: record.tipo, color: '#5F5657', bg: '#F0EFEF', icon: '?' };
                  return (
                    <tr
                      key={record.key}
                      style={{
                        borderBottom: '1px solid #F0EFEF',
                        background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEEBEE')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#FAFAFA')}
                    >
                      <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#1C1819' }}>
                        {record.hora}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1C1819' }}>
                        {record.alumno ? `${record.alumno.nombre} ${record.alumno.apellido_paterno} ${record.alumno.apellido_materno}`.trim() : 'Desconocido'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: '#5F5657' }}>
                        {record.alumno?.matricula ?? '---'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#5F5657' }}>
                        {record.alumno?.id_grupo ? (grupoMap[record.alumno.id_grupo] || `Grupo ${record.alumno.id_grupo}`) : '---'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#85787A' }}>
                        {record.alumno?.capacitacion ?? '---'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                          background: cfg.bg, color: cfg.color,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#85787A' }}>
                        {record.fecha}
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
              <div style={{ padding: 32, textAlign: 'center', color: '#85787A', fontSize: 14 }}>
                No hay grupos registrados
              </div>
            ) : attendanceByGroup.map(g => {
              const maxPresentes = Math.max(1, ...attendanceByGroup.map(x => x.total));
              const pct = g.total > 0 ? Math.round((g.presentes / g.total) * 100) : 0;
              return (
                <div key={g.group} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 50, fontSize: 13, fontWeight: 600, color: '#1C1819', textAlign: 'right' }}>{g.group}</span>
                  <div style={{ flex: 1, height: 20, background: '#F0EFEF', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(g.presentes / maxPresentes) * 100}%`, background: '#0F8122', height: '100%', transition: 'width 400ms' }} />
                    <div style={{ width: `${(g.retardos / maxPresentes) * 100}%`, background: '#1792AB', height: '100%', transition: 'width 400ms' }} />
                  </div>
                  <span style={{ width: 32, fontSize: 12, fontWeight: 600, color: '#5F5657', textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid #F0EFEF' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5657' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0F8122' }} /> Presentes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5657' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1792AB' }} /> Fuera de horario
            </span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1819', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={20} color="#EB2466" />
              Alertas
              {unresolvedIncidents.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: '50%', background: '#EB2466',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                }}>
                  {unresolvedIncidents.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => navigate('/reportes')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                color: '#EB2466', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              }}
            >
              Ver todas <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unresolvedIncidents.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#85787A', fontSize: 14 }}>
                No hay alertas pendientes
              </div>
            ) : (
              unresolvedIncidents.map(incident => {
                const isGrave = incident.gravedad === 'Grave';
                return (
                  <div
                    key={incident.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 8, border: '1px solid',
                      borderColor: isGrave ? '#FEEBEE' : '#F0EFEF',
                      background: isGrave ? '#FFF8F9' : '#fff',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isGrave ? '#EB2466' : '#1792AB',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1819', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {incident.tipo}
                      </div>
                      <div style={{ fontSize: 12, color: '#85787A' }}>
                        {incident.alumno ? `${incident.alumno.nombre} ${incident.alumno.apellido_paterno} ${incident.alumno.apellido_materno}`.trim() : '---'} &mdash; {incident.fecha}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: isGrave ? '#FEEBEE' : '#DCF5FF',
                      color: isGrave ? '#EB2466' : '#1792AB',
                    }}>
                      {incident.gravedad}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
