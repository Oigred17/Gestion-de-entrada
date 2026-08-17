import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, Check, Upload, X as XIcon, Loader2 } from 'lucide-react';
import { alumnosApi, incidenciasApi } from '../api';
import type { Alumno, Incidencia } from '../types';
import type { UserRole } from '../App';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '@/lib/toast';
import Loader from '../components/Loader';

const tipoOptions = ['Acceso sin credencial', 'Credencial dañada', 'Acceso fuera de horario', 'Alumno no registrado', 'Intento no autorizado', 'Salida sin credencial', 'Otro'];

interface IncidentsPageProps {
  role: UserRole;
}

export default function IncidentsPage({ role }: IncidentsPageProps) {
  const { user } = useAuth();
  const [apiAlumnos, setApiAlumnos] = useState<Alumno[]>([]);
  const [incidentsList, setIncidentsList] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<Incidencia | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const perPage = 8;

  const [formTipo, setFormTipo] = useState('');
  const [formAlumnoQuery, setFormAlumnoQuery] = useState('');
  const [formAlumnoSelected, setFormAlumnoSelected] = useState<Alumno | null>(null);
  const [showAlumnoDropdown, setShowAlumnoDropdown] = useState(false);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formNotificar, setFormNotificar] = useState(false);
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const registradoPor = role === 'Directivo' ? 'Directivo' : 'Prefectura';

  const tipoFilterOptions = Array.from(
    new Set([...tipoOptions, ...incidentsList.map(i => i.tipo)])
  );

  const nombreAlumno = (inc: Incidencia) =>
    inc.alumno
      ? `${inc.alumno.nombre} ${inc.alumno.apellido_paterno} ${inc.alumno.apellido_materno}`
      : `Alumno #${inc.id_alumno}`;

  const loadData = () => {
    setLoading(true);
    Promise.all([incidenciasApi.getAll(), alumnosApi.getAll()])
      .then(([i, a]) => {
        setIncidentsList(i);
        setApiAlumnos(a);
      })
      .catch(() => toastError('Error', 'No se pudieron cargar las incidencias'))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const alumnoResults = useMemo(() => {
    if (!formAlumnoQuery || formAlumnoSelected) return [];
    const q = formAlumnoQuery.toLowerCase();
    return apiAlumnos.filter(s =>
      `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno}`.toLowerCase().includes(q) ||
      s.matricula.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [formAlumnoQuery, formAlumnoSelected, apiAlumnos]);

  const filtered = incidentsList.filter((inc) => {
    const alumnoName = nombreAlumno(inc);
    const matchSearch = searchQuery === '' ||
      alumnoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.tipo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTipo = tipoFilter === '' || inc.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetForm = () => {
    setFormTipo('');
    setFormAlumnoQuery('');
    setFormAlumnoSelected(null);
    setShowAlumnoDropdown(false);
    setFormDescripcion('');
    setFormNotificar(false);
    setFormFoto(null);
    setFormErrors({});
  };
  const handleOpenModal = () => { resetForm(); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); resetForm(); };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formTipo) errors.tipo = 'Selecciona un tipo de incidencia';
    if (!formAlumnoSelected) errors.alumno = 'Selecciona un alumno del sistema';
    if (!formDescripcion.trim()) errors.descripcion = 'Escribe una descripción';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.id) {
      toastError('Sesion invalida', 'Vuelve a iniciar sesion');
      return;
    }
    setSaving(true);
    try {
      const evidencia = formFoto ? await fileToBase64(formFoto) : undefined;
      const nueva = await incidenciasApi.create({
        id_alumno: formAlumnoSelected!.id,
        tipo: formTipo,
        descripcion: formDescripcion.trim(),
        notificar: formNotificar,
        evidencia_base64: evidencia,
        id_usuario_registro: user.id,
      });
      setIncidentsList(prev => [nueva, ...prev]);
      handleCloseModal();
      toastSuccess('Incidencia registrada', `${formTipo} para ${nombreAlumno(nueva)}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError('No se pudo registrar', err.response?.data?.detail || 'Ocurrió un error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAlumno = (alumno: Alumno) => {
    setFormAlumnoSelected(alumno);
    setFormAlumnoQuery(`${alumno.nombre} ${alumno.apellido_paterno}`);
    setShowAlumnoDropdown(false);
    setFormErrors(prev => ({ ...prev, alumno: '' }));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) setFormFoto(file); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setFormFoto(file); };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-center">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input type="text" className="input input--search" placeholder="Buscar incidencia..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <select
            className="select"
            style={{ width: 220 }}
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos los tipos</option>
            {tipoFilterOptions.map(t => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn--primary" onClick={handleOpenModal}>
            <Plus size={18} /> Registrar incidencia
          </button>
        </div>
      </div>

      {loading ? (
        <Loader message="Cargando incidencias..." height={220} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Fecha y Hora</th><th>Tipo</th><th>Alumno</th><th>Descripción</th><th>Registrado por</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#5F5657' }}>No se encontraron incidencias.</td></tr>
              )}
              {paginated.map((inc, idx) => (
                <tr key={inc.id}>
                  <td>{(page - 1) * perPage + idx + 1}</td>
                  <td>
                    {inc.fecha_registro
                      ? new Date(inc.fecha_registro).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                      : '---'}
                  </td>
                  <td>{inc.tipo}</td>
                  <td style={{ fontWeight: 500 }}>{nombreAlumno(inc)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.descripcion}</td>
                  <td>{registradoPor}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="table-action" title="Ver detalles" onClick={() => setDetail(inc)}><Eye size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination">
        <span> Pagina {page} de {totalPages}</span>
        <div className="pagination-buttons">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&laquo;</button>
          <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>&raquo;</button>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Incidencia</h3>
              <button className="modal-close" onClick={handleCloseModal}><XIcon size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Tipo de incidencia *</label>
                <select className={`select ${formErrors.tipo ? 'input--error' : ''}`} value={formTipo} onChange={(e) => { setFormTipo(e.target.value); setFormErrors(prev => ({ ...prev, tipo: '' })); }}>
                  <option value="">Seleccionar tipo...</option>
                  {tipoOptions.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}
                </select>
                {formErrors.tipo && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{formErrors.tipo}</span>}
              </div>

              <div className="input-group" style={{ marginBottom: 16, position: 'relative' }}>
                <label className="field-label">Alumno *</label>
                <div className="input-wrapper">
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className={`input input--search ${formErrors.alumno ? 'input--error' : ''}`}
                    placeholder="Buscar por nombre o matrícula..."
                    value={formAlumnoQuery}
                    onChange={(e) => {
                      setFormAlumnoQuery(e.target.value);
                      setFormAlumnoSelected(null);
                      setShowAlumnoDropdown(true);
                      setFormErrors(prev => ({ ...prev, alumno: '' }));
                    }}
                    onFocus={() => { if (!formAlumnoSelected && formAlumnoQuery) setShowAlumnoDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowAlumnoDropdown(false), 200)}
                  />
                  {formAlumnoSelected && (
                    <button
                      onClick={() => { setFormAlumnoSelected(null); setFormAlumnoQuery(''); }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 2 }}
                    >
                      <XIcon size={16} />
                    </button>
                  )}
                </div>
                {showAlumnoDropdown && alumnoResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e0ddde',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 10,
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}>
                    {alumnoResults.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectAlumno(s)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0efef',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f7f7')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1819' }}>
                          {s.nombre} {s.apellido_paterno} {s.apellido_materno}
                        </div>
                        <div style={{ fontSize: 11, color: '#85787A' }}>{s.matricula}</div>
                      </div>
                    ))}
                  </div>
                )}
                {formAlumnoSelected && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: '#e8f5e9', borderRadius: 6, fontSize: 12, color: '#0F8122', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} />
                    {formAlumnoSelected.nombre} {formAlumnoSelected.apellido_paterno} ({formAlumnoSelected.matricula})
                  </div>
                )}
                {formErrors.alumno && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{formErrors.alumno}</span>}
              </div>

              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Descripción *</label>
                <textarea className={`textarea ${formErrors.descripcion ? 'input--error' : ''}`} rows={4} placeholder="Describe la incidencia..." value={formDescripcion} onChange={(e) => { setFormDescripcion(e.target.value); setFormErrors(prev => ({ ...prev, descripcion: '' })); }} />
                {formErrors.descripcion && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{formErrors.descripcion}</span>}
              </div>

              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Evidencia / Foto</label>
                <div className="upload-zone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => document.getElementById('file-input-hidden')?.click()}
                  style={{ border: '2px dashed #CAC6C7', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#F0EFEF' }}>
                  <input id="file-input-hidden" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
                  {formFoto ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span>{formFoto.name}</span>
                      <button className="table-action" onClick={(e) => { e.stopPropagation(); setFormFoto(null); }}><XIcon size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color="#85787A" />
                      <p style={{ fontSize: 14, color: '#5F5657', marginTop: 8 }}>Arrastra un archivo aqui o haz clic para seleccionar</p>
                      <span style={{ fontSize: 12, color: '#85787A' }}>JPG, PNG hasta 5MB</span>
                    </>
                  )}
                </div>
              </div>

              <label className="checkbox-group">
                <input type="checkbox" checked={formNotificar} onChange={(e) => setFormNotificar(e.target.checked)} />
                <span style={{ fontSize: 14 }}>Notificar a directivos</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={handleCloseModal}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={16} className="spin" style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                {saving ? 'Guardando...' : 'Guardar incidencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle de incidencia</h3>
              <button className="modal-close" onClick={() => setDetail(null)}><XIcon size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="field-label">Tipo</span>
                <div style={{ fontWeight: 500 }}>{detail.tipo}</div>
              </div>
              <div>
                <span className="field-label">Alumno</span>
                <div style={{ fontWeight: 500 }}>{nombreAlumno(detail)}</div>
              </div>
              <div>
                <span className="field-label">Fecha de registro</span>
                <div>
                  {detail.fecha_registro
                    ? new Date(detail.fecha_registro).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
                    : '---'}
                </div>
              </div>
              <div>
                <span className="field-label">Descripción</span>
                <div>{detail.descripcion}</div>
              </div>
              {detail.evidencia_base64 && (
                <div>
                  <span className="field-label">Evidencia</span>
                  <img src={detail.evidencia_base64} alt="Evidencia" style={{ width: '100%', borderRadius: 8, marginTop: 4 }} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
