import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, Pencil, X } from 'lucide-react';
import { profesoresApi } from '../api';
import type { Profesor, ProfesorCreate } from '../types';

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Profesor | null>(null);
  const [detailModal, setDetailModal] = useState<Profesor | null>(null);

  const [formNumNomina, setFormNumNomina] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formDomicilio, setFormDomicilio] = useState('');

  useEffect(() => {
    profesoresApi.getAll().then(setProfesores).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return profesores;
    const q = searchQuery.toLowerCase();
    return profesores.filter(p =>
      p.nombre_completo.toLowerCase().includes(q) ||
      String(p.num_nomina).includes(q) ||
      (p.telefono && p.telefono.includes(q))
    );
  }, [searchQuery, profesores]);

  const openCreate = () => {
    setEditItem(null);
    setFormNumNomina('');
    setFormNombre('');
    setFormTelefono('');
    setFormDomicilio('');
    setModalOpen(true);
  };

  const openEdit = (p: Profesor) => {
    setEditItem(p);
    setFormNumNomina(String(p.num_nomina));
    setFormNombre(p.nombre_completo);
    setFormTelefono(p.telefono || '');
    setFormDomicilio(p.domicilio || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNumNomina || !formNombre) return;
    try {
      const payload: ProfesorCreate = {
        num_nomina: Number(formNumNomina),
        nombre_completo: formNombre,
        telefono: formTelefono || undefined,
        domicilio: formDomicilio || undefined,
      };
      if (editItem) {
        const updated = await profesoresApi.update(editItem.id, payload);
        setProfesores(profesores.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await profesoresApi.create(payload);
        setProfesores([created, ...profesores]);
      }
      setModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este profesor?')) return;
    try {
      await profesoresApi.delete(id);
      setProfesores(profesores.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-center">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input type="text" className="input input--search" placeholder="Buscar por nombre, nomina o telefono..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn--primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo profesor
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th><th>No. Nomina</th><th>Nombre completo</th><th>Telefono</th><th>Domicilio</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{p.num_nomina}</td>
                <td style={{ fontWeight: 500 }}>{p.nombre_completo}</td>
                <td>{p.telefono || '---'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.domicilio || '---'}</td>
                <td><span className={`badge ${p.activo ? 'badge--active' : 'badge--inactive'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="table-action" title="Ver detalle" onClick={() => setDetailModal(p)}><Eye size={18} /></button>
                    <button className="table-action" title="Editar" onClick={() => openEdit(p)}><Pencil size={18} /></button>
                    <button className="table-action" title="Eliminar" style={{ color: '#EB2466' }} onClick={() => handleDelete(p.id)}><X size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#85787A' }}>No hay profesores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Editar profesor' : 'Nuevo profesor'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">No. de nomina</label>
                <input type="number" className="input" value={formNumNomina} onChange={(e) => setFormNumNomina(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Nombre completo</label>
                <input className="input" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Telefono</label>
                <input className="input" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Domicilio</label>
                <textarea className="input" rows={2} value={formDomicilio} onChange={(e) => setFormDomicilio(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={!formNumNomina || !formNombre}>
                {editItem ? 'Guardar cambios' : 'Crear profesor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="modal-backdrop" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del profesor</h3>
              <button className="modal-close" onClick={() => setDetailModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>No. Nomina</span>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{detailModal.num_nomina}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Nombre completo</span>
                <div style={{ fontWeight: 500 }}>{detailModal.nombre_completo}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Telefono</span>
                <div>{detailModal.telefono || '---'}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Domicilio</span>
                <div>{detailModal.domicilio || '---'}</div>
              </div>
              <div><span style={{ color: '#5F5657', fontSize: 12 }}>Estado</span>
                <div>{detailModal.activo ? 'Activo' : 'Inactivo'}</div>
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
