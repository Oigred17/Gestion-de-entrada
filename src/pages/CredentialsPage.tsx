import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Plus, Eye, Trash2, RefreshCw, Nfc, Check, X, AlertTriangle, Shield, Download, Loader2, User } from 'lucide-react';
import { credencialesApi, alumnosApi, gruposApi } from '../api';
import { nfcApi } from '../api/nfc';
import type { Credencial, CredencialCreate, Alumno, Grupo } from '../types';
import { generateCredentialsPDF } from '../utils/generateCredentialsPDF';

type CredencialEstado = 'Activa' | 'Inactiva';

const estadoBadgeClass: Record<CredencialEstado, string> = {
  Activa: 'badge badge--active',
  Inactiva: 'badge badge--inactive',
};

const tabFilters: { label: string; key: CredencialEstado | 'Todas' }[] = [
  { label: 'Todas', key: 'Todas' },
  { label: 'Activas', key: 'Activa' },
  { label: 'Inactivas', key: 'Inactiva' },
];

interface Reposition {
  id: number;
  alumno: string;
  motivo: string;
  fechaSolicitud: string;
  fechaEntrega: string;
}

const repositionsData: Reposition[] = [
  { id: 1, alumno: 'Ana Lopez Martinez', motivo: 'Tarjeta extraviada', fechaSolicitud: '2026-06-28', fechaEntrega: '2026-07-02' },
  { id: 2, alumno: 'Carlos Hernandez Ruiz', motivo: 'Tarjeta danada por agua', fechaSolicitud: '2026-07-01', fechaEntrega: '---' },
];

type ConfirmType = 'simple' | 'password';
type ConfirmAction = 'activar' | 'desactivar' | 'reasignar' | 'escanear' | null;

interface ConfirmState {
  open: boolean;
  type: ConfirmType;
  action: ConfirmAction;
  title: string;
  message: string;
  credId?: number;
}

interface BatchResult {
  studentId: number;
  uidNfc: string;
  success: boolean;
}

export default function CredentialsPage() {
  const [localStudents, setLocalStudents] = useState<Alumno[]>([]);
  const [creds, setCreds] = useState<Credencial[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CredencialEstado | 'Todas'>('Todas');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [assignMode, setAssignMode] = useState<'alumno' | 'grupo'>('alumno');
  const [assignGroupId, setAssignGroupId] = useState<string>('');
  const [assignStep, setAssignStep] = useState<1 | 2 | 3>(1);
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [chipId, setChipId] = useState('');

  const [batchStudents, setBatchStudents] = useState<number[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchWriting, setBatchWriting] = useState(false);
  const [batchWritten, setBatchWritten] = useState(false);
  const [_batchVerifying, setBatchVerifying] = useState(false);
  const [batchVerified, setBatchVerified] = useState(false);
  const [batchChipId, setBatchChipId] = useState('');

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, type: 'simple', action: null, title: '', message: '' });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'alumno' | 'grupo'>('alumno');
  const [exportGroupId, setExportGroupId] = useState<string>('all');
  const [exportStudentId, setExportStudentId] = useState<string>('none');
  const [exportStudentQuery, setExportStudentQuery] = useState('');
  const [isReposicion, setIsReposicion] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'reassign'>('view');
  const [reassignStep, setReassignStep] = useState<'confirm' | 'write'>('confirm');
  const [newChipId, setNewChipId] = useState('');
  const [reassignWriting, setReassignWriting] = useState(false);
  const [reassignWritten, setReassignWritten] = useState(false);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanState, setScanState] = useState<'scanning' | 'found' | 'not-found'>('scanning');
  const [scannedChipId, setScannedChipId] = useState('');
  const [scannedCredential, setScannedCredential] = useState<Credencial | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Alumno | null>(null);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'connecting' | 'waiting' | 'captured'>('idle');

  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uniqueGroups = Array.from(new Set(grupos.map((g) => g.nombre))).sort();

  const SYSTEM_PASSWORD = 'admin123';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alumnosData, credencialesData, gruposData] = await Promise.all([
          alumnosApi.getAll(),
          credencialesApi.getAll(),
          gruposApi.getAll(),
        ]);
        setLocalStudents(alumnosData);
        setCreds(credencialesData);
        setGrupos(gruposData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
    return () => { cleanupWs(); };
  }, []);

  const connectNfcWs = useCallback((onCapture: (uid: string) => void, timeoutMs = 30000): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);

      setNfcStatus('connecting');

      try {
        await nfcApi.startCapture();
      } catch {
        setNfcStatus('idle');
        reject(new Error('No se pudo activar el modo captura.'));
        return;
      }

      setNfcStatus('waiting');

      let stopped = false;
      const pollInterval = setInterval(async () => {
        if (stopped) return;
        try {
          const result = await nfcApi.pollCapture();
          if (result.status === 'captured' && result.uid_nfc) {
            stopped = true;
            clearInterval(pollInterval);
            if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
            setNfcStatus('captured');
            onCapture(result.uid_nfc);
            resolve(result.uid_nfc);
          }
        } catch {
        }
      }, 500);

      captureTimeoutRef.current = setTimeout(() => {
        stopped = true;
        clearInterval(pollInterval);
        setNfcStatus('idle');
        nfcApi.stopCapture().catch(() => {});
        reject(new Error('Tiempo de espera agotado. Acerque la tarjeta NFC al lector.'));
      }, timeoutMs);
    });
  }, []);

  const cleanupWs = useCallback(() => {
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    nfcApi.stopCapture().catch(() => {});
    setNfcStatus('idle');
  }, []);

  const getFullName = (alumno: Alumno) => `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno}`;

  const getGrupoNombre = (grupoId?: number) => {
    if (!grupoId) return '---';
    const grupo = grupos.find(g => g.id === grupoId);
    return grupo?.nombre ?? String(grupoId);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getStudent = (id: number) => localStudents.find((s) => s.id === id);
  const getStudentName = (id: number) => {
    const s = getStudent(id);
    return s ? getFullName(s) : 'Desconocido';
  };
  const getStudentControl = (id: number) => getStudent(id)?.matricula ?? '---';
  const getStudentGroup = (id: number) => getGrupoNombre(getStudent(id)?.grupo_id);

  const filtered = creds.filter((c) => {
    const isActive = c.estatus === 'Activa' || c.estatus === 'ACTIVA';
    const matchTab = activeTab === 'Todas' || (activeTab === 'Activa' ? isActive : !isActive);
    const name = getStudentName(c.alumno_id).toLowerCase();
    const matchSearch = search === '' || name.includes(search.toLowerCase()) || (c.numero ?? '').toLowerCase().includes(search.toLowerCase()) || String(c.alumno_id).includes(search);
    return matchTab && matchSearch;
  });

  const countByEstado = (estado: CredencialEstado) => creds.filter((c) => {
    const isActive = c.estatus === 'Activa' || c.estatus === 'ACTIVA';
    return estado === 'Activa' ? isActive : !isActive;
  }).length;

  const handleSimulateScan = () => {
    setScanModalOpen(true);
    setScanState('scanning');
    setScannedChipId('');
    setScannedCredential(null);
    setScannedStudent(null);

    connectNfcWs(() => {}, 30000)
      .then(async (uid) => {
        setScannedChipId(uid);
        try {
          const found = await credencialesApi.getByUid(uid);
          setScannedCredential(found);
          setScannedStudent(getStudent(found.alumno_id) ?? null);
          setScanState('found');
        } catch {
          setScanState('not-found');
        }
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Error al escanear tarjeta', 'error');
        setScanState('not-found');
      });
  };

  const closeScanModal = () => {
    cleanupWs();
    setScanModalOpen(false);
    setScanState('scanning');
    setScannedChipId('');
    setScannedCredential(null);
    setScannedStudent(null);
  };

  const handleView = (credId: number) => {
    setSelectedCredentialId(credId);
    setPanelMode('view');
  };

  const handleDeactivate = (credId: number) => {
    setConfirm({
      open: true,
      type: 'password',
      action: 'desactivar',
      title: 'Desactivar credencial',
      message: 'Esta accion desactivara permanentemente la credencial. Ingrese la contraseña del sistema para confirmar.',
      credId,
    });
  };

  const handleActivate = (credId: number) => {
    setConfirm({
      open: true,
      type: 'password',
      action: 'activar',
      title: 'Activar credencial',
      message: 'Esta accion activara la credencial NFC y el alumno podra acceder al plantel. Ingrese la contraseña del sistema para confirmar.',
      credId,
    });
  };

  const handleReassign = (credId: number) => {
    setSelectedCredentialId(credId);
    setPanelMode('reassign');
    setReassignStep('confirm');
    setNewChipId('');
    setReassignWriting(false);
    setReassignWritten(false);
  };

  const handleConfirmAction = () => {
    if (confirm.type === 'password' && passwordInput !== SYSTEM_PASSWORD) {
      setPasswordError('Contraseña incorrecta. Intente de nuevo.');
      return;
    }

    if (confirm.action === 'activar' && confirm.credId) {
      credencialesApi.update(confirm.credId, { estatus: 'Activa' }).then(() => {
        setCreds(prev => prev.map(c => c.id === confirm.credId ? { ...c, estatus: 'Activa' } : c));
        showToast('Credencial activada correctamente');
      }).catch(() => showToast('Error al activar credencial', 'error'));
    } else if (confirm.action === 'desactivar' && confirm.credId) {
      credencialesApi.update(confirm.credId, { estatus: 'Inactiva' }).then(() => {
        setCreds(prev => prev.map(c => c.id === confirm.credId ? { ...c, estatus: 'Inactiva' } : c));
        showToast('Credencial desactivada');
      }).catch(() => showToast('Error al desactivar credencial', 'error'));
    } else if (confirm.action === 'reasignar' && confirm.credId) {
      showToast('Use el panel de reasignacion para asignar un nuevo chip', 'info');
    }

    closeConfirm();
  };

  const closeConfirm = () => {
    setConfirm({ open: false, type: 'simple', action: null, title: '', message: '' });
    setPasswordInput('');
    setPasswordError('');
  };

  const handleCloseAssignModal = () => {
    cleanupWs();
    setShowAssignModal(false);
    setAssignStep(1);
    setAssignMode('alumno');
    setAssignGroupId('');
    setStudentQuery('');
    setSelectedStudentId(null);
    setWriting(false);
    setWritten(false);
    setVerifying(false);
    setVerified(false);
    setChipId('');
    setBatchStudents([]);
    setBatchIndex(0);
    setBatchResults([]);
    setBatchWriting(false);
    setBatchWritten(false);
    setBatchVerifying(false);
    setBatchVerified(false);
    setBatchChipId('');
  };

  const handleWriteChip = useCallback(async (onDone: (chipId: string) => void) => {
    setWriting(true);
    try {
      const uid = await connectNfcWs(() => {});
      try {
        const existing = await credencialesApi.getByUid(uid);
        if (existing) {
          setWriting(false);
          showToast(`Este chip ya esta asignado a ${existing.alumno?.nombre || `alumno #${existing.alumno_id}`}. Usa otro chip.`, 'error');
          return;
        }
      } catch {
      }
      setChipId(uid);
      setWriting(false);
      setWritten(true);
      onDone(uid);
    } catch (err: unknown) {
      setWriting(false);
      const msg = err instanceof Error ? err.message : 'Error al detectar tarjeta NFC';
      showToast(msg, 'error');
    }
  }, [connectNfcWs, showToast]);

  const handleVerifyChip = useCallback(async (_chipIdToVerify: string, onDone: () => void) => {
    setVerifying(true);
    try {
      const uid = await connectNfcWs(() => {});
      if (uid.toUpperCase() === _chipIdToVerify.toUpperCase()) {
        setVerifying(false);
        setVerified(true);
        onDone();
      } else {
        setVerifying(false);
        showToast(`UID no coincide. Esperado: ${_chipIdToVerify}, Detectado: ${uid}`, 'error');
      }
    } catch (err: unknown) {
      setVerifying(false);
      const msg = err instanceof Error ? err.message : 'Error al verificar tarjeta NFC';
      showToast(msg, 'error');
    }
  }, [connectNfcWs, showToast]);

  const handleBatchWriteChip = useCallback(async (onDone: (chipId: string) => void) => {
    setBatchWriting(true);
    try {
      const uid = await connectNfcWs(() => {});
      try {
        const existing = await credencialesApi.getByUid(uid);
        if (existing) {
          setBatchWriting(false);
          showToast(`Este chip ya esta asignado a ${existing.alumno?.nombre || `alumno #${existing.alumno_id}`}. Usa otro chip.`, 'error');
          return;
        }
      } catch {
      }
      setBatchChipId(uid);
      setBatchWriting(false);
      setBatchWritten(true);
      onDone(uid);
    } catch (err: unknown) {
      setBatchWriting(false);
      const msg = err instanceof Error ? err.message : 'Error al detectar tarjeta NFC';
      showToast(msg, 'error');
    }
  }, [connectNfcWs, showToast]);

  const handleBatchVerifyChip = useCallback(async (_chipIdToVerify: string, onDone: () => void) => {
    setBatchVerifying(true);
    try {
      const uid = await connectNfcWs(() => {});
      if (uid.toUpperCase() === _chipIdToVerify.toUpperCase()) {
        setBatchVerifying(false);
        setBatchVerified(true);
        onDone();
      } else {
        setBatchVerifying(false);
        showToast(`UID no coincide. Esperado: ${_chipIdToVerify}, Detectado: ${uid}`, 'error');
      }
    } catch (err: unknown) {
      setBatchVerifying(false);
      const msg = err instanceof Error ? err.message : 'Error al verificar tarjeta NFC';
      showToast(msg, 'error');
    }
  }, [connectNfcWs, showToast]);

  const handleExportPDF = () => {
    if (exportMode === 'alumno' && exportStudentId !== 'none') {
      const student = localStudents.find(s => s.id === Number(exportStudentId));
      if (student) {
        generateCredentialsPDF({
          students: [student as any],
          groupName: `alumno_${student.matricula}`,
          reposicion: isReposicion,
        });
        showToast(`PDF generado: ${isReposicion ? 'reposicion' : 'credenciales'}_alumno_${student.matricula}.pdf`);
      }
    } else {
      const toExport = exportGroupId === 'all'
        ? localStudents.filter(s => s.estatus === 'Activo')
        : localStudents.filter(s => getGrupoNombre(s.grupo_id) === exportGroupId && s.estatus === 'Activo');
      const label = exportGroupId === 'all' ? 'general' : `grupo_${exportGroupId}`;
      generateCredentialsPDF({
        students: toExport as any,
        groupName: label,
        reposicion: isReposicion,
      });
      showToast(`PDF generado: ${isReposicion ? 'reposicion' : 'credenciales'}_${label}.pdf`);
    }
    setShowExportModal(false);
  };

  const filteredExportStudents = exportStudentQuery
    ? localStudents.filter(s => s.estatus === 'Activo' && (
        getFullName(s).toLowerCase().includes(exportStudentQuery.toLowerCase()) ||
        s.matricula.toLowerCase().includes(exportStudentQuery.toLowerCase()) ||
        getGrupoNombre(s.grupo_id).toLowerCase().includes(exportStudentQuery.toLowerCase())
      ))
    : [];

  const filteredStudents = localStudents.filter((s) => {
    if (!studentQuery) return false;
    const q = studentQuery.toLowerCase();
    return getFullName(s).toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q) || getGrupoNombre(s.grupo_id).toLowerCase().includes(q);
  });

  const canStartGroup = assignGroupId !== '' && localStudents.filter(s => getGrupoNombre(s.grupo_id) === assignGroupId && s.estatus === 'Activo').length > 0;
  const currentBatchStudent = batchStudents[batchIndex];
  const batchComplete = batchIndex >= batchStudents.length;

  const startBatchProcess = () => {
    const groupStudents = localStudents
      .filter(s => getGrupoNombre(s.grupo_id) === assignGroupId && s.estatus === 'Activo')
      .map(s => s.id);
    setBatchStudents(groupStudents);
    setBatchIndex(0);
    setBatchResults([]);
    setAssignStep(2);
  };

  const StepIndicator = ({ number, label, currentStep, completed }: { number: number; label: string; currentStep: number; completed: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: currentStep >= number ? 1 : 0.5 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: completed ? '#0F8122' : currentStep === number ? '#EB2466' : '#CAC6C7',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700,
      }}>
        {completed ? <Check size={14} /> : number}
      </div>
      <span style={{ fontSize: 14, fontWeight: currentStep === number ? 600 : 400 }}>{label}</span>
    </div>
  );

  const NfcZone = ({ state, size = 64 }: { state: 'idle' | 'writing' | 'written' | 'verifying' | 'verified'; size?: number }) => {
    const bgColor = state === 'verified' || state === 'written' ? '#70FE7D' : undefined;
    const iconColor = state === 'verified' || state === 'written' ? '#0F8122' : '#EB2466';
    return (
      <div className={`nfc-zone ${state === 'idle' || state === 'writing' || state === 'verifying' ? 'scanning' : ''}`} style={{ margin: '0 auto 16px' }}>
        <div className="nfc-zone-inner" style={{ background: bgColor }}>
          {(state === 'writing' || state === 'verifying') ? (
            <Loader2 size={size} color={iconColor} style={{ animation: 'spin 1s linear infinite' }} />
          ) : state === 'written' || state === 'verified' ? (
            <Check size={size} color={iconColor} />
          ) : (
            <Nfc size={size} color={iconColor} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 20px',
          borderRadius: 8,
          background: toast.type === 'success' ? '#0F8122' : toast.type === 'error' ? '#AB1748' : '#1792AB',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'fadeInContent 200ms ease-out',
        }}>
          {toast.message}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-center">
          <div className="input-wrapper">
            <Search size={18} className="input-icon" />
            <input type="text" className="input input--search" placeholder="Buscar por alumno, UID NFC..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn--primary" onClick={() => setShowAssignModal(true)}>
            <Plus size={18} /> Asignar nueva credencial
          </button>
          <button className="btn btn--secondary" onClick={handleSimulateScan}>
            <Nfc size={18} /> Escanear credencial
          </button>
          <button className="btn btn--secondary" onClick={() => { setExportMode('alumno'); setExportStudentId('none'); setExportGroupId('all'); setExportStudentQuery(''); setShowExportModal(true); }}>
            <Download size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="filter-tabs" style={{ padding: '12px 0' }}>
        {tabFilters.map((tab) => {
          const count = tab.key === 'Todas' ? creds.length : countByEstado(tab.key);
          return (
            <button key={tab.key} className={`filter-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}<span className="filter-tab-count">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th><th>Alumno</th><th>Matricula</th><th>UID NFC</th><th>Fecha Emision</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cred, index) => (
              <tr key={cred.id}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: 500 }}>{getStudentName(cred.alumno_id)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{getStudentControl(cred.alumno_id)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{cred.numero ?? '---'}</td>
                <td>{cred.fecha_emision ?? '---'}</td>
                <td><span className={estadoBadgeClass[(cred.estatus === 'Activa' || cred.estatus === 'ACTIVA') ? 'Activa' : 'Inactiva']}>{(cred.estatus === 'Activa' || cred.estatus === 'ACTIVA') ? 'Activa' : 'Inactiva'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="table-action" title="Ver detalle" onClick={() => handleView(cred.id)}><Eye size={18} /></button>
                    {(cred.estatus === 'Activa' || cred.estatus === 'ACTIVA') ? (
                      <button className="table-action" title="Desactivar" onClick={() => handleDeactivate(cred.id)}><Trash2 size={18} /></button>
                    ) : (
                      <button className="table-action" title="Activar" style={{ color: '#0F8122' }} onClick={() => handleActivate(cred.id)}><RefreshCw size={18} /></button>
                    )}
                    <button className="table-action" title="Reasignar chip" onClick={() => handleReassign(cred.id)}><RefreshCw size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#5F5657' }}>No se encontraron credenciales.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Reposiciones Recientes</h3>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>#</th><th>Alumno</th><th>Motivo</th><th>Fecha Solicitud</th><th>Fecha Entrega</th></tr></thead>
            <tbody>
              {repositionsData.map((repo, i) => (
                <tr key={repo.id}>
                  <td>{i + 1}</td><td style={{ fontWeight: 500 }}>{repo.alumno}</td><td>{repo.motivo}</td><td>{repo.fechaSolicitud}</td><td>{repo.fechaEntrega}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== MODAL ASIGNAR CREDENCIAL ========== */}
      {showAssignModal && (
        <div className="modal-backdrop" onClick={handleCloseAssignModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Asignar Nueva Credencial</h3>
              <button className="modal-close" onClick={handleCloseAssignModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <StepIndicator number={1} label="Seleccionar" currentStep={assignStep} completed={assignStep > 1} />
                <StepIndicator number={2} label="Escribir" currentStep={assignStep} completed={assignStep > 2} />
                <StepIndicator number={3} label="Verificar" currentStep={assignStep} completed={false} />
              </div>

              {/* ===== PASO 1: Seleccionar alumno o grupo ===== */}
              {assignStep === 1 && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button
                      className={`btn ${assignMode === 'alumno' ? 'btn--primary' : 'btn--secondary'}`}
                      onClick={() => { setAssignMode('alumno'); setSelectedStudentId(null); setStudentQuery(''); setAssignGroupId(''); }}
                      style={{ flex: 1 }}
                    >
                      Por alumno
                    </button>
                    <button
                      className={`btn ${assignMode === 'grupo' ? 'btn--primary' : 'btn--secondary'}`}
                      onClick={() => { setAssignMode('grupo'); setSelectedStudentId(null); setStudentQuery(''); setAssignGroupId(''); }}
                      style={{ flex: 1 }}
                    >
                      Por grupo
                    </button>
                  </div>

                  {assignMode === 'alumno' && (
                    <div>
                      <div className="input-group" style={{ marginBottom: 16 }}>
                        <div className="input-wrapper">
                          <Search size={18} className="input-icon" />
                          <input type="text" className="input input--search" placeholder="Buscar por nombre, grupo o matricula..." value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} />
                        </div>
                      </div>
                      {studentQuery && filteredStudents.length > 0 && (
                        <div style={{ border: '1px solid #CAC6C7', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                          {filteredStudents.map((s) => (
                            <div key={s.id} style={{ padding: '10px 16px', cursor: 'pointer', background: selectedStudentId === s.id ? '#FEEBEE' : '#fff', borderBottom: '1px solid #F0EFEF' }} onClick={() => { setSelectedStudentId(s.id); setStudentQuery(getFullName(s)); }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{getFullName(s)}</div>
                              <div style={{ fontSize: 13, color: '#5F5657' }}>Grupo: {getGrupoNombre(s.grupo_id)} &mdash; Matricula: {s.matricula}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedStudentId && (
                        <div style={{ marginTop: 16, padding: 16, background: '#F0EFEF', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, color: '#5F5657', marginBottom: 4 }}>Alumno seleccionado</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{getStudentName(selectedStudentId)}</div>
                          <div style={{ fontSize: 14, color: '#5F5657' }}>Matricula: {getStudentControl(selectedStudentId)} &mdash; Grupo: {getStudentGroup(selectedStudentId)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {assignMode === 'grupo' && (
                    <div>
                      <div className="input-group" style={{ marginBottom: 16 }}>
                        <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>Seleccionar grupo</label>
                        <select className="select" value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)}>
                          <option value="">Elegir un grupo</option>
                          {uniqueGroups.map((g) => {
                            const count = localStudents.filter((s) => getGrupoNombre(s.grupo_id) === g && s.estatus === 'Activo').length;
                            return <option key={g} value={g}>Grupo {g} ({count} alumnos)</option>;
                          })}
                        </select>
                      </div>
                      {assignGroupId && (
                        <div style={{ padding: 16, background: '#F0EFEF', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, color: '#5F5657', marginBottom: 4 }}>Alumnos del grupo</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            {localStudents.filter(s => getGrupoNombre(s.grupo_id) === assignGroupId && s.estatus === 'Activo').length} alumnos activos
                          </div>
                          <div style={{ fontSize: 13, color: '#5F5657', marginTop: 4 }}>
                            Se escribiran y verificaran los chips NFC uno por uno
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ===== PASO 2: Escribir chip NFC ===== */}
              {assignStep === 2 && assignMode === 'alumno' && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ marginBottom: 16, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{getStudentName(selectedStudentId!)}</div>
                    <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {getStudentControl(selectedStudentId!)}</div>
                  </div>
                  <NfcZone state={writing ? 'writing' : written ? 'written' : 'idle'} />
                  {nfcStatus === 'connecting' && (
                    <p style={{ fontSize: 13, color: '#1792AB', marginBottom: 8 }}>Conectando al lector NFC...</p>
                  )}
                  {nfcStatus === 'waiting' && (
                    <p style={{ fontSize: 13, color: '#EB2466', marginBottom: 8, fontWeight: 600 }}>Esperando tarjeta NFC... Acerque la tarjeta al lector</p>
                  )}
                  <p style={{ fontSize: 16, color: '#5F5657', marginBottom: 16 }}>
                    {writing ? 'Leyendo tarjeta NFC...' : written ? 'UID capturado correctamente' : 'Acerca el chip NFC al lector para asociarlo al alumno'}
                  </p>
                  {written && chipId && (
                    <div style={{ padding: 12, background: '#F0EFEF', borderRadius: 8, display: 'inline-block' }}>
                      <span style={{ fontSize: 12, color: '#5F5657' }}>UID NFC capturado: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{chipId}</span>
                    </div>
                  )}
                  {!writing && !written && (
                    <button className="btn btn--primary" onClick={() => handleWriteChip(() => {})} disabled={nfcStatus === 'connecting' || nfcStatus === 'waiting'}>
                      <Nfc size={18} /> Detectar tarjeta NFC
                    </button>
                  )}
                </div>
              )}

              {assignStep === 2 && assignMode === 'grupo' && (
                <div style={{ padding: 16 }}>
                  {batchComplete ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0F8122', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Check size={32} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Proceso completado</h3>
                      <p style={{ fontSize: 14, color: '#5F5657', marginBottom: 16 }}>
                        {batchResults.length} de {batchStudents.length} credenciales asignadas correctamente
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', textAlign: 'left' }}>
                        {batchResults.map((result, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: result.success ? '#F0FDF4' : '#FEF2F2', borderRadius: 6 }}>
                            {result.success ? <Check size={16} color="#0F8122" /> : <X size={16} color="#AB1748" />}
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{getStudentName(result.studentId)}</span>
                            <span style={{ fontSize: 12, color: '#5F5657', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{result.uidNfc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: '#5F5657', marginBottom: 4 }}>Alumno {batchIndex + 1} de {batchStudents.length}</div>
                        <div style={{ width: '100%', height: 6, background: '#F0EFEF', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${((batchIndex) / batchStudents.length) * 100}%`, height: '100%', background: '#EB2466', transition: 'width 300ms' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 16, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{getStudentName(currentBatchStudent)}</div>
                        <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {getStudentControl(currentBatchStudent)}</div>
                      </div>
                      <NfcZone state={batchWriting ? 'writing' : batchWritten ? 'written' : 'idle'} />
                      <p style={{ fontSize: 16, color: '#5F5657', marginBottom: 16 }}>
                        {batchWriting ? 'Escribiendo datos en el chip NFC...' : batchWritten ? 'Escritura completada' : 'Acerca el chip NFC al lector para escribir'}
                      </p>
                      {batchWritten && batchChipId && (
                        <div style={{ padding: 12, background: '#F0EFEF', borderRadius: 8, display: 'inline-block', marginBottom: 16 }}>
                          <span style={{ fontSize: 12, color: '#5F5657' }}>ID del Chip: </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{batchChipId}</span>
                        </div>
                      )}
                      {!batchWriting && !batchWritten && (
                        <button className="btn btn--primary" onClick={() => handleBatchWriteChip(() => {})}>
                          <Nfc size={18} /> Escribir chip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ===== PASO 3: Verificar chip NFC ===== */}
              {assignStep === 3 && assignMode === 'alumno' && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ marginBottom: 16, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{getStudentName(selectedStudentId!)}</div>
                    <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {getStudentControl(selectedStudentId!)}</div>
                  </div>
                  <NfcZone state={verifying ? 'verifying' : verified ? 'verified' : 'idle'} />
                  <p style={{ fontSize: 16, color: '#5F5657', marginBottom: 16 }}>
                    {verifying ? 'Leyendo tarjeta NFC para verificar...' : verified ? 'Verificacion exitosa. El UID coincide.' : 'Acerca la misma tarjeta NFC al lector para verificar'}
                  </p>
                  {verified && (
                    <div style={{ padding: 16, background: '#F0FDF4', borderRadius: 8, border: '1px solid #0F8122', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Check size={16} color="#0F8122" />
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#0F8122' }}>Datos verificados correctamente</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5F5657' }}>
                        <span>Alumno: <strong>{getStudentName(selectedStudentId!)}</strong></span>
                        <span>Control: <strong>{getStudentControl(selectedStudentId!)}</strong></span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: '#5F5657' }}>
                        Chip: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{chipId}</span>
                      </div>
                    </div>
                  )}
                  {!verifying && !verified && (
                    <button className="btn btn--primary" onClick={() => handleVerifyChip(chipId, () => {})} disabled={nfcStatus === 'connecting' || nfcStatus === 'waiting'}>
                      <Nfc size={18} /> Detectar tarjeta para verificar
                    </button>
                  )}
                </div>
              )}

              {assignStep === 3 && assignMode === 'grupo' && batchComplete && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0F8122', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Check size={32} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verificacion completada</h3>
                  <p style={{ fontSize: 14, color: '#5F5657', marginBottom: 16 }}>
                    Todos los chips han sido verificados exitosamente
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto', textAlign: 'left' }}>
                    {batchResults.map((result, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #0F8122' }}>
                        <Check size={16} color="#0F8122" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{getStudentName(result.studentId)}</div>
                          <div style={{ fontSize: 12, color: '#5F5657' }}>Control: {getStudentControl(result.studentId)}</div>
                        </div>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F8122' }}>{result.uidNfc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={handleCloseAssignModal}>Cancelar</button>

              {assignStep === 1 && assignMode === 'alumno' && (
                <button className="btn btn--primary" disabled={!selectedStudentId} onClick={() => setAssignStep(2)}>
                  Siguiente
                </button>
              )}
              {assignStep === 1 && assignMode === 'grupo' && (
                <button className="btn btn--primary" disabled={!canStartGroup} onClick={startBatchProcess}>
                  Iniciar proceso
                </button>
              )}

              {assignStep === 2 && assignMode === 'alumno' && written && (
                <button className="btn btn--primary" onClick={() => setAssignStep(3)}>
                  Siguiente: Verificar
                </button>
              )}
              {assignStep === 2 && assignMode === 'grupo' && !batchComplete && batchWritten && (
                <button className="btn btn--primary" onClick={() => {
                  handleBatchVerifyChip(batchChipId, () => {});
                }}>
                  Verificar chip
                </button>
              )}
              {assignStep === 2 && assignMode === 'grupo' && !batchComplete && batchVerified && (
                <button className="btn btn--primary" onClick={() => {
                  setBatchResults(prev => [...prev, { studentId: currentBatchStudent, uidNfc: batchChipId, success: true }]);
                  setBatchWriting(false);
                  setBatchWritten(false);
                  setBatchVerifying(false);
                  setBatchVerified(false);
                  setBatchChipId('');
                  setBatchIndex(prev => prev + 1);
                }}>
                  Siguiente alumno
                </button>
              )}
              {assignStep === 2 && assignMode === 'grupo' && batchComplete && (
                <button className="btn btn--primary" onClick={() => setAssignStep(3)}>
                  Ver resumen
                </button>
              )}

              {assignStep === 3 && assignMode === 'alumno' && verified && (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    const newCred: CredencialCreate = {
                      alumno_id: selectedStudentId!,
                      numero: chipId,
                      estatus: 'Activa',
                      fecha_emision: new Date().toISOString().split('T')[0],
                    };
                    credencialesApi.create(newCred).then((created) => {
                      setCreds(prev => [...prev, created]);
                      showToast(`Credencial asignada a ${getStudentName(selectedStudentId!)}`);
                      handleCloseAssignModal();
                    }).catch((err) => {
                      const msg = err?.response?.data?.detail ?? err?.message ?? 'Error al crear credencial';
                      showToast(msg, 'error');
                    });
                  }}
                >
                  <Check size={18} /> Confirmar Asignacion
                </button>
              )}
              {assignStep === 3 && assignMode === 'grupo' && batchComplete && (
                <button
                  className="btn btn--primary"
                  onClick={async () => {
                    const successfulResults = batchResults.filter(r => r.success);
                    try {
                      const createdCreds = await Promise.all(
                        successfulResults.map(result =>
                          credencialesApi.create({
                            alumno_id: result.studentId,
                            numero: result.uidNfc,
                            estatus: 'Activa',
                            fecha_emision: new Date().toISOString().split('T')[0],
                          })
                        )
                      );
                      setCreds(prev => [...prev, ...createdCreds]);
                      showToast(`${successfulResults.length} credenciales asignadas correctamente`);
                      handleCloseAssignModal();
                    } catch (err: any) {
                      const msg = err?.response?.data?.detail ?? err?.message ?? 'Error al asignar credenciales';
                      showToast(msg, 'error');
                    }
                  }}
                >
                  <Check size={18} /> Confirmar Asignacion
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL CONFIRMACION ========== */}
      {confirm.open && (
        <div className="modal-backdrop" onClick={closeConfirm} style={{ zIndex: 9998 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {confirm.type === 'password' ? <Shield size={20} color="#AB1748" /> : <AlertTriangle size={20} color="#1792AB" />}
                {confirm.title}
              </h3>
              <button className="modal-close" onClick={closeConfirm}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#5F5657', lineHeight: 1.6, marginBottom: confirm.type === 'password' ? 16 : 0 }}>
                {confirm.message}
              </p>
              {confirm.type === 'password' && (
                <div>
                  <label className="field-label" style={{ marginBottom: 6, display: 'block' }}>Contraseña del sistema</label>
                  <input
                    type="password"
                    className={`input ${passwordError ? 'input--error' : ''}`}
                    placeholder="Ingrese la contraseña..."
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAction(); }}
                    autoFocus
                  />
                  {passwordError && (
                    <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{passwordError}</span>
                  )}
                  <span style={{ fontSize: 11, color: '#85787A', marginTop: 6, display: 'block' }}>Contraseña por defecto: admin123</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={closeConfirm}>Cancelar</button>
              <button
                className={confirm.type === 'password' ? 'btn btn--danger' : 'btn btn--primary'}
                onClick={handleConfirmAction}
                disabled={confirm.type === 'password' && !passwordInput}
              >
                {confirm.action === 'activar' && <><RefreshCw size={16} /> Activar</>}
                {confirm.action === 'desactivar' && <><Trash2 size={16} /> Desactivar</>}
                {confirm.action === 'reasignar' && <><RefreshCw size={16} /> Reasignar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL ESCANEAR CREDENCIAL ========== */}
      {scanModalOpen && (
        <div className="modal-backdrop" onClick={closeScanModal} style={{ zIndex: 9998 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Nfc size={20} color="#EB2466" />
                Escanear credencial NFC
              </h3>
              <button className="modal-close" onClick={closeScanModal}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: 24 }}>

              {scanState === 'scanning' && (
                <>
                  <NfcZone state="verifying" size={72} />
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1819', marginBottom: 8 }}>
                    Esperando tarjeta NFC...
                  </p>
                  <p style={{ fontSize: 13, color: '#5F5657' }}>
                    Acerca la credencial al lector para escanear
                  </p>
                </>
              )}

              {scanState === 'found' && scannedCredential && (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #0F8122' }}>
                    <Check size={32} color="#0F8122" />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#0F8122', marginBottom: 16 }}>
                    Credencial detectada correctamente
                  </p>

                  <div style={{ background: '#F8F7F7', borderRadius: 8, padding: 16, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>UID NFC</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#EB2466' }}>{scannedChipId}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #F0EFEF', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>Alumno</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1819', textAlign: 'right' }}>{scannedStudent ? getFullName(scannedStudent) : '---'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>Matricula</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#1C1819' }}>{scannedStudent?.matricula ?? '---'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>Grupo</span>
                      <span style={{ fontSize: 13, color: '#1C1819' }}>{scannedStudent ? getGrupoNombre(scannedStudent.grupo_id) : '---'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>Email</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#1C1819' }}>{scannedStudent?.email ?? '---'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#85787A', fontWeight: 600 }}>Estado</span>
                      <span className={(scannedCredential.estatus === 'Activa' || scannedCredential.estatus === 'ACTIVA') ? 'badge badge--active' : 'badge badge--inactive'}>
                        {(scannedCredential.estatus === 'Activa' || scannedCredential.estatus === 'ACTIVA') ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {scanState === 'not-found' && (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #AB1748' }}>
                    <X size={32} color="#AB1748" />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#AB1748', marginBottom: 8 }}>
                    No se detecto ninguna credencial
                  </p>
                  <p style={{ fontSize: 13, color: '#5F5657' }}>
                    Intente acercar la credencial al lector nuevamente
                  </p>
                </>
              )}

            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={closeScanModal}>Cerrar</button>
              {scanState === 'scanning' && (
                <button className="btn btn--secondary" onClick={() => {
                  setScanState('scanning');
                  connectNfcWs(() => {}, 30000)
                    .then(async (uid) => {
                      setScannedChipId(uid);
                      try {
                        const found = await credencialesApi.getByUid(uid);
                        setScannedCredential(found);
                        setScannedStudent(getStudent(found.alumno_id) ?? null);
                        setScanState('found');
                      } catch {
                        setScanState('not-found');
                      }
                    })
                    .catch(() => setScanState('not-found'));
                }}>
                  <Loader2 size={16} /> Reintentar
                </button>
              )}
              {scanState === 'not-found' && (
                <button className="btn btn--primary" onClick={() => {
                  setScanState('scanning');
                  connectNfcWs(() => {}, 30000)
                    .then(async (uid) => {
                      setScannedChipId(uid);
                      try {
                        const found = await credencialesApi.getByUid(uid);
                        setScannedCredential(found);
                        setScannedStudent(getStudent(found.alumno_id) ?? null);
                        setScanState('found');
                      } catch {
                        setScanState('not-found');
                      }
                    })
                    .catch(() => setScanState('not-found'));
                }}>
                  <RefreshCw size={16} /> Reintentar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL EXPORTAR PDF ========== */}
      {showExportModal && (
        <div className="modal-backdrop" onClick={() => setShowExportModal(false)} style={{ zIndex: 9997 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={20} color="#EB2466" />
                Exportar credenciales PDF
              </h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#5F5657', marginBottom: 20 }}>
                Selecciona el modo de exportacion de credenciales.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  className={`btn ${exportMode === 'alumno' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => { setExportMode('alumno'); setExportStudentId('none'); setExportStudentQuery(''); }}
                  style={{ flex: 1 }}
                >
                  Por alumno
                </button>
                <button
                  className={`btn ${exportMode === 'grupo' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => { setExportMode('grupo'); setExportStudentId('none'); }}
                  style={{ flex: 1 }}
                >
                  Por grupo
                </button>
              </div>

              {exportMode === 'alumno' && (
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>Buscar alumno por nombre, Matricula o grupo</label>
                  <div className="input-wrapper">
                    <Search size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input input--search"
                      placeholder="Ej. 25B2707058 o nombre..."
                      value={exportStudentQuery}
                      onChange={(e) => { setExportStudentQuery(e.target.value); setExportStudentId('none'); }}
                    />
                  </div>
                  {exportStudentQuery && filteredExportStudents.length > 0 && (
                    <div style={{ border: '1px solid #CAC6C7', borderRadius: 8, maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                      {filteredExportStudents.map((s) => (
                        <div
                          key={s.id}
                          style={{ padding: '10px 16px', cursor: 'pointer', background: exportStudentId === String(s.id) ? '#FEEBEE' : '#fff', borderBottom: '1px solid #F0EFEF' }}
                          onClick={() => { setExportStudentId(String(s.id)); setExportStudentQuery(getFullName(s)); }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{getFullName(s)}</div>
                          <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {s.matricula} &mdash; Grupo: {getGrupoNombre(s.grupo_id)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {exportStudentQuery && filteredExportStudents.length === 0 && (
                    <div style={{ padding: '12px 16px', color: '#5F5657', fontSize: 13, textAlign: 'center', background: '#F0EFEF', borderRadius: 8, marginTop: 8 }}>
                      No se encontraron alumnos con ese criterio
                    </div>
                  )}
                  {exportStudentId !== 'none' && (
                    <div style={{ marginTop: 8, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#5F5657', marginBottom: 2 }}>Alumno seleccionado</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{localStudents.find(s => s.id === Number(exportStudentId)) ? getFullName(localStudents.find(s => s.id === Number(exportStudentId))!) : ''}</div>
                      <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {localStudents.find(s => s.id === Number(exportStudentId))?.matricula}</div>
                    </div>
                  )}
                </div>
              )}

              {exportMode === 'grupo' && (
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>Seleccionar grupo</label>
                  <select
                    className="select"
                    value={exportGroupId}
                    onChange={(e) => setExportGroupId(e.target.value)}
                  >
                    <option value="all">Todos los alumnos activos ({localStudents.filter(s => s.estatus === 'Activo').length})</option>
                    {uniqueGroups.map((g) => {
                      const count = localStudents.filter((s) => getGrupoNombre(s.grupo_id) === g && s.estatus === 'Activo').length;
                      return (
                        <option key={g} value={g}>
                          Grupo {g} ({count} alumnos)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #CAC6C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isReposicion ? '#FEEBEE' : '#fff',
                transition: 'background 150ms',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1819' }}>Reposicion</div>
                  <div style={{ fontSize: 12, color: '#85787A' }}>Marcar el PDF como reposicion de credencial</div>
                </div>
                <button
                  onClick={() => setIsReposicion(!isReposicion)}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: isReposicion ? '#EB2466' : '#CAC6C7',
                    position: 'relative', transition: 'background 200ms',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2, left: isReposicion ? 24 : 2,
                    transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowExportModal(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleExportPDF} disabled={exportMode === 'alumno' && exportStudentId === 'none'}>
                <Download size={16} /> Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PANEL LATERAL DETALLE CREDENCIAL ========== */}
      {selectedCredentialId !== null && (() => {
        const cred = creds.find(c => c.id === selectedCredentialId);
        if (!cred) return null;
        const student = getStudent(cred.alumno_id);
        if (!student) return null;

        const isCredActive = cred.estatus === 'Activa' || cred.estatus === 'ACTIVA';
        const estadoBadge: Record<string, string> = {
          Activa: 'badge badge--active',
          Inactiva: 'badge badge--inactive',
        };

        const closePanel = () => { cleanupWs(); setSelectedCredentialId(null); setPanelMode('view'); };

        const handleWriteReassignChip = async () => {
          setReassignWriting(true);
          try {
            const uid = await connectNfcWs(() => {});
            setNewChipId(uid);
            setReassignWriting(false);
            setReassignWritten(true);
          } catch (err: unknown) {
            setReassignWriting(false);
            showToast(err instanceof Error ? err.message : 'Error al detectar tarjeta NFC', 'error');
          }
        };

        const handleConfirmReassign = () => {
          credencialesApi.update(cred.id, { numero: newChipId, estatus: 'Activa' }).then(() => {
            setCreds(prev => prev.map(c => c.id === cred.id ? { ...c, numero: newChipId, estatus: 'Activa' } : c));
            showToast(`Chip reasignado correctamente. Nuevo ID: ${newChipId}`);
            closePanel();
          }).catch(() => showToast('Error al reasignar chip', 'error'));
        };

        return (
          <>
            <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />
            <div style={{
              position: 'fixed', top: 0, right: 0, width: 480, height: '100vh',
              background: '#fff', zIndex: 1000, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
              overflowY: 'auto', animation: 'slideInRight 0.3s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px 0', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  {panelMode === 'view' ? 'Detalle de Credencial' : 'Reasignar Chip NFC'}
                </h2>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 32px 24px', borderBottom: '1px solid #F0EFEF', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F0EFEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={36} color="#85787A" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1819' }}>{getFullName(student)}</div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#EB2466', marginTop: 2 }}>{student.matricula}</div>
                  <div style={{ fontSize: 13, color: '#5F5657', marginTop: 2 }}>Grupo: {getGrupoNombre(student.grupo_id)}</div>
                </div>
              </div>

              {/* ===== MODO VER ===== */}
              {panelMode === 'view' && (
                <>
                  <div style={{ padding: '0 32px', marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#EB2466', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Informacion general</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Nombre</span><div style={{ fontWeight: 500 }}>{getFullName(student)}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Matricula</span><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{student.matricula}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Grupo</span><div style={{ fontWeight: 500 }}>{getGrupoNombre(student.grupo_id)}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Email</span><div style={{ fontWeight: 500 }}>{student.email ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Telefono</span><div style={{ fontWeight: 500 }}>{student.telefono ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Estado</span><div><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: student.estatus === 'Activo' ? '#FEEBEE' : '#F0EFEF', color: student.estatus === 'Activo' ? '#0F8122' : '#5F5657' }}>{student.estatus === 'Activo' ? 'Activo' : 'Inactivo'}</span></div></div>
                    </div>
                  </div>
                  <div style={{ padding: '0 32px', marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#EB2466', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Credencial NFC</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>UID NFC</span><div style={{ fontWeight: 500, fontFamily: 'monospace', color: '#0F8122' }}>{cred.numero ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Fecha emision</span><div style={{ fontWeight: 500 }}>{cred.fecha_emision ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Estado</span><div><span className={estadoBadge[isCredActive ? 'Activa' : 'Inactiva']}>{isCredActive ? 'Activa' : 'Inactiva'}</span></div></div>
                    </div>
                  </div>
                  <div style={{ padding: '0 32px', marginBottom: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#EB2466', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Contacto</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#5F5657', fontSize: 12 }}>Direccion</span><div style={{ fontWeight: 500 }}>{student.direccion ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Email</span><div style={{ fontWeight: 500 }}>{student.email ?? '---'}</div></div>
                      <div><span style={{ color: '#5F5657', fontSize: 12 }}>Telefono</span><div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{student.telefono ?? '---'}</div></div>
                    </div>
                  </div>
                </>
              )}

              {/* ===== MODO REASIGNAR ===== */}
              {panelMode === 'reassign' && (
                <div style={{ padding: '0 32px', marginBottom: 32 }}>
                  {reassignStep === 'confirm' && (
                    <>
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
                          <span style={{ fontWeight: 600 }}>{getFullName(student)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#5F5657' }}>Chip actual:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#AB1748' }}>{cred.numero ?? '---'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#5F5657' }}>Accion:</span>
                          <span style={{ fontWeight: 600, color: '#AB1748' }}>Dado de baja + Nuevo chip</span>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={closePanel} style={{ padding: '8px 16px', border: '1px solid #CAC6C7', borderRadius: 8, background: '#fff', color: '#5F5657', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancelar</button>
                        <button onClick={() => setReassignStep('write')} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#AB1748', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)' }}>
                          <RefreshCw size={16} /> Continuar
                        </button>
                      </div>
                    </>
                  )}

                  {reassignStep === 'write' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: 16, padding: 12, background: '#FEEBEE', borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{getFullName(student)}</div>
                        <div style={{ fontSize: 13, color: '#5F5657' }}>Matricula: {student.matricula}</div>
                      </div>
                      <div className={`nfc-zone ${reassignWriting ? 'scanning' : reassignWritten ? '' : 'scanning'}`} style={{ margin: '0 auto 16px' }}>
                        <div className="nfc-zone-inner" style={{ background: reassignWritten ? '#70FE7D' : undefined }}>
                          {reassignWriting ? (
                            <Loader2 size={64} color="#EB2466" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : reassignWritten ? (
                            <Check size={64} color="#0F8122" />
                          ) : (
                            <Nfc size={64} color="#EB2466" />
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 15, color: '#5F5657', marginBottom: 16 }}>
                        {reassignWriting ? 'Escribiendo datos en el nuevo chip NFC...' : reassignWritten ? 'Escritura completada correctamente' : 'Acerca el nuevo chip NFC al lector para escribir'}
                      </p>
                      {reassignWritten && newChipId && (
                        <div style={{ padding: 12, background: '#F0EFEF', borderRadius: 8, display: 'inline-block', marginBottom: 16 }}>
                          <span style={{ fontSize: 12, color: '#5F5657' }}>Nuevo ID del Chip: </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#0F8122' }}>{newChipId}</span>
                        </div>
                      )}
                      {!reassignWriting && !reassignWritten && (
                        <button onClick={handleWriteReassignChip} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: '#EB2466', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
                          <Nfc size={18} /> Escribir chip
                        </button>
                      )}
                      {reassignWritten && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button onClick={closePanel} style={{ padding: '8px 16px', border: '1px solid #CAC6C7', borderRadius: 8, background: '#fff', color: '#5F5657', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancelar</button>
                          <button onClick={handleConfirmReassign} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#0F8122', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)' }}>
                            <Check size={16} /> Confirmar reasignacion
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        );
      })()}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
