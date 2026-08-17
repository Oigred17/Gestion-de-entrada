import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, X, Pencil, Trash2 } from 'lucide-react';
import { alumnosApi, reportesApi } from '../api';
import type { Reporte, Alumno } from '../types';
import type { UserRole } from '../App';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '@/lib/toast';
import Loader from '../components/Loader';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

interface DeleteConfirm {
  title: string;
  message: string;
  run: () => Promise<void>;
}

export default function RegulationsPage({ role }: { role: UserRole }) {
  const { user } = useAuth();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reporte | null>(null);
  const [detailModal, setDetailModal] = useState<Reporte | null>(null);
  const [confirm, setConfirm] = useState<DeleteConfirm | null>(null);

  const [formAlumnoQuery, setFormAlumnoQuery] = useState('');
  const [formAlumnoSelected, setFormAlumnoSelected] = useState<Alumno | null>(null);
  const [formMotivo, setFormMotivo] = useState('');
  const [formSancion, setFormSancion] = useState('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      reportesApi.getAll(),
      alumnosApi.getAll(),
    ]).then(([r, a]) => {
      setReportes(r);
      setAlumnos(a);
    }).catch(() => {
      toastError('Error', 'No se pudieron cargar los reportes');
    }).finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const alumnoResults = useMemo(() => {
    if (!formAlumnoQuery || formAlumnoSelected) return [];
    const q = formAlumnoQuery.toLowerCase();
    return alumnos.filter(a =>
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`.toLowerCase().includes(q) ||
      a.matricula.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [formAlumnoQuery, formAlumnoSelected, alumnos]);

  const filtered = useMemo(() => {
    if (!searchQuery) return reportes;
    const q = searchQuery.toLowerCase();
    return reportes.filter(r =>
      r.motivo.toLowerCase().includes(q) ||
      r.sancion.toLowerCase().includes(q) ||
      (r.alumno && `${r.alumno.nombre} ${r.alumno.apellido_paterno}`.toLowerCase().includes(q))
    );
  }, [searchQuery, reportes]);

  const nombreAlumno = (r: Reporte) =>
    r.alumno ? `${r.alumno.nombre} ${r.alumno.apellido_paterno} ${r.alumno.apellido_materno}` : `Alumno #${r.id_alumno}`;

  const handleCreate = async () => {
    if (!formAlumnoSelected || !formMotivo || !formSancion) {
      toastError('Faltan datos', 'Selecciona un alumno y completa motivo y sanción');
      return;
    }
    setSaving(true);
    try {
      const nuevo = await reportesApi.create({
        id_alumno: formAlumnoSelected.id,
        id_prefecto: user?.id ?? 1,
        motivo: formMotivo,
        sancion: formSancion,
        fecha: formFecha,
      });
      setReportes([nuevo, ...reportes]);
      setModalOpen(false);
      resetForm();
      toastSuccess('Falta registrada', `Falta registrada para ${nombreAlumno(nuevo)}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError('No se pudo registrar', err.response?.data?.detail || 'Ocurrió un error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: Reporte) => {
    setEditing(r);
    setFormMotivo(r.motivo);
    setFormSancion(r.sancion);
    setFormFecha(r.fecha);
    const a = alumnos.find(x => x.id === r.id_alumno);
    if (a) {
      setFormAlumnoSelected(a);
      setFormAlumnoQuery('');
    }
    setModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editing || !formMotivo || !formSancion) {
      toastError('Faltan datos', 'Completa motivo y sanción');
      return;
    }
    setSaving(true);
    try {
      const updated = await reportesApi.update(editing.id, {
        motivo: formMotivo,
        sancion: formSancion,
      });
      setReportes(prev => prev.map(r => (r.id === editing.id ? updated : r)));
      setModalOpen(false);
      resetForm();
      setEditing(null);
      toastSuccess('Falta actualizada');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError('No se pudo actualizar', err.response?.data?.detail || 'Ocurrió un error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCumplida = async (r: Reporte) => {
    try {
      const updated = await reportesApi.update(r.id, { sancion_cumplida: !r.sancion_cumplida });
      setReportes(prev => prev.map(x => (x.id === r.id ? updated : x)));
      toastSuccess(
        updated.sancion_cumplida ? 'Sanción marcada como cumplida' : 'Sanción marcada como pendiente'
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError('No se pudo actualizar', err.response?.data?.detail || 'Ocurrió un error');
    }
  };

  const sancionToggle = (cumplida: boolean) => (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: cumplida ? '#0F8122' : '#CAC6C7',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 200ms',
        display: 'inline-block',
      }}
      role="switch"
      aria-checked={cumplida}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#FFFFFF',
        position: 'absolute',
        top: 2,
        left: cumplida ? 20 : 2,
        transition: 'left 200ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  const handleDelete = (r: Reporte) => {
    setConfirm({
      title: 'Eliminar falta',
      message: `¿Seguro que deseas eliminar la falta de ${nombreAlumno(r)}? Esta acción no se puede deshacer. Ingrese su contraseña para confirmar.`,
      run: async () => {
        try {
          await reportesApi.delete(r.id);
          setReportes(prev => prev.filter(x => x.id !== r.id));
          toastSuccess('Falta eliminada');
        } catch (e: unknown) {
          const err = e as { response?: { data?: { detail?: string } } };
          toastError('No se pudo eliminar', err.response?.data?.detail || 'Ocurrió un error');
        }
      },
    });
  };

  const resetForm = () => {
    setFormAlumnoQuery('');
    setFormAlumnoSelected(null);
    setFormMotivo('');
    setFormSancion('');
    setFormFecha(new Date().toISOString().slice(0, 10));
    setEditing(null);
  };

  const openModal = () => {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-center">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input type="text" className="input input--search" placeholder="Buscar por motivo, sanción o alumno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn--primary" onClick={openModal}>
            <Plus size={18} /> Nueva falta
          </button>
        </div>
      </div>

      {loading ? (
        <Loader message="Cargando reportes..." height={220} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Alumno</th><th>Matrícula</th><th>Motivo</th><th>Sanción</th><th>Cumplida</th><th>Fecha</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{nombreAlumno(r)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.alumno?.matricula ?? '---'}</td>
                  <td>{r.motivo}</td>
                  <td>{r.sancion}</td>
                  <td>
                    <div onClick={() => handleToggleCumplida(r)} title={r.sancion_cumplida ? 'Marcar pendiente' : 'Marcar cumplida'}>
                      {sancionToggle(r.sancion_cumplida)}
                    </div>
                  </td>
                  <td>{r.fecha}</td>
                  <td>
                    <button className="table-action" title="Ver detalle" onClick={() => setDetailModal(r)}>
                      <Eye size={18} />
                    </button>
                    <button className="table-action" title="Editar" onClick={() => handleEdit(r)}>
                      <Pencil size={18} />
                    </button>
                    <button className="table-action" title="Eliminar" onClick={() => handleDelete(r)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#85787A' }}>No hay reportes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => { setModalOpen(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Editar falta al reglamento' : 'Registrar falta al reglamento'}</h3>
              <button className="modal-close" onClick={() => { setModalOpen(false); resetForm(); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">Alumno</label>
                <input
                  className="input"
                  placeholder="Buscar alumno por nombre o matrícula..."
                  value={formAlumnoSelected ? `${formAlumnoSelected.nombre} ${formAlumnoSelected.apellido_paterno} - ${formAlumnoSelected.matricula}` : formAlumnoQuery}
                  onChange={(e) => { setFormAlumnoQuery(e.target.value); setFormAlumnoSelected(null); }}
                  disabled={!!editing}
                />
                {alumnoResults.length > 0 && (
                  <div style={{ border: '1px solid #ddd', borderRadius: 6, marginTop: 4, maxHeight: 180, overflow: 'auto' }}>
                    {alumnoResults.map(a => (
                      <div key={a.id} className="dropdown-item" onClick={() => { setFormAlumnoSelected(a); setFormAlumnoQuery(''); }}
                        style={{ padding: '8px 12', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontWeight: 500 }}>{a.nombre} {a.apellido_paterno} {a.apellido_materno}</div>
                        <div style={{ fontSize: 12, color: '#85787A' }}>{a.matricula}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="field-label">Fecha</label>
                <input type="date" className="input" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Motivo</label>
                <textarea className="input" rows={3} value={formMotivo} onChange={(e) => setFormMotivo(e.target.value)} placeholder="Describe la falta..." />
              </div>
              <div>
                <label className="field-label">Sanción</label>
                <textarea className="input" rows={3} value={formSancion} onChange={(e) => setFormSancion(e.target.value)} placeholder="Describe la sanción..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
              <button
                className="btn btn--primary"
                onClick={editing ? handleSaveEdit : handleCreate}
                disabled={saving || (!editing && (!formAlumnoSelected || !formMotivo || !formSancion))}
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar falta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="modal-backdrop" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle de falta</h3>
              <button className="modal-close" onClick={() => setDetailModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Alumno</span>
                <div style={{ fontWeight: 500 }}>{nombreAlumno(detailModal)}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Matrícula</span>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{detailModal.alumno?.matricula ?? '---'}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Fecha</span>
                <div>{detailModal.fecha}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Motivo</span>
                <div>{detailModal.motivo}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Sanción</span>
                <div>{detailModal.sancion}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Sanción cumplida</span>
                <div style={{ fontWeight: 500, color: detailModal.sancion_cumplida ? '#0F8122' : '#5F5657' }}>
                  {detailModal.sancion_cumplida ? 'Si' : 'No'}
                </div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Registrado por</span>
                <div>{detailModal.prefecto?.nombre_completo ?? (role === 'Directivo' ? 'Directivo' : 'Prefectura')}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--primary" onClick={() => setDetailModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPasswordModal
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel="Eliminar"
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.run ?? (() => {})}
      />
    </div>
  );
}
