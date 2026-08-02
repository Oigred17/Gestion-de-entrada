import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Check, X, RefreshCw, Nfc, Loader2, AlertTriangle, User } from 'lucide-react';
import { credencialesApi, alumnosApi } from '../api';
import { nfcApi } from '../api/nfc';
import type { Credencial, Alumno } from '../types';

function nombreCompleto(a: Alumno): string {
  return `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`;
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Alumno | null>(null);
  const [credentialData, setCredentialData] = useState<Credencial | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    credencialesApi.getById(Number(id))
      .then((cred) => {
        if (cancelled) return;
        setCredentialData(cred);
        if (cred.alumno) {
          setStudentData(cred.alumno);
          setLoading(false);
        } else {
          return alumnosApi.getById(cred.alumno_id);
        }
      })
      .then((alumno) => {
        if (cancelled) return;
        if (alumno) setStudentData(alumno);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? 'Error al cargar los datos');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editControl, setEditControl] = useState('');
  const [editGrupo, setEditGrupo] = useState('');

  useEffect(() => {
    if (studentData) {
      setEditName(nombreCompleto(studentData));
      setEditControl(studentData.matricula);
      setEditGrupo(studentData.id_grupo?.toString() ?? '');
    }
  }, [studentData]);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignStep, setReassignStep] = useState<'confirm' | 'write'>('confirm');
  const [newChipId, setNewChipId] = useState('');
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState(false);
  const [nfcWaiting, setNfcWaiting] = useState(false);
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (studentData) {
      setEditName(nombreCompleto(studentData));
      setEditControl(studentData.matricula);
      setEditGrupo(studentData.id_grupo?.toString() ?? '');
    }
    setIsEditing(false);
  };

  const handleStartReassign = () => {
    setShowReassignModal(true);
    setReassignStep('confirm');
    setNewChipId('');
    setWriting(false);
    setWritten(false);
  };

  const cleanupWs = useCallback(() => {
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    nfcApi.stopCapture().catch(() => {});
    setNfcWaiting(false);
  }, []);

  useEffect(() => {
    return () => { cleanupWs(); };
  }, [cleanupWs]);

  const handleWriteNewChip = useCallback(async () => {
    setWriting(true);
    setNfcWaiting(true);

    try {
      await nfcApi.startCapture();
    } catch {
      setWriting(false);
      setNfcWaiting(false);
      showToast('No se pudo activar el modo captura', 'error');
      return;
    }

    let stopped = false;

    captureTimeoutRef.current = setTimeout(() => {
      stopped = true;
      setWriting(false);
      setNfcWaiting(false);
      nfcApi.stopCapture().catch(() => {});
      showToast('Tiempo de espera agotado. Acerque la tarjeta NFC al lector.', 'error');
    }, 30000);

    const pollInterval = setInterval(async () => {
      if (stopped) return;
      try {
        const result = await nfcApi.pollCapture();
        if (result.status === 'captured' && result.uid_nfc) {
          stopped = true;
          if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
          clearInterval(pollInterval);
          nfcApi.stopCapture().catch(() => {});
          setNewChipId(result.uid_nfc);
          setWriting(false);
          setWritten(true);
          setNfcWaiting(false);
        }
      } catch {}
    }, 500);
  }, [showToast]);

  const handleConfirmReassign = () => {
    setShowReassignModal(false);
    showToast(`Chip reasignado correctamente. Nuevo ID: ${newChipId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 size={32} color="#EB2466" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 12, fontSize: 14, color: '#5F5657' }}>Cargando datos...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <AlertTriangle size={32} color="#AB1748" />
        <span style={{ fontSize: 14, color: '#AB1748', fontWeight: 600 }}>{error ?? 'No se encontraron datos'}</span>
        <button onClick={() => navigate(-1)} style={{ marginTop: 8, padding: '8px 16px', border: 'none', borderRadius: 8, background: '#AB1748', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    );
  }

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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1819' }}>{nombreCompleto(studentData)}</div>
            <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#EB2466', marginTop: 2 }}>{studentData.matricula}</div>
            <div style={{ fontSize: 13, color: '#5F5657', marginTop: 2 }}>Grupo: {studentData.id_grupo ?? '-'}</div>
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
                <FieldValue>{nombreCompleto(studentData)}</FieldValue>
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
                <FieldValue>{studentData.id_grupo ?? '-'}</FieldValue>
              )}
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <div>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: studentData.estatus === 'Activo' ? '#FEEBEE' : '#F0EFEF',
                  color: studentData.estatus === 'Activo' ? '#0F8122' : '#5F5657',
                }}>
                  {studentData.estatus === 'Activo' ? 'Activo' : 'Inactivo'}
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
                <FieldValue mono color="#0F8122">{credentialData.numero ?? '-'}</FieldValue>
              </div>
              <div>
                <FieldLabel>Fecha asignacion</FieldLabel>
                <FieldValue>{credentialData.fecha_emision ?? '-'}</FieldValue>
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div><span className={credentialData.estatus === 'Activa' ? estadoBadgeClass['Activa'] : estadoBadgeClass['Inactiva']}>{credentialData.estatus === 'Activa' ? 'Activa' : 'Inactiva'}</span></div>
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
              <FieldValue>{studentData.direccion ?? '-'}</FieldValue>
            </div>
            <div>
              <FieldLabel>Telefono</FieldLabel>
              <FieldValue mono>{studentData.telefono ?? '-'}</FieldValue>
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
              <button className="modal-close" onClick={() => { cleanupWs(); setShowReassignModal(false); }}><X size={20} /></button>
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
                      <span style={{ fontWeight: 600 }}>{nombreCompleto(studentData)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#5F5657' }}>Chip actual:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#AB1748' }}>{credentialData?.numero ?? '---'}</span>
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
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{nombreCompleto(studentData)}</div>
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
                    {writing ? 'Leyendo tarjeta NFC...' : written ? 'UID capturado correctamente' : 'Acerca el nuevo chip NFC al lector para capturar su UID'}
                  </p>
                  {written && newChipId && (
                    <div style={{ padding: 12, background: '#F0EFEF', borderRadius: 8, display: 'inline-block' }}>
                      <span style={{ fontSize: 12, color: '#5F5657' }}>UID NFC capturado: </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{newChipId}</span>
                    </div>
                  )}
                  {!writing && !written && (
                    <button className="btn btn--primary" onClick={handleWriteNewChip} disabled={nfcWaiting}>
                      <Nfc size={18} /> Detectar tarjeta NFC
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => { cleanupWs(); setShowReassignModal(false); }}>Cancelar</button>
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
