import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, AlertTriangle, Plus, X, ArrowRight, GraduationCap, Users } from 'lucide-react';
import { ciclosApi } from '../api';
import type { CicloEscolar, CicloEscolarCreate, CicloTransicionResponse } from '../types';
import {
  parseCicloName,
  SEMESTRE_LABELS,
  fechasFromCicloName,
  cicloNameFromDate,
  semestreFromDate,
  sugerirSiguienteCiclo,
  validarOrdenCiclo,
  formatCicloPeriodo,
} from '@/lib/ciclos';
import { toastSuccess, toastError } from '@/lib/toast';
import Loader from '../components/Loader';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

export default function CiclosEscolaresPage() {
  const [ciclos, setCiclos] = useState<CicloEscolar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CicloEscolarCreate>({ nombre: '', fecha_inicio: '', fecha_fin: '' });
  const [showTransicionConfirm, setShowTransicionConfirm] = useState(false);
  const [transicionando, setTransicionando] = useState(false);
  const [transicionResult, setTransicionResult] = useState<CicloTransicionResponse | null>(null);

  const loadCiclos = async () => {
    setLoading(true);
    try {
      const data = await ciclosApi.getAll();
      setCiclos(data);
    } catch {
      toastError('No se pudieron cargar los ciclos escolares.');
    } finally {
      setLoading(false);
    }
  };

  const syncActivo = async () => {
    try {
      await ciclosApi.sincronizarActivo();
      await loadCiclos();
    } catch {
      /* no hay ciclo activo por ahora — está bien */
    }
  };

  useEffect(() => {
    loadCiclos().then(() => syncActivo());
  }, []);

  const cicloActivo = ciclos.find((c) => c.estatus === 'Activo');
  const cicloActual = cicloNameFromDate();
  const parsedForm = parseCicloName(form.nombre);

  const cicloSiguienteNombre = useMemo(() => {
    if (!cicloActivo) return null;
    return sugerirSiguienteCiclo([cicloActivo.nombre]);
  }, [cicloActivo]);

  const cicloSiguiente = useMemo(() => {
    if (!cicloSiguienteNombre) return null;
    return ciclos.find((c) => c.nombre.toUpperCase() === cicloSiguienteNombre.toUpperCase()) ?? null;
  }, [ciclos, cicloSiguienteNombre]);

  const fechasPreview = useMemo(() => {
    if (!parsedForm) return null;
    return fechasFromCicloName(form.nombre);
  }, [form.nombre, parsedForm]);

  const toFormFechas = (nombre: string) => {
    const { inicio, fin } = fechasFromCicloName(nombre);
    return { fecha_inicio: inicio, fecha_fin: fin };
  };

  const ensureCiclo = async (nombre: string): Promise<CicloEscolar> => {
    const existente = ciclos.find((c) => c.nombre.toUpperCase() === nombre.toUpperCase());
    if (existente) return existente;
    const { inicio, fin } = fechasFromCicloName(nombre);
    const creado = await ciclosApi.create({
      nombre,
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    return creado;
  };

  const openCreateModal = () => {
    const nombres = ciclos.map((c) => c.nombre);
    const sugerido = sugerirSiguienteCiclo(nombres);
    setForm({ nombre: sugerido, ...toFormFechas(sugerido) });
    setShowCreateModal(true);
  };

  const handleNombreChange = (nombre: string) => {
    const upper = nombre.toUpperCase();
    const parsed = parseCicloName(upper);
    if (parsed) {
      setForm({ nombre: upper, ...toFormFechas(upper) });
    } else {
      setForm((prev) => ({ ...prev, nombre: upper }));
    }
  };

  const handleCreate = async () => {
    if (!form.nombre.trim()) {
      toastError('Ingrese el nombre del ciclo.');
      return;
    }
    const ordenError = validarOrdenCiclo(
      form.nombre,
      ciclos.map((c) => c.nombre),
    );
    if (ordenError) {
      toastError(ordenError);
      return;
    }
    if (!parsedForm || !fechasPreview) {
      toastError('Formato inválido. Use AAAA + A o B (ej: 2026B).');
      return;
    }
    setCreating(true);
    try {
      await ciclosApi.create({
        nombre: form.nombre,
        fecha_inicio: fechasPreview.inicio,
        fecha_fin: fechasPreview.fin,
      });
      toastSuccess('Ciclo creado correctamente.');
      setShowCreateModal(false);
      setForm({ nombre: '', fecha_inicio: '', fecha_fin: '' });
      await loadCiclos();
      await syncActivo();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo crear el ciclo.');
    } finally {
      setCreating(false);
    }
  };

  const ejecutarTransicion = async () => {
    if (!cicloActivo || !cicloSiguienteNombre) return;
    setTransicionando(true);
    try {
      const cicloDestino = await ensureCiclo(cicloSiguienteNombre);
      const resultado = await ciclosApi.activarConTransicion(cicloDestino.id);
      setTransicionResult(resultado);
      toastSuccess(
        'Transición completada',
        `${resultado.alumnos_migrados} grupo(s) migrado(s), ${resultado.alumnos_graduados} egresado(s).`,
      );
      await loadCiclos();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo ejecutar la transición.');
    } finally {
      setTransicionando(false);
    }
  };

  const transicionMessage = cicloActivo && cicloSiguienteNombre
    ? `Está a punto de iniciar la transición de semestre de ${cicloActivo.nombre} → ${cicloSiguienteNombre}.

• Grupos 1°–5° semestre (101–599): avanzan +100 (ej. 501 → 601).
• Grupos 6° semestre (600+): los alumnos egresan; no se crea grupo 700.
• Se desactivan las credenciales de los egresados.
• ${cicloActivo.nombre} quedará inactivo y ${cicloSiguienteNombre} será el ciclo activo.

Esta acción no se puede deshacer.`
    : '';

  if (loading) return <Loader message="Cargando ciclos escolares..." height={220} />;

  return (
    <div>
      <p className="page-lead">
        Semestres automáticos: <strong>A</strong> ({SEMESTRE_LABELS.A}) · <strong>B</strong> ({SEMESTRE_LABELS.B}).
        El ciclo activo se detecta según la fecha de hoy.
      </p>

      <div className="toolbar" style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cicloActivo && cicloSiguienteNombre && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowTransicionConfirm(true)}
              disabled={transicionando}
              title={`Migrar alumnos a ${cicloSiguienteNombre} y egresar 6° semestre`}
            >
              <ArrowRight size={16} />
              {transicionando ? 'Transicionando...' : 'Iniciar transición de semestre'}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={openCreateModal}>
            <Plus size={16} /> Agregar ciclo
          </button>
        </div>
      </div>

      {cicloActivo ? (
        <div style={{
          padding: '16px 20px', background: '#F0FDF4', marginBottom: 20,
          border: '1px solid #0F8122', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#0F8122',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Check size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#5F5657' }}>Ciclo activo (automático)</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{cicloActivo.nombre}</div>
              <div style={{ fontSize: 13, color: '#5F5657' }}>
                {formatCicloPeriodo(cicloActivo.nombre)} · {cicloActivo.fecha_inicio} — {cicloActivo.fecha_fin}
              </div>
              {cicloSiguienteNombre && (
                <div style={{ fontSize: 12, color: '#5F5657', marginTop: 4 }}>
                  Siguiente transición: <strong>{cicloActivo.nombre}</strong>
                  {' → '}
                  <strong>{cicloSiguienteNombre}</strong>
                  {!cicloSiguiente && ' (se creará automáticamente)'}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 20px', background: '#FEF9E7', marginBottom: 20,
          border: '1px solid #CA8A04', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} color="#CA8A04" />
          <div style={{ fontSize: 13, color: '#5F5657' }}>
            Ningún ciclo activo. El semestre actual es <strong>{cicloActual}</strong> ({SEMESTRE_LABELS[semestreFromDate()]}).
            Agregue ese ciclo con el botón de arriba.
          </div>
        </div>
      )}

      <div style={{
        padding: '12px 16px', background: '#F8F7F7', border: '1px solid #E8E6E6',
        marginBottom: 20, fontSize: 13, color: '#5F5657', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#1C1819' }}>Transición de semestre:</strong>{' '}
        al iniciarla, cada grupo sube de semestre (+100 en la clave).
        Los alumnos en <strong>6° semestre (grupos 600+)</strong> egresan en lugar de pasar a 700.
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ciclo</th>
              <th>Año</th>
              <th>Periodo</th>
              <th>Fecha inicio</th>
              <th>Fecha fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((ciclo, i) => {
              const parsed = parseCicloName(ciclo.nombre);
              return (
                <tr key={ciclo.id} style={ciclo.estatus === 'Activo' ? { background: '#F0FDF4' } : undefined}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>{ciclo.nombre}</td>
                  <td>{parsed ? parsed.year : '—'}</td>
                  <td>
                    {parsed ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          display: 'inline-block', width: 28, height: 28,
                          background: parsed.semestre === 'A' ? '#E0F2FE' : '#FEEBEE',
                          color: parsed.semestre === 'A' ? '#0369A1' : '#EB2466',
                          fontWeight: 700, fontSize: 14, textAlign: 'center', lineHeight: '28px',
                        }}>{parsed.semestre}</span>
                        <span style={{ fontSize: 12, color: '#5F5657' }}>{SEMESTRE_LABELS[parsed.semestre]}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{ciclo.fecha_inicio}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{ciclo.fecha_fin}</td>
                  <td>
                    <span className={`badge ${ciclo.estatus === 'Activo' ? 'badge--active' : 'badge--inactive'}`}>
                      {ciclo.estatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {ciclos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#85787A' }}>
                  No hay ciclos escolares. Haga clic en &quot;Agregar ciclo&quot; para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#fff', padding: 32, width: 440, maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1819', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} color="#EB2466" />
                Agregar ciclo escolar
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="ciclo-nombre">Nombre del ciclo</label>
                <input
                  id="ciclo-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej: 2026B"
                  className="input"
                  maxLength={5}
                  autoFocus
                />
                {parsedForm && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#0F8122' }}>
                    Semestre {parsedForm.semestre} · {formatCicloPeriodo(form.nombre)}
                  </div>
                )}
                {form.nombre && !parsedForm && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#EB2466' }}>
                    Formato: AAAA + A o B (ej: 2026B)
                  </div>
                )}
              </div>

              {fechasPreview && (
                <div style={{
                  padding: '12px 16px', background: '#F8F7F7', border: '1px solid #E8E6E6',
                  fontSize: 13, color: '#5F5657',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#1C1819' }}>Fechas calculadas automáticamente</div>
                  <div>Inicio: <strong>{fechasPreview.inicio}</strong></div>
                  <div>Fin: <strong>{fechasPreview.fin}</strong></div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button type="button" className="btn btn--outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={creating || !parsedForm}>
                {creating ? 'Creando...' : 'Crear ciclo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPasswordModal
        open={showTransicionConfirm}
        title="Iniciar transición de semestre"
        message={transicionMessage}
        confirmLabel="Iniciar transición"
        onClose={() => setShowTransicionConfirm(false)}
        onConfirm={ejecutarTransicion}
      />

      {transicionResult && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
          }}
          onClick={() => setTransicionResult(null)}
        >
          <div
            style={{
              background: '#fff', padding: 32, width: 520, maxWidth: '92vw', maxHeight: '85vh',
              overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F8122', margin: 0 }}>
                Transición completada
              </h2>
              <button
                type="button"
                onClick={() => setTransicionResult(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 14, background: '#F0FDF4', border: '1px solid #0F8122' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Users size={16} color="#0F8122" />
                  <span style={{ fontSize: 12, color: '#5F5657' }}>Grupos migrados</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F8122' }}>{transicionResult.alumnos_migrados}</div>
                <div style={{ fontSize: 12, color: '#5F5657' }}>{transicionResult.grupos_creados} grupo(s) nuevo(s)</div>
              </div>
              <div style={{ padding: 14, background: '#FEEBEE', border: '1px solid #EB2466' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <GraduationCap size={16} color="#AB1748" />
                  <span style={{ fontSize: 12, color: '#5F5657' }}>Egresados (6° sem.)</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#AB1748' }}>{transicionResult.alumnos_graduados}</div>
                <div style={{ fontSize: 12, color: '#5F5657' }}>
                  {transicionResult.credenciales_desactivadas} credencial(es) desactivada(s)
                </div>
              </div>
            </div>

            {transicionResult.alumnos_graduados_detalle.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1C1819' }}>
                  Alumnos que egresaron
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#5F5657', lineHeight: 1.8 }}>
                  {transicionResult.alumnos_graduados_detalle.map((a) => (
                    <li key={a.id_alumno}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.matricula}</span>
                      {' — '}
                      {a.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {transicionResult.grupos_nuevos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1C1819' }}>
                  Grupos creados
                </div>
                <div style={{ fontSize: 13, color: '#5F5657', lineHeight: 1.8 }}>
                  {transicionResult.grupos_nuevos.map((g) => (
                    <div key={g.id_nuevo}>
                      {g.clave_anterior} → <strong>{g.clave_nueva}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--primary" onClick={() => setTransicionResult(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
