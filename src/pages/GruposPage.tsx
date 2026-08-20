import { useState, useEffect } from 'react';
import {
  Search, Users, Building2, Calendar, BookOpen, ChevronDown,
} from 'lucide-react';
import { alumnosApi } from '../api/alumnos';
import { registrosApi } from '../api/registros';
import { credencialesApi } from '../api/credenciales';
import { gruposApi, ciclosApi } from '../api';
import type { Alumno, CicloEscolar, Credencial, Grupo, RegistroAcceso } from '../types';
import { normalizeText } from '../lib/normalizeText';
import Loader from '../components/Loader';

interface GrupoCard {
  grupo: string;
  claveGrupo?: number;
  semestre?: number;
  cicloNombre?: string;
  total: number;
  activos: number;
  inactivos: number;
  credencialesTotal: number;
  credencialesActivas: number;
  alumnos: Alumno[];
  registros: number;
  entradas: number;
}

export default function GruposPage() {
  const [search, setSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [alumnosData, setAlumnosData] = useState<Alumno[]>([]);
  const [credencialesData, setCredencialesData] = useState<Credencial[]>([]);
  const [registrosData, setRegistrosData] = useState<RegistroAcceso[]>([]);
  const [gruposData, setGruposData] = useState<Grupo[]>([]);
  const [cicloActivo, setCicloActivo] = useState<CicloEscolar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [al, cr, rg, gr, ciclos] = await Promise.all([
          alumnosApi.getAll(),
          credencialesApi.getAll(),
          registrosApi.getAll(),
          gruposApi.getAll(),
          ciclosApi.getAll(),
        ]);
        setAlumnosData(al);
        setCredencialesData(cr);
        setRegistrosData(rg);
        setGruposData(gr);
        const activo = ciclos.find(c => c.estatus === 'Activo');
        setCicloActivo(activo ?? null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('No se pudo conectar con el servidor. Revisa que el backend este corriendo.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getGrupoName = (id_grupo?: number | null): string => {
    if (!id_grupo) return 'Sin grupo';
    const found = gruposData.find(g => g.id === id_grupo);
    return found ? found.nombre : String(id_grupo);
  };

  const hoy = new Date().toISOString().slice(0, 10);

  const gruposDelCiclo = cicloActivo
    ? gruposData.filter(g => g.ciclo_escolar_id === cicloActivo.id)
    : gruposData;

  const grupoCards: GrupoCard[] = Array.from(
    new Set([
      ...gruposDelCiclo.map(g => g.nombre),
      ...alumnosData
        .filter(s => s.id_grupo && gruposDelCiclo.some(g => g.id === s.id_grupo))
        .map(s => getGrupoName(s.id_grupo)),
    ])
  )
    .sort()
    .map(grupo => {
      const gObj = gruposDelCiclo.find(g => g.nombre === grupo);
      const groupStudents = alumnosData.filter(s => getGrupoName(s.id_grupo) === grupo && s.id_grupo && gruposDelCiclo.some(g => g.id === s.id_grupo));
      const activos = groupStudents.filter(s => (s.estatus ?? 'Activo').toLowerCase() === 'activo').length;
      const groupCreds = credencialesData.filter(c =>
        groupStudents.some(s => s.id === c.alumno_id)
      );
      const activas = groupCreds.filter(c => c.estatus === 'ACTIVA').length;
      const records = registrosData.filter(r =>
        groupStudents.some(s => s.id === r.alumno_id)
      );
      const entradas = records.filter(r => r.tipo_acceso === 'ENTRADA').length;
      return {
        grupo,
        claveGrupo: gObj?.clave_grupo,
        semestre: gObj?.semestre,
        cicloNombre: cicloActivo?.nombre,
        total: groupStudents.length,
        activos,
        inactivos: groupStudents.length - activos,
        credencialesTotal: groupCreds.length,
        credencialesActivas: activas,
        alumnos: groupStudents,
        registros: records.length,
        entradas,
      };
    });

  const filtered = grupoCards.filter(g => {
    if (!search) return true;
    const q = normalizeText(search);
    return normalizeText(g.grupo).includes(q) ||
      (g.semestre && String(g.semestre).includes(q));
  });

  const toggleGroup = (grupo: string) => {
    setExpandedGroup(prev => prev === grupo ? null : grupo);
  };

  if (loading) {
    return <Loader message="Cargando datos..." height={200} />;
  }

  if (error) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #FEEBEE',
        padding: 40, textAlign: 'center', color: '#5F5657', fontSize: 15,
      }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total grupos', value: grupoCards.length, color: '#EB2466', bg: '#FEEBEE', icon: Building2 },
          { label: 'Total alumnos', value: grupoCards.reduce((sum, g) => sum + g.total, 0), color: '#0F8122', bg: '#E8F5E9', icon: Users },
          { label: 'Credenciales activas', value: credencialesData.filter(c => c.estatus === 'ACTIVA' && gruposDelCiclo.some(g => g.id && alumnosData.some(a => a.id === c.alumno_id && a.id_grupo === g.id))).length, color: '#1792AB', bg: '#DCF5FF', icon: BookOpen },
          { label: 'Registros hoy', value: registrosData.filter(r => r.fecha_hora.startsWith(hoy)).length, color: '#5F5657', bg: '#F0EFEF', icon: Calendar },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: 12, padding: 20,
            border: '1px solid #CAC6C7', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: stat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#85787A', marginTop: 2 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CAC6C7' }} />
        <input
          type="text"
          placeholder="Buscar por grupo o semestre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 40px',
            border: '1px solid #CAC6C7', borderRadius: 8, fontSize: 14,
            fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7',
            padding: 48, textAlign: 'center', color: '#85787A', fontSize: 15,
          }}>
            No se encontraron grupos
          </div>
        ) : (
          filtered.map(g => {
            const isExpanded = expandedGroup === g.grupo;
            return (
              <div key={g.grupo} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #CAC6C7',
                overflow: 'hidden', transition: 'border-color 150ms',
              }}>
                <button
                  onClick={() => toggleGroup(g.grupo)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: isExpanded ? '#FEEBEE' : '#fff',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 150ms', fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `linear-gradient(135deg, #EB2466, #AB1748)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 800,
                  }}>
                    {g.grupo}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1819' }}>
                      {g.grupo === 'Sin grupo' ? 'Sin grupo' : `Grupo ${g.grupo}`}
                    </div>
                    {g.semestre && (
                      <div style={{ fontSize: 12, color: '#85787A', marginTop: 1 }}>
                        {g.semestre}° semestre
                        {cicloActivo && (
                          <span style={{ marginLeft: 6, color: '#5F5657' }}>
                            · {cicloActivo.nombre}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0F8122' }}>{g.activos}</div>
                      <div style={{ fontSize: 11, color: '#85787A' }}>Activos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#EB2466' }}>{g.inactivos}</div>
                      <div style={{ fontSize: 11, color: '#85787A' }}>Baja</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1792AB' }}>{g.credencialesActivas}/{g.credencialesTotal}</div>
                      <div style={{ fontSize: 11, color: '#85787A' }}>Credenciales</div>
                    </div>
                    <ChevronDown
                      size={20}
                      color="#5F5657"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 200ms',
                      }}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F0EFEF', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F0EFEF' }}>
                          <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Alumno</th>
                          <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Matricula</th>
                          <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Estado</th>
                          <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5F5657' }}>Credencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.alumnos.map((s, idx) => {
                          const cred = credencialesData.find(c => c.alumno_id === s.id);
                          return (
                            <tr
                              key={s.id}
                              style={{
                                borderBottom: '1px solid #F0EFEF',
                                background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                              }}
                            >
                              <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#1C1819' }}>
                                {s.nombre} {s.apellido_paterno} {s.apellido_materno}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: '#5F5657' }}>
                                {s.matricula}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                  background: (s.estatus ?? 'Activo').toLowerCase() === 'activo' ? '#E8F5E9' : '#FEEBEE',
                                  color: (s.estatus ?? 'Activo').toLowerCase() === 'activo' ? '#0F8122' : '#EB2466',
                                }}>
                                  {(s.estatus ?? 'Activo').toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {cred ? (
                                  <span style={{
                                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                    background: cred.estatus === 'ACTIVA' ? '#E8F5E9' : '#FEEBEE',
                                    color: cred.estatus === 'ACTIVA' ? '#0F8122' : '#EB2466',
                                  }}>
                                    {cred.estatus === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#85787A' }}>Sin credencial</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
