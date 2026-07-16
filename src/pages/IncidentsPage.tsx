import { useState, useMemo } from 'react';
import { Search, Plus, Eye, Check, AlertTriangle, Upload, X as XIcon } from 'lucide-react';
import { incidents as mockIncidents, students, type Incident, type Student } from '../data/mockData';

const tipoOptions = ['Todas', 'Acceso sin credencial', 'Credencial danada', 'Acceso fuera de horario', 'Alumno no registrado', 'Intento no autorizado', 'Salida sin credencial', 'Otro'];
const tipoOptionsSinTodas = tipoOptions.filter(t => t !== 'Todas');
const gravedadOptions = ['Leve', 'Moderada', 'Grave'];

export default function IncidentsPage() {
  const [incidentsList, setIncidentsList] = useState<Incident[]>(mockIncidents);
  const [activeTab, setActiveTab] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const [formTipo, setFormTipo] = useState('');
  const [formAlumnoQuery, setFormAlumnoQuery] = useState('');
  const [formAlumnoSelected, setFormAlumnoSelected] = useState<Student | null>(null);
  const [showAlumnoDropdown, setShowAlumnoDropdown] = useState(false);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formGravedad, setFormGravedad] = useState('');
  const [formNotificar, setFormNotificar] = useState(false);
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const alumnoResults = useMemo(() => {
    if (!formAlumnoQuery || formAlumnoSelected) return [];
    const q = formAlumnoQuery.toLowerCase();
    return students.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.numControl.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [formAlumnoQuery, formAlumnoSelected]);

  const filtered = incidentsList.filter((inc) => {
    const matchTab = activeTab === 'Todas' || inc.tipo === activeTab;
    const alumnoName = inc.alumno?.nombre ?? '';
    const matchSearch = searchQuery === '' ||
      alumnoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.tipo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const graveAbiertas = incidentsList.filter((inc) => inc.gravedad === 'Grave' && inc.estado === 'Abierto');

  const resetForm = () => {
    setFormTipo('');
    setFormAlumnoQuery('');
    setFormAlumnoSelected(null);
    setShowAlumnoDropdown(false);
    setFormDescripcion('');
    setFormGravedad('');
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
    if (!formDescripcion.trim()) errors.descripcion = 'Escribe una descripcion';
    if (!formGravedad) errors.gravedad = 'Selecciona la gravedad';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const newIncident: Incident = {
      id: Date.now(),
      fecha: new Date().toLocaleString('es-MX'),
      tipo: formTipo,
      alumno: formAlumnoSelected!,
      descripcion: formDescripcion,
      registradoPor: 'Sistema',
      estado: 'Abierto',
      gravedad: formGravedad as Incident['gravedad'],
    };
    setIncidentsList((prev) => [newIncident, ...prev]);
    handleCloseModal();
  };

  const handleSelectAlumno = (student: Student) => {
    setFormAlumnoSelected(student);
    setFormAlumnoQuery(student.nombre);
    setShowAlumnoDropdown(false);
    setFormErrors(prev => ({ ...prev, alumno: '' }));
  };

  const handleClearAlumno = () => {
    setFormAlumnoSelected(null);
    setFormAlumnoQuery('');
    setFormErrors(prev => ({ ...prev, alumno: 'Selecciona un alumno del sistema' }));
  };

  const handleMarkResolved = (id: number) => {
    setIncidentsList(prev => prev.map(inc =>
      inc.id === id ? { ...inc, estado: 'Resuelto' as const } : inc
    ));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) setFormFoto(file); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setFormFoto(file); };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Abierto': return 'badge badge--alert';
      case 'En revision': return 'badge badge--pending';
      case 'Resuelto': return 'badge badge--active';
      default: return 'badge badge--inactive';
    }
  };

  return (
    <div>
      {graveAbiertas.length > 0 && (
        <div className="alert alert--error" style={{ marginBottom: 16 }}>
          <AlertTriangle size={20} />
          <span>Hay {graveAbiertas.length} incidencia(s) grave(s) abierta(s) que requieren atencion inmediata.</span>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-center">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input type="text" className="input input--search" placeholder="Buscar incidencia..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn--primary" onClick={handleOpenModal}>
            <Plus size={18} /> Registrar incidencia
          </button>
        </div>
      </div>

      <div className="filter-tabs" style={{ padding: '12px 0' }}>
        {tipoOptions.map((tipo) => (
          <button key={tipo} className={`filter-tab ${activeTab === tipo ? 'active' : ''}`} onClick={() => { setActiveTab(tipo); setPage(1); }}>
            {tipo}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Fecha y Hora</th><th>Tipo</th><th>Alumno</th><th>Descripcion</th><th>Registrado por</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#5F5657' }}>No se encontraron incidencias.</td></tr>
            )}
            {paginated.map((inc, idx) => (
              <tr key={inc.id}>
                <td>{(page - 1) * perPage + idx + 1}</td>
                <td>{inc.fecha}</td>
                <td>{inc.tipo}</td>
                <td style={{ fontWeight: 500 }}>{inc.alumno?.nombre ?? '---'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.descripcion}</td>
                <td>{inc.registradoPor}</td>
                <td><span className={getEstadoBadge(inc.estado)}>{inc.estado}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="table-action" title="Ver detalles"><Eye size={18} /></button>
                    {inc.estado !== 'Resuelto' && (
                      <button className="table-action" title="Marcar como resuelta" onClick={() => handleMarkResolved(inc.id)}><Check size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  {tipoOptionsSinTodas.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}
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
                    placeholder="Buscar por nombre o matricula..."
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
                      onClick={handleClearAlumno}
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
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1819' }}>{s.nombre}</div>
                        <div style={{ fontSize: 11, color: '#85787A' }}>{s.numControl} · Grupo {s.grupo}</div>
                      </div>
                    ))}
                  </div>
                )}
                {formAlumnoSelected && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: '#e8f5e9', borderRadius: 6, fontSize: 12, color: '#0F8122', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} />
                    {formAlumnoSelected.nombre} ({formAlumnoSelected.numControl})
                  </div>
                )}
                {formErrors.alumno && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{formErrors.alumno}</span>}
              </div>

              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Descripcion *</label>
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

              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Gravedad *</label>
                <select className={`select ${formErrors.gravedad ? 'input--error' : ''}`} value={formGravedad} onChange={(e) => { setFormGravedad(e.target.value); setFormErrors(prev => ({ ...prev, gravedad: '' })); }}>
                  <option value="">Seleccionar gravedad...</option>
                  {gravedadOptions.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
                {formErrors.gravedad && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{formErrors.gravedad}</span>}
              </div>

              {formGravedad === 'Grave' && (
                <div className="alert alert--warning" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={18} />
                  <span>Esta incidencia esta marcada como <strong>Grave</strong>. Se notificara a los directivos automaticamente.</span>
                </div>
              )}

              <label className="checkbox-group">
                <input type="checkbox" checked={formNotificar} onChange={(e) => setFormNotificar(e.target.checked)} />
                <span style={{ fontSize: 14 }}>Notificar a directivos</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={handleCloseModal}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave}>Guardar incidencia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
