import { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Edit, X, Check, User } from 'lucide-react';
import { egresadosApi, alumnosApi, gruposApi } from '../api';
import type { Alumno, Grupo } from '../types';
import {
  formatCicloLabel,
  formatCicloPeriodo,
  parseCicloName,
  cicloNameFromDate,
  semestreFromDate,
  SEMESTRE_LABELS,
} from '@/lib/ciclos';
import { toastSuccess, toastError } from '@/lib/toast';
import { normalizeText } from '@/lib/normalizeText';
import Loader from '../components/Loader';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

type PanelMode = 'view' | 'edit';

type ConfirmAction = {
  type: 'edit' | 'save';
  title: string;
  message: string;
  confirmLabel?: string;
};

export default function EgresadosPage() {
  const [egresados, setEgresados] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cicloFilter, setCicloFilter] = useState<string>('');
  const [selected, setSelected] = useState<Alumno | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [editName, setEditName] = useState('');
  const [editControl, setEditControl] = useState('');
  const [editCurp, setEditCurp] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDomicilio, setEditDomicilio] = useState('');
  const [editTutor, setEditTutor] = useState('');
  const [editNss, setEditNss] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lista, gruposData] = await Promise.all([
        egresadosApi.getAll(
          searchQuery.trim() || undefined,
          cicloFilter || undefined,
        ),
        gruposApi.getAll(),
      ]);
      setEgresados(lista);
      setGrupos(gruposData);
    } catch {
      toastError('No se pudieron cargar los egresados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cicloFilter]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return egresados;
    const q = normalizeText(searchQuery);
    return egresados.filter((a) =>
      normalizeText(`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`).includes(q) ||
      normalizeText(a.matricula).includes(q) ||
      normalizeText(a.cohorte ?? '').includes(q) ||
      normalizeText(formatCicloPeriodo(a.cohorte ?? '')).includes(q),
    );
  }, [egresados, searchQuery]);

  const ciclosDisponibles = useMemo(() => {
    const cohortes = [...new Set(egresados.map((a) => a.cohorte ?? '').filter(Boolean))];
    return cohortes.sort().reverse();
  }, [egresados]);

  const cicloActual = cicloNameFromDate();
  const filtroHint = cicloFilter === ''
    ? `Semestre actual: ${cicloActual} (${SEMESTRE_LABELS[semestreFromDate()]}). A = ene–jun · B = jul–dic.`
    : formatCicloPeriodo(cicloFilter);

  const getGrupoName = (idGrupo?: number) => {
    if (!idGrupo) return '---';
    const g = grupos.find((x) => x.id === idGrupo);
    return g ? String(g.clave_grupo) : '---';
  };

  const nombreCompleto = (a: Alumno) =>
    `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`.trim();

  const fillEditFields = (a: Alumno) => {
    setEditName(nombreCompleto(a));
    setEditControl(a.matricula);
    setEditCurp(a.curp ?? '');
    setEditTelefono(a.tutor_telefono ?? a.telefono ?? '');
    setEditDomicilio(a.direccion ?? '');
    setEditTutor(a.tutor_nombre ?? '');
    setEditNss(a.nss ?? '');
  };

  const openView = (a: Alumno) => {
    setSelected(a);
    setPanelMode('view');
    setShowConfirmEdit(false);
  };

  const requestEdit = () => {
    if (!selected) return;
    setShowConfirmEdit(true);
  };

  const confirmEdit = () => {
    setShowConfirmEdit(false);
    if (!selected) return;
    setConfirmAction({
      type: 'edit',
      title: 'Confirmar edición',
      message: `Ingrese su contraseña para editar los datos de ${nombreCompleto(selected)}.`,
      confirmLabel: 'Confirmar',
    });
  };

  const requestSave = () => {
    if (!selected) return;
    setConfirmAction({
      type: 'save',
      title: 'Guardar cambios',
      message: `Ingrese su contraseña para guardar los cambios de ${nombreCompleto(selected)}.`,
      confirmLabel: 'Guardar',
    });
  };

  const performSave = async () => {
    if (!selected) return;
    try {
      const parts = editName.trim().split(/\s+/);
      const updated = await alumnosApi.update(selected.id, {
        matricula: editControl.trim(),
        nombre: parts[0] ?? '',
        apellido_paterno: parts[1] ?? '',
        apellido_materno: parts.slice(2).join(' ') ?? '',
        curp: editCurp.trim(),
        telefono: editTelefono.trim(),
        direccion: editDomicilio.trim(),
        tutor_nombre: editTutor.trim(),
        nss: editNss.trim(),
      });
      toastSuccess('Datos del egresado actualizados');
      setSelected(updated);
      setPanelMode('view');
      await loadData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo actualizar el egresado');
    }
  };

  if (loading && egresados.length === 0) {
    return <Loader message="Cargando egresados..." />;
  }

  return (
    <div>
      <p className="page-lead">Consulta y edita alumnos que ya concluyeron sus estudios.</p>

      <section className="egresados-filters" aria-label="Filtros de egresados">
        <div className="egresados-filters__row">
          <div className="egresados-filters__search">
            <label className="field-label" htmlFor="egresados-search">Buscar alumno</label>
            <div className="input-wrapper">
              <Search size={18} className="input-icon" />
              <input
                id="egresados-search"
                type="text"
                className="input input--search"
                placeholder="Nombre, número de control o ciclo de egreso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>
          </div>
          <div className="egresados-count" aria-live="polite">
            <strong>{filtered.length}</strong>
            <br />
            egresado{filtered.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="cycle-filter-block">
          <span className="field-label">Semestre · Automático (A ene–jun · B jul–dic)</span>
          <div className="cycle-filter__chips" role="group" aria-label="Filtrar por semestre">
            <button
              type="button"
              className={`cycle-chip cycle-chip--all ${cicloFilter === '' ? 'cycle-chip--active' : ''}`}
              onClick={() => setCicloFilter('')}
            >
              <span className="cycle-chip__code">Todos los semestres</span>
              <span className="cycle-chip__period">Sin filtro</span>
            </button>
            {ciclosDisponibles.map((nombre) => {
              const parsed = parseCicloName(nombre);
              const esActual = nombre === cicloActual;
              return (
                <button
                  key={nombre}
                  type="button"
                  className={`cycle-chip ${cicloFilter === nombre ? 'cycle-chip--active' : ''}`}
                  onClick={() => setCicloFilter(nombre)}
                  title={formatCicloLabel(nombre)}
                >
                  <span className="cycle-chip__code">
                    {nombre}
                    {parsed && (
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', fontWeight: 600, opacity: 0.85 }}>
                        Sem. {parsed.semestre}
                      </span>
                    )}
                    {esActual && (
                      <span style={{ marginLeft: 6, fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-magenta-oscuro)' }}>
                        ACTUAL
                      </span>
                    )}
                  </span>
                  <span className="cycle-chip__period">{formatCicloPeriodo(nombre)}</span>
                </button>
              );
            })}
          </div>
          {filtroHint && <p className="cycle-filter__hint">{filtroHint}</p>}
        </div>
      </section>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>No. control</th>
              <th>Nombre</th>
              <th>Grupo</th>
              <th>Semestre de egreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-magenta-oscuro)', fontWeight: 600 }}>
                  {a.matricula}
                </td>
                <td>{nombreCompleto(a)}</td>
                <td>{getGrupoName(a.id_grupo)}</td>
                <td>
                  {a.cohorte ? (
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{a.cohorte.toUpperCase()}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-gris-carbon)' }}>{formatCicloPeriodo(a.cohorte)}</span>
                    </span>
                  ) : '---'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      title="Ver detalle"
                      onClick={() => openView(a)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 4 }}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => { openView(a); fillEditFields(a); setShowConfirmEdit(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 4 }}
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#85787A' }}>
                  No se encontraron egresados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && !showConfirmEdit && (
        <>
          <div
            onClick={() => { setSelected(null); setPanelMode('view'); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 460, height: '100vh',
            background: '#fff', zIndex: 1000, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            overflowY: 'auto', padding: '24px 32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {panelMode === 'view' ? 'Detalle del egresado' : 'Editar egresado'}
              </h3>
              <button type="button" onClick={() => { setSelected(null); setPanelMode('view'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #F0EFEF' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0EFEF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={32} color="#85787A" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{nombreCompleto(selected)}</div>
                <div style={{ fontFamily: 'monospace', color: '#AB1748', marginTop: 4 }}>{selected.matricula}</div>
                <div style={{ fontSize: 13, color: '#5F5657', marginTop: 4 }}>
                  {selected.cohorte ? formatCicloLabel(selected.cohorte) : 'Semestre no registrado'}
                </div>
              </div>
              {panelMode === 'view' && (
                <button type="button" className="btn btn--primary" onClick={requestEdit}>
                  <Edit size={14} /> Editar
                </button>
              )}
              {panelMode === 'edit' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn--primary" onClick={requestSave}><Check size={14} /> Guardar</button>
                  <button type="button" className="btn btn--secondary" onClick={() => setPanelMode('view')}>Cancelar</button>
                </div>
              )}
            </div>

            {panelMode === 'view' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', fontSize: 14 }}>
                <div><span style={{ color: '#5F5657', fontSize: 12 }}>Grupo</span><div>{getGrupoName(selected.id_grupo)}</div></div>
                <div><span style={{ color: '#5F5657', fontSize: 12 }}>CURP</span><div style={{ fontFamily: 'monospace' }}>{selected.curp || '---'}</div></div>
                <div><span style={{ color: '#5F5657', fontSize: 12 }}>NSS</span><div>{selected.nss || '---'}</div></div>
                <div><span style={{ color: '#5F5657', fontSize: 12 }}>Teléfono tutor</span><div>{selected.tutor_telefono || selected.telefono || '---'}</div></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#5F5657', fontSize: 12 }}>Dirección</span><div>{selected.direccion || '---'}</div></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#5F5657', fontSize: 12 }}>Tutor</span><div>{selected.tutor_nombre || '---'}</div></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="field-label">Nombre completo<input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
                <label className="field-label">No. control<input className="input" value={editControl} onChange={(e) => setEditControl(e.target.value)} maxLength={10} style={{ fontFamily: 'monospace' }} /></label>
                <label className="field-label">CURP<input className="input" value={editCurp} onChange={(e) => setEditCurp(e.target.value)} maxLength={18} /></label>
                <label className="field-label">NSS<input className="input" value={editNss} onChange={(e) => setEditNss(e.target.value)} maxLength={11} /></label>
                <label className="field-label">Teléfono tutor<input className="input" value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} /></label>
                <label className="field-label">Tutor<input className="input" value={editTutor} onChange={(e) => setEditTutor(e.target.value)} /></label>
                <label className="field-label">Dirección<input className="input" value={editDomicilio} onChange={(e) => setEditDomicilio(e.target.value)} /></label>
              </div>
            )}
          </div>
        </>
      )}

      {showConfirmEdit && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }} onClick={() => setShowConfirmEdit(false)}>
          <div className="panel" style={{ width: 420, maxWidth: '90vw', padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Editar egresado</h3>
            <p style={{ color: '#5F5657', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              ¿Desea editar los datos de <strong>{nombreCompleto(selected)}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setShowConfirmEdit(false)}>Cancelar</button>
              <button type="button" className="btn btn--primary" onClick={confirmEdit}>Editar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPasswordModal
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.confirmLabel}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'edit') {
            setConfirmAction(null);
            fillEditFields(selected!);
            setPanelMode('edit');
            return;
          }
          if (confirmAction.type === 'save') {
            await performSave();
            setConfirmAction(null);
          }
        }}
      />
    </div>
  );
}
