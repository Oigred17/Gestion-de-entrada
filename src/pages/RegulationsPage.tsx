import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, X } from 'lucide-react';
import { alumnosApi, reportesApi } from '../api';
import type { Reporte, Alumno } from '../types';
import type { UserRole } from '../App';

function getRegistradoPor(role: UserRole): string {
  return role === 'Directivo' ? 'Directivo (Lic. Fabian Ocampo)' : 'Prefecto (Vigilancia)';
}

export default function RegulationsPage({ role }: { role: UserRole }) {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Reporte | null>(null);

  const [formAlumnoQuery, setFormAlumnoQuery] = useState('');
  const [formAlumnoSelected, setFormAlumnoSelected] = useState<Alumno | null>(null);
  const [formMotivo, setFormMotivo] = useState('');
  const [formSancion, setFormSancion] = useState('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([
      reportesApi.getAll(),
      alumnosApi.getAll(),
    ]).then(([r, a]) => {
      setReportes(r);
      setAlumnos(a);
    }).catch(console.error);
  }, []);

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

  const handleCreate = async () => {
    if (!formAlumnoSelected || !formMotivo || !formSancion) return;
    try {
      const nuevo = await reportesApi.create({
        id_alumno: formAlumnoSelected.id,
        id_prefecto: 1,
        motivo: formMotivo,
        sancion: formSancion,
        fecha: formFecha,
      });
      setReportes([nuevo, ...reportes]);
      setModalOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setFormAlumnoQuery('');
    setFormAlumnoSelected(null);
    setFormMotivo('');
    setFormSancion('');
    setFormFecha(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Faltas al Reglamento</h1>
        <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nueva falta
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            className="input input--search"
            placeholder="Buscar por motivo, sancion o alumno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Alumno</th><th>Matricula</th><th>Motivo</th><th>Sancion</th><th>Fecha</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>
                    {r.alumno ? `${r.alumno.nombre} ${r.alumno.apellido_paterno} ${r.alumno.apellido_materno}` : `Alumno #${r.id_alumno}`}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.alumno?.matricula ?? '---'}</td>
                  <td>{r.motivo}</td>
                  <td>{r.sancion}</td>
                  <td>{r.fecha}</td>
                  <td>
                    <button className="btn btn--icon" title="Ver detalle" onClick={() => setDetailModal(r)}>
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#85787A' }}>No hay reportes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar falta al reglamento</h2>
              <button className="btn btn--icon" onClick={() => { setModalOpen(false); resetForm(); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">Alumno</label>
                <input
                  className="input"
                  placeholder="Buscar alumno por nombre o matricula..."
                  value={formAlumnoSelected ? `${formAlumnoSelected.nombre} ${formAlumnoSelected.apellido_paterno} - ${formAlumnoSelected.matricula}` : formAlumnoQuery}
                  onChange={(e) => { setFormAlumnoQuery(e.target.value); setFormAlumnoSelected(null); }}
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
                <label className="field-label">Sancion</label>
                <textarea className="input" rows={3} value={formSancion} onChange={(e) => setFormSancion(e.target.value)} placeholder="Describe la sancion..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleCreate} disabled={!formAlumnoSelected || !formMotivo || !formSancion}>
                Registrar falta
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle de falta</h2>
              <button className="btn btn--icon" onClick={() => setDetailModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Alumno</span>
                <div style={{ fontWeight: 500 }}>{detailModal.alumno ? `${detailModal.alumno.nombre} ${detailModal.alumno.apellido_paterno} ${detailModal.alumno.apellido_materno}` : `#${detailModal.id_alumno}`}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Matricula</span>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{detailModal.alumno?.matricula ?? '---'}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Fecha</span>
                <div>{detailModal.fecha}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Motivo</span>
                <div>{detailModal.motivo}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Sancion</span>
                <div>{detailModal.sancion}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Registrado por</span>
                <div>{getRegistradoPor(role)}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--primary" onClick={() => setDetailModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
