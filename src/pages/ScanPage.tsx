import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, ArrowUp, CheckCircle, XCircle, AlertTriangle, Nfc, Lock, Search, LogOut, X as XIcon, Wifi, WifiOff, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { registrosApi, alumnosApi, credencialesApi } from '../api';
import { nfcApi } from '../api/nfc';
import type { RegistroAcceso, Alumno, Credencial } from '../types';
import { toastSuccess, toastError } from '../lib/toast';
import { normalizeText } from '../lib/normalizeText';

const getFullName = (alumno: Alumno) =>
  `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno}`.trim();

type ScanResultType = 'entry' | 'exit' | 'late' | 'denied';

type ScanResult = {
  type: ScanResultType;
  student: Alumno | null;
  studentName: string;
  time: string;
  message?: string;
} | null;

type ViewMode = 'scan' | 'manual';

export default function ScanPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'entrada' | 'salida'>('entrada');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [records, setRecords] = useState<RegistroAcceso[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('scan');
  const [wsConnected, setWsConnected] = useState(false);

  const [manualQuery, setManualQuery] = useState('');
  const [manualSelected, setManualSelected] = useState<Alumno | null>(null);
  const [showManualDropdown, setShowManualDropdown] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [codigoPermiso, setCodigoPermiso] = useState('');

  const [alumnosList, setAlumnosList] = useState<Alumno[]>([]);
  const [credencialesList, setCredencialesList] = useState<Credencial[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estacionAbierta, setEstacionAbierta] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [alumnosData, credencialesData, registrosData] = await Promise.all([
          alumnosApi.getAll(),
          credencialesApi.getAll(),
          registrosApi.getAll(),
        ]);
        setAlumnosList(alumnosData);
        setCredencialesList(credencialesData);
        setRecords(registrosData);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  const alumnoMap = Object.fromEntries(alumnosList.map(a => [a.id, a]));

  const manualResults = (!manualQuery || manualSelected)
    ? []
    : alumnosList.filter(s =>
        normalizeText(getFullName(s)).includes(normalizeText(manualQuery)) ||
        normalizeText(s.matricula).includes(normalizeText(manualQuery))
      ).slice(0, 6);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = nfcApi.connectWebSocket(
      (msg) => {
        if (msg.type === 'scan_result' && msg.uid_nfc) {
          setIsScanning(true);
          const now = new Date();
          const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          if (msg.status === 'success' && msg.alumno) {
            const type: ScanResultType = msg.tipo_evento === 'SALIDA' ? 'exit' : 'entry';
            const alumnoFromMap = alumnoMap[Number(msg.alumno.id)] || null;
            setScanResult({
              type,
              student: alumnoFromMap,
              studentName: msg.alumno.nombre,
              time,
            });

            const alumnoCompleto: Alumno | undefined = alumnoFromMap || {
              id: msg.alumno.id,
              matricula: msg.alumno.matricula,
              nombre: msg.alumno.nombre,
              apellido_paterno: '',
              apellido_materno: '',
              estatus: 'Activo',
            };
            const newRecord: RegistroAcceso = {
              id: msg.registro_id || Date.now(),
              alumno_id: msg.alumno.id,
              credencial_id: msg.credencial_id,
              fecha_hora: msg.timestamp || now.toISOString(),
              tipo_acceso: msg.tipo_evento || 'ENTRADA',
              estatus: 'Activo',
              alumno: alumnoCompleto,
            };
            setRecords(prev => [newRecord, ...prev].slice(0, 20));
          } else {
            setScanResult({
              type: 'denied',
              student: null,
              studentName: msg.message || 'Credencial no reconocida',
              time,
              message: msg.message,
            });
          }

          if (scanTimeout.current) clearTimeout(scanTimeout.current);
          scanTimeout.current = setTimeout(() => {
            setScanResult(null);
            setIsScanning(false);
          }, 5000);
        }
      },
      () => setWsConnected(true),
      () => {
        setWsConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connectWS, 3000);
      }
    );
    wsRef.current = ws;
  }, [alumnoMap]);

  useEffect(() => {
    connectWS();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
      wsRef.current?.close();
    };
  }, [connectWS]);

  // Abre la estación solo mientras esta pantalla está abierta (con sesión).
  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const open = async () => {
      try {
        await nfcApi.abrirEstacion();
        if (!cancelled) setEstacionAbierta(true);
        heartbeat = setInterval(() => {
          nfcApi.heartbeatEstacion().catch(() => setEstacionAbierta(false));
        }, 30000);
      } catch {
        if (!cancelled) setEstacionAbierta(false);
      }
    };
    open();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      setEstacionAbierta(false);
      nfcApi.cerrarEstacion().catch(() => {});
    };
  }, []);

  const handleManualSave = async () => {
    if (!manualSelected) return;
    setManualSaving(true);

    try {
      const now = new Date();
      const nowISO = now.toISOString();
      const cred = credencialesList.find(c => c.alumno_id === manualSelected.id);

      const created = await registrosApi.create({
        alumno_id: manualSelected.id,
        credencial_id: cred?.id ?? 0,
        fecha_hora: nowISO,
        tipo_acceso: 'SALIDA',
        codigo_autorizacion: codigoPermiso.trim() || undefined,
      });

      setRecords(prev => [created, ...prev].slice(0, 20));
      const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScanResult({ type: 'exit', student: manualSelected, studentName: getFullName(manualSelected), time });
      setManualQuery('');
      setManualSelected(null);
      setCodigoPermiso('');
      setManualSaving(false);
      setViewMode('scan');
      toastSuccess(codigoPermiso.trim() ? 'Salida registrada con permiso validado.' : 'Salida registrada correctamente.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toastError(typeof detail === 'string' ? detail : 'No se pudo registrar la salida.');
      setManualSaving(false);
    }
  };

  const getRecordTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA': return 'Entrada';
      case 'SALIDA': return 'Salida';
      default: return tipo;
    }
  };

  const credencialesMap = Object.fromEntries(credencialesList.map(c => [c.id, c]));

  const displayRecords = records.slice(0, 20).map(r => {
    let alumno = r.alumno || alumnoMap[r.alumno_id];
    if (!alumno && r.credencial_id) {
      const cred = credencialesMap[r.credencial_id];
      if (cred?.alumno_id) {
        alumno = alumnoMap[cred.alumno_id] || null;
      }
    }
    return {
      id: r.id,
      tipo: r.tipo_acceso,
      time: r.fecha_hora?.split('T')[1] ?? '',
      alumnoNombre: alumno ? getFullName(alumno) : 'Desconocido',
      alumnoGrupo: alumno?.id_grupo ? String(alumno.id_grupo) : '---',
    };
  });

  return (
    <div className="scan-page">
      {/* Status de conexion */}
      <div className={`scan-status-bar ${wsConnected && estacionAbierta ? 'scan-status-bar--ok' : 'scan-status-bar--error'}`}>
        {wsConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        {!estacionAbierta
          ? 'Estación cerrada — no se registrarán lecturas del lector físico'
          : wsConnected
            ? 'Estación abierta — lector NFC listo, esperando tarjeta...'
            : 'Estación abierta — reconectando WebSocket...'}
      </div>

      {/* PESTANAS */}
      {viewMode === 'scan' && (
        <div className="scan-tabs">
          <button className={`scan-tab ${activeTab === 'entrada' ? 'active' : ''}`} onClick={() => setActiveTab('entrada')}>
            <ArrowDown size={22} />
            Entrada
          </button>
          <button className={`scan-tab ${activeTab === 'salida' ? 'active' : ''}`} onClick={() => setActiveTab('salida')}>
            <ArrowUp size={22} />
            Salida
          </button>
        </div>
      )}

      {viewMode === 'scan' ? (
        <div className="scan-nfc-container">
          <div className={`nfc-zone ${isScanning ? 'scanning' : ''}`}>
            <div className="nfc-zone-inner">
              <Nfc size={64} color="#EB2466" />
            </div>
          </div>
          <div className="nfc-zone-text">
            {isScanning ? 'Procesando tarjeta...' : 'Acerca la credencial al lector'}
          </div>
        </div>
      ) : (
        <div className="scan-manual">
          <div className="scan-manual-header">
            <div className="scan-manual-header-icon">
              <LogOut size={22} color="#AB1748" />
            </div>
            <div>
              <div className="scan-manual-header-title">Salida sin credencial</div>
              <div className="scan-manual-header-sub">Busca al alumno y registra su salida manualmente</div>
            </div>
          </div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div className="input-wrapper">
              <Search size={16} className="input-icon" />
              <input type="text" className="input input--search" placeholder="Buscar alumno por nombre o matrícula..." value={manualQuery} onChange={(e) => { setManualQuery(e.target.value); setManualSelected(null); setShowManualDropdown(true); }} onFocus={() => { if (!manualSelected && manualQuery) setShowManualDropdown(true); }} onBlur={() => setTimeout(() => setShowManualDropdown(false), 200)} />
              {manualSelected && (
                <button onClick={() => { setManualSelected(null); setManualQuery(''); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 2 }}>
                  <XIcon size={16} />
                </button>
              )}
            </div>
            {showManualDropdown && manualResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0ddde', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: 220, overflowY: 'auto' }}>
                {manualResults.map(s => (
                  <div key={s.id} onClick={() => { setManualSelected(s); setManualQuery(getFullName(s)); setShowManualDropdown(false); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0efef' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f7f7')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1819' }}>{getFullName(s)}</div>
                    <div style={{ fontSize: 11, color: '#85787A' }}>{s.matricula} · Grupo {s.id_grupo ?? '---'}</div>
                  </div>
                ))}
              </div>
            )}
            {manualSelected && (
              <div className="scan-manual-selected">
                <CheckCircle size={16} />
                <div>
                  <div style={{ fontWeight: 600 }}>{getFullName(manualSelected)}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{manualSelected.matricula} · Grupo {manualSelected.id_grupo ?? '---'}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="scan-manual-label">Código de autorización (opcional)</div>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#85787A' }} />
              <input
                type="text"
                className="input"
                placeholder="Ej. A7K3P9 - valida un permiso aprobado"
                value={codigoPermiso}
                onChange={(e) => setCodigoPermiso(e.target.value.toUpperCase())}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
          <div className="scan-manual-actions">
            <button className="btn btn--secondary" onClick={() => { setViewMode('scan'); setManualQuery(''); setManualSelected(null); setCodigoPermiso(''); }}>Cancelar</button>
            <button className="btn btn--primary" disabled={!manualSelected || manualSaving} onClick={handleManualSave} style={{ flex: 1, opacity: !manualSelected || manualSaving ? 0.5 : 1, cursor: !manualSelected || manualSaving ? 'not-allowed' : 'pointer' }}>
              {manualSaving ? 'Registrando...' : 'Registrar salida sin credencial'}
            </button>
          </div>
        </div>
      )}

      {scanResult && (
        <div className={`scan-result ${scanResult.type === 'entry' ? 'success-entry' : scanResult.type === 'exit' ? 'success-exit' : scanResult.type === 'late' ? 'late' : 'denied'}`}>
          <div className="scan-result-header">
            <div className="scan-result-photo">
              <div style={{ width: '100%', height: '100%', background: '#F0EFEF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={40} color="#CAC6C7" />
              </div>
            </div>
            <div className="scan-result-info">
              <div className="scan-result-name">{scanResult.studentName}</div>
              {scanResult.student && <div className="scan-result-control">{scanResult.student.matricula}</div>}
              {scanResult.student && <div className="scan-result-group">Grupo {scanResult.student.id_grupo ?? '---'}</div>}
              <div className="scan-result-time">{scanResult.time}</div>
              <div className={`scan-result-status ${scanResult.type}`}>
                {scanResult.type === 'entry' && <><CheckCircle size={18} color="#0F8122" /> <span style={{ color: '#0F8122' }}>ENTRADA REGISTRADA</span></>}
                {scanResult.type === 'exit' && <><CheckCircle size={18} color="#1792AB" /> <span style={{ color: '#1792AB' }}>SALIDA REGISTRADA</span></>}
                {scanResult.type === 'denied' && <><XCircle size={18} color="#AB1748" /> <span style={{ color: '#AB1748' }}>{scanResult.message || 'ACCESO DENEGADO'}</span></>}
              </div>
            </div>
            <div className={`scan-result-check ${scanResult.type === 'denied' ? 'scan-result-check--denied' : 'scan-result-check--ok'}`}>
              {scanResult.type === 'denied' ? <XCircle size={24} color="#AB1748" /> : <CheckCircle size={24} color="#0F8122" />}
            </div>
          </div>
          {scanResult.type === 'denied' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => navigate('/incidencias')}><AlertTriangle size={16} /> Registrar incidencia</button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => { setViewMode('manual'); setScanResult(null); }}><LogOut size={16} /> Registrar salida sin credencial</button>
            </div>
          )}
        </div>
      )}

      <div className="scan-recent">
        <div className="scan-recent-title">Ultimos registros</div>
        <div className="scan-recent-list">
          <div className="scan-recent-header">
            <span style={{ width: 8, flexShrink: 0 }} />
            <span style={{ width: 90, flexShrink: 0 }}>Hora</span>
            <span style={{ flex: 1 }}>Alumno</span>
            <span style={{ width: 100, flexShrink: 0, textAlign: 'center' }}>Grupo</span>
            <span style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>Tipo</span>
          </div>
          {displayRecords.map((record) => (
            <div key={record.id} className="scan-recent-item">
              <div className={`scan-recent-dot ${record.tipo === 'ENTRADA' ? 'entry' : record.tipo === 'SALIDA' ? 'exit' : 'denied'}`} />
              <span className="scan-recent-time">{record.time}</span>
              <span className="scan-recent-name">{record.alumnoNombre}</span>
              <span className="scan-recent-group">{record.alumnoGrupo}</span>
              <span className={`scan-recent-type ${record.tipo.toLowerCase()}`}>{getRecordTypeLabel(record.tipo)}</span>
            </div>
          ))}
          {displayRecords.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#A79F9F', fontSize: 14 }}>
              Sin registros recientes
            </div>
          )}
        </div>
      </div>

      <div className="scan-bottom-bar">
        <button className={`scan-action-btn ${viewMode === 'scan' && activeTab === 'entrada' ? 'active' : ''}`} onClick={() => { setViewMode('scan'); setActiveTab('entrada'); }}>
          <ArrowDown size={20} />
          Entrada
        </button>
        <button className={`scan-action-btn ${viewMode === 'scan' && activeTab === 'salida' ? 'active' : ''}`} onClick={() => { setViewMode('scan'); setActiveTab('salida'); }}>
          <ArrowUp size={20} />
          Salida
        </button>
        <button className={`scan-action-btn ${viewMode === 'manual' ? 'active' : ''}`} onClick={() => { setViewMode(viewMode === 'manual' ? 'scan' : 'manual'); setScanResult(null); }}>
          <LogOut size={20} />
          Salida s/ Credencial
        </button>
        <button className="scan-action-btn" onClick={() => navigate('/incidencias')}>
          <AlertTriangle size={20} />
          Incidencias
        </button>
      </div>
    </div>
  );
}
