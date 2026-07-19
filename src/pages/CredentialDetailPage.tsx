import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Check, X, RefreshCw, Nfc, Loader2, AlertTriangle, User } from 'lucide-react';
import { alumnos, credenciales } from '../data/mockData';

function generateChipId(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
  return `NFC-${hex()}-${hex()}-${hex()}-${hex()}`;
}

const estadoBadgeClass: Record<string, string> = {
  Activa: 'badge badge--active',
  Inactiva: 'badge badge--inactive',
  Bloqueada: 'badge badge--alert',
  Pendiente: 'badge badge--pending',
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#EB2466', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
    {children}
  </h3>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#5F5657', fontSize: 12, display: 'block' }}>{children}</span>
);

const FieldValue = ({ children, mono, color }: { children: React.ReactNode; mono?: boolean; color?: string }) => (
  <div style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : undefined, color: color || '#1C1819' }}>{children}</div>
);

export default function CredentialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const studentData = alumnos.find(s => s.idAlumno === Number(id)) ?? alumnos[0];
  const credentialData = credenciales.find(c => c.idAlumno === studentData.idAlumno);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(studentData.nombreCompleto);
  const [editControl, setEditControl] = useState(studentData.matricula);
  const [editGrupo, setEditGrupo] = useState(studentData.grupo);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignStep, setReassignStep] = useState<'confirm' | 'write'>('confirm');
  const [newChipId, setNewChipId] = useState('');
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    showToast('Datos del alumno actualizados correctamente');
  };

  const handleCancelEdit = () => {
    setEditName(studentData.nombreCompleto);
    setEditControl(studentData.matricula);
    setEditGrupo(studentData.grupo);
    setIsEditing(false);
  };

  const handleStartReassign = () => {
    setShowReassignModal(true);
    setReassignStep('confirm');
    setNewChipId('');
    setWriting(false);
    setWritten(false);
  };

  const handleWriteNewChip = useCallback(() => {
    setWriting(true);
    const chip = generateChipId();
    setTimeout(() => {
      setNewChipId(chip);
      setWriting(false);
      setWritten(true);
    }, 1500);
  }, []);

  const handleConfirmReassign = () => {
    setShowReassignModal(false);
    showToast(`Chip reasignado correctamente. Nuevo ID: ${newChipId}`);
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'success' ? '#0F8122' : toast.type === 'error' ? '#AB1748' : '#1792AB',
          color: '#fff', fontWeight: 600, fontSize: 14, zIndex: 10001,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', animation: 'fadeInContent 200ms ease-out',
        }}>
          {toast.message}
        </div>
      )}

      <div onClick={() => navigate(-1)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, width: 480, height: '100vh',
        background: '#fff', zIndex: 1000, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        overflowY: 'auto', animation: 'slideInRight 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '24px 32px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Detalle de Credencial</h2>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #F0EFEF', padding: '0 32px 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F0EFEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={36} color="#85787A" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1819' }}>{studentData.nombreCompleto}</div>
            <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#EB2466', marginTop: 2 }}>{studentData.matricula}</div>
            <div style={{ fontSize: 13, color: '#5F5657', marginTop: 2 }}>Grupo: {studentData.grupo}</div>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: '#AB1748', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <Edit size={14} /> Editar
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: 'none', borderRadius: 8, background: '#0F8122', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Check size={14} /> Guardar
              </button>
              <button onClick={handleCancelEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: '1px solid #CAC6C7', borderRadius: 8, background: '#fff', color: '#5F5657', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <X size={14} /> Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Seccion: Informacion General */}
        <div style={{ padding: '0 32px', marginBottom: 24 }}>
          <SectionTitle>Informacion general</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
            <div>
              <FieldLabel>Nombre</FieldLabel>
              {isEditing ? (
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #CAC6C7', borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: 'var(--font-sans)' }} />
              ) : (
                <FieldValue>{studentData.nombreCompleto}</FieldValue>
              )}
            </div>
            <div>
              <FieldLabel>No. Control</FieldLabel>
              {isEditing ? (
                <input type="text" value={editControl} onChange={(e) => setEditControl(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #CAC6C7', borderRadius: 6, fontSize: 14, fontWeight: 500, fontFamily: 'monospace', marginTop: 4 }} />
              ) : (
                <FieldValue mono>{studentData.matricula}</FieldValue>
              )}
            </div>
            <div>
              <FieldLabel>Grupo</FieldLabel>
              {isEditing ? (
                <input type="text" value={editGrupo} onChange={(e) => setEditGrupo(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #CAC6C7', borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: 'var(--font-sans)' }} />
              ) : (
                <FieldValue>{studentData.grupo}</FieldValue>
              )}
            </div>
            <div>
              <FieldLabel>Capacitacion</FieldLabel>
              <FieldValue>{studentData.capacitacion}</FieldValue>
            </div>
            <div>
              <FieldLabel>Turno</FieldLabel>
              <FieldValue>{studentData.turno}</FieldValue>
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <div>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: studentData.activo ? '#FEEBEE' : '#F0EFEF',
                  color: studentData.activo ? '#0F8122' : '#5F5657',
                }}>
                  {studentData.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Seccion: Credencial NFC */}
        <div style={{ padding: '0 32px', marginBottom: 24 }}>
          <SectionTitle>Credencial NFC</SectionTitle>
          {credentialData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
              <div>
                <FieldLabel>ID Chip</FieldLabel>
                <FieldValue mono color="#0F8122">{credentialData.uidNfc}</FieldValue>
              </div>
              <div>
                <FieldLabel>Fecha asignacion</FieldLabel>
                <FieldValue>{credentialData.fechaEmision}</FieldValue>
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div><span className={credentialData.activa ? estadoBadgeClass['Activa'] : estadoBadgeClass['Inactiva']}>{credentialData.activa ? 'Activa' : 'Inactiva'}</span></div>
              </div>
              <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                <button onClick={handleStartReassign} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8,
                  background: '#AB1748', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}>
                  <RefreshCw size={16} /> Reasignar chip NFC
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, background: '#F0EFEF', borderRadius: 8, textAlign: 'center', color: '#5F5657', fontSize: 14 }}>
              Este alumno no tiene credencial asignada
            </div>
          )}
        </div>

        {/* Seccion: Contacto */}
        <div style={{ padding: '0 32px', marginBottom: 32 }}>
          <SectionTitle>Contacto</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldLabel>Domicilio</FieldLabel>
              <FieldValue>{studentData.domicilio}</FieldValue>
            </div>
            <div>
              <FieldLabel>Tutor</FieldLabel>
              <FieldValue>{studentData.tutorNombre}</FieldValue>
            </div>
            <div>
              <FieldLabel>Telefono tutor</FieldLabel>
              <FieldValue mono>{studentData.tutorTelefono}</FieldValue>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODAL REASIGNAR CHIP ========== */}
      {showReassignModal && (
        <div className="modal-backdrop" onClick={() => setShowReassignModal(false)} style={{ zIndex: 10002 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {reassignStep === 'confirm' ? <AlertTriangle size={20} color="#AB1748" /> : <Nfc size={20} color="#EB2466" />}
                {reassignStep === 'confirm' ? 'Reasignar chip NFC' : 'Escribir nuevo chip'}
              </h3>
              <button className="modal-close" onClick={() => setShowReassignModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {reassignStep === 'confirm' && (
                <div>
                  <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 8, border: '1px solid #AB1748', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AlertTriangle size={16} color="#AB1748" />
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#AB1748' }}>Atencion</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#5F5657', lineHeight: 1.6, margin: 0 }}>
                      Al reasignar el chip NFC, el chip actual sera <strong>dado de baja</strong> y el alumno no podra usarlo para acceder al plantel.
                      Se asignara un <strong>nuevo chip NFC</strong> que debera ser escrito y verificado.
                    </p>
                  </div>
                  <div style={{ padding: 16, background: '#F0EFEF', borderRadius: 8, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#5F5657' }}>Alumno:</span>
                      <span style={{ fontWeight: 600 }}>{studentData.nombreCompleto}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#5F5657' }}>Chip actual:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#AB1748' }}>{credentialData?.uidNfc ?? '---'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#5F5657' }}>Accion:</span>
                      <span style={{ fontWeight: 600, color: '#AB1748' }}>Dado de baja + Nuevo chip</span>
                    </div>
                  </div>
                </div>
              )}

              {reassignStep === 'write' && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ marginBottom: 16, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{studentData.nombreCompleto}</div>
                    <div style={{ fontSize: 13, color: '#5F5657' }}>No. Control: {studentData.matricula}</div>
                  </div>
                  <div className={`nfc-zone ${writing ? 'scanning' : written ? '' : 'scanning'}`} style={{ margin: '0 auto 16px' }}>
                    <div className="nfc-zone-inner" style={{ background: written ? '#70FE7D' : undefined }}>
                      {writing ? (
                        <Loader2 size={64} color="#EB2466" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : written ? (
                        <Check size={64} color="#0F8122" />
                      ) : (
                        <Nfc size={64} color="#EB2466" />
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 15, color: '#5F5657', marginBottom: 16 }}>
                    {writing ? 'Escribiendo datos en el nuevo chip NFC...' : written ? 'Escritura completada correctamente' : 'Acerca el nuevo chip NFC al lector para escribir'}
                  </p>
                  {written && newChipId && (
                    <div style={{ padding: 12, background: '#F0EFEF', borderRadius: 8, display: 'inline-block' }}>
                      <span style={{ fontSize: 12, color: '#5F5657' }}>Nuevo ID del Chip: </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{newChipId}</span>
                    </div>
                  )}
                  {!writing && !written && (
                    <button className="btn btn--primary" onClick={handleWriteNewChip}>
                      <Nfc size={18} /> Escribir chip
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowReassignModal(false)}>Cancelar</button>
              {reassignStep === 'confirm' && (
                <button className="btn btn--danger" onClick={() => setReassignStep('write')}>
                  <RefreshCw size={16} /> Continuar
                </button>
              )}
              {reassignStep === 'write' && written && (
                <button className="btn btn--primary" onClick={handleConfirmReassign}>
                  <Check size={16} /> Confirmar reasignacion
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
