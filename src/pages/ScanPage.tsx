import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, CheckCircle, XCircle, AlertTriangle, Edit, Nfc, Lock, Search, LogOut, X as XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recentRecords, students } from '../data/mockData';
import type { ScanRecord, Student } from '../data/mockData';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatDateTime = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day} de ${month} de ${year} ${hours}:${minutes}:${seconds}`;
};

type ScanResultType = 'entry' | 'exit' | 'late' | 'denied';

type ScanResult = {
  type: ScanResultType;
  student: typeof students[0];
  time: string;
} | null;

type ViewMode = 'scan' | 'manual';

export default function ScanPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [isOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'entrada' | 'salida'>('entrada');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [records, setRecords] = useState<ScanRecord[]>(recentRecords);
  const [viewMode, setViewMode] = useState<ViewMode>('scan');

  const [manualQuery, setManualQuery] = useState('');
  const [manualSelected, setManualSelected] = useState<Student | null>(null);
  const [showManualDropdown, setShowManualDropdown] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  const manualResults = useMemo(() => {
    if (!manualQuery || manualSelected) return [];
    const q = manualQuery.toLowerCase();
    return students.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.numControl.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [manualQuery, manualSelected]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const simulateScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const student = students[Math.floor(Math.random() * students.length)];
      const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let type: ScanResultType;
      if (activeTab === 'entrada') {
        const outcomes: ScanResultType[] = ['entry', 'late', 'denied'];
        type = outcomes[Math.floor(Math.random() * outcomes.length)];
      } else {
        const outcomes: ScanResultType[] = ['exit', 'denied'];
        type = outcomes[Math.floor(Math.random() * outcomes.length)];
      }

      setScanResult({ type, student, time });
      setIsScanning(false);

      if (type !== 'denied') {
        setRecords((prev) => [
          { id: Date.now(), alumno: student, tipo: (type === 'entry' ? 'entrada' : type === 'exit' ? 'salida' : type === 'late' ? 'retardo' : 'denegado') as ScanRecord['tipo'], hora: time, fecha: '2026-07-10' },
          ...prev,
        ].slice(0, 20));
      }
    }, 2000);
  };

  const handleManualSave = () => {
    if (!manualSelected) return;
    setManualSaving(true);
    setTimeout(() => {
      const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newRecord: ScanRecord = {
        id: Date.now(),
        alumno: manualSelected,
        tipo: 'salida',
        hora: time,
        fecha: '2026-07-10',
      };
      setRecords(prev => [newRecord, ...prev].slice(0, 20));
      setScanResult({ type: 'exit', student: manualSelected, time });
      setManualQuery('');
      setManualSelected(null);
      setManualSaving(false);
      setViewMode('scan');
    }, 800);
  };

  const getStatusConfig = (type: ScanResultType) => {
    switch (type) {
      case 'entry': return { label: 'ENTRADA REGISTRADA', color: '#0F8122', icon: <CheckCircle size={18} color="#0F8122" /> };
      case 'exit': return { label: 'SALIDA REGISTRADA', color: '#1792AB', icon: <CheckCircle size={18} color="#1792AB" /> };
      case 'late': return { label: 'RETARDO', color: '#1792AB', icon: <AlertTriangle size={18} color="#1792AB" /> };
      case 'denied': return { label: 'ACCESO DENEGADO', color: '#AB1748', icon: <XCircle size={18} color="#AB1748" /> };
    }
  };

  const getRecordTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      case 'retardo': return 'Retardo';
      default: return 'Denegado';
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-topbar">
        <div className="scan-topbar-left">
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #EB2466 50%, #0F8122 50%)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Sistema NFC</span>
            <span style={{ fontSize: 12, color: '#5F5657' }}>Plantel 27 Miahuatlan</span>
          </div>
        </div>
        <div className="scan-plantel-info">
          <div className="scan-datetime">{formatDateTime(now)}</div>
          <div className="scan-status">
            <div className={`scan-status-dot ${isOnline ? 'online' : 'offline'}`} />
            <span style={{ color: isOnline ? '#0F8122' : '#AB1748', fontWeight: 600 }}>
              {isOnline ? 'Conectado' : 'Sin conexion - Modo local'}
            </span>
          </div>
        </div>
      </div>

      {/* PESTANAS DE MODO (escaneo / manual) */}
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
        <>
          {/* ZONA DE ESCANEO NFC */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div className={`nfc-zone ${isScanning ? 'scanning' : ''}`} onClick={simulateScan} style={{ cursor: 'pointer' }}>
              <div className="nfc-zone-inner">
                <Nfc size={64} color="#EB2466" />
              </div>
            </div>
            <div className="nfc-zone-text">Acerca la credencial al lector</div>
            {isScanning && <span style={{ fontSize: 14, color: '#EB2466', fontWeight: 600 }}>Escaneando...</span>}
          </div>
        </>
      ) : (
        /* MODO MANUAL - SALIDA SIN CREDENCIAL */
        <div style={{ maxWidth: 480, margin: '0 auto 24px', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={22} color="#AB1748" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1C1819' }}>Salida sin credencial</div>
              <div style={{ fontSize: 12, color: '#85787A' }}>Busca al alumno y registra su salida manualmente</div>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div className="input-wrapper">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                className="input input--search"
                placeholder="Buscar alumno por nombre o matricula..."
                value={manualQuery}
                onChange={(e) => { setManualQuery(e.target.value); setManualSelected(null); setShowManualDropdown(true); }}
                onFocus={() => { if (!manualSelected && manualQuery) setShowManualDropdown(true); }}
                onBlur={() => setTimeout(() => setShowManualDropdown(false), 200)}
              />
              {manualSelected && (
                <button
                  onClick={() => { setManualSelected(null); setManualQuery(''); }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#85787A', padding: 2 }}
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            {showManualDropdown && manualResults.length > 0 && (
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
                {manualResults.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setManualSelected(s); setManualQuery(s.nombre); setShowManualDropdown(false); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0efef', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f7f7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1819' }}>{s.nombre}</div>
                    <div style={{ fontSize: 11, color: '#85787A' }}>{s.numControl} · Grupo {s.grupo} · {s.turno}</div>
                  </div>
                ))}
              </div>
            )}
            {manualSelected && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: '#e8f5e9', borderRadius: 8, fontSize: 13, color: '#0F8122', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} />
                <div>
                  <div style={{ fontWeight: 600 }}>{manualSelected.nombre}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{manualSelected.numControl} · Grupo {manualSelected.grupo} · {manualSelected.turno}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--secondary" onClick={() => { setViewMode('scan'); setManualQuery(''); setManualSelected(null); }}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              disabled={!manualSelected || manualSaving}
              onClick={handleManualSave}
              style={{ flex: 1, opacity: !manualSelected || manualSaving ? 0.5 : 1, cursor: !manualSelected || manualSaving ? 'not-allowed' : 'pointer' }}
            >
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
              <div className="scan-result-name">{scanResult.student.nombre}</div>
              <div className="scan-result-control">{scanResult.student.numControl}</div>
              <div className="scan-result-group">
                Grupo {scanResult.student.grupo}
                <span className="badge badge--info">{scanResult.student.capacitacion}</span>
              </div>
              <div className="scan-result-time">{scanResult.time}</div>
              <div className={`scan-result-status ${scanResult.type === 'entry' ? 'success' : scanResult.type === 'exit' ? 'exit' : scanResult.type === 'late' ? 'late' : 'denied'}`}>
                {getStatusConfig(scanResult.type).icon}
                {getStatusConfig(scanResult.type).label}
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: scanResult.type === 'denied' ? '#FEEBEE' : '#70FE7D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'bounceIn 300ms ease-out' }}>
              {scanResult.type === 'denied' ? <XCircle size={24} color="#AB1748" /> : <CheckCircle size={24} color="#0F8122" />}
            </div>
          </div>
          {scanResult.type === 'late' && (
            <div className="alert alert--warning" style={{ marginTop: 12 }}>
              <AlertTriangle size={16} />
              <span>Entrada fuera de horario. Se registrara como retardo.</span>
            </div>
          )}
          {scanResult.type === 'denied' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => navigate('/incidencias')}>
                <AlertTriangle size={16} />
                Registrar incidencia
              </button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => { setViewMode('manual'); setScanResult(null); }}>
                <LogOut size={16} />
                Registrar salida sin credencial
              </button>
            </div>
          )}
        </div>
      )}

      <div className="scan-recent">
        <div className="scan-recent-title">Ultimos registros</div>
        <div className="scan-recent-list">
          {records.map((record) => (
            <div key={record.id} className="scan-recent-item">
              <div className={`scan-recent-dot ${record.tipo === 'entrada' ? 'entry' : record.tipo === 'salida' ? 'exit' : record.tipo === 'retardo' ? 'late' : 'denied'}`} />
              <span className="scan-recent-time">{record.hora}</span>
              <span className="scan-recent-name">{record.alumno.nombre}</span>
              <span className="scan-recent-group">{record.alumno.grupo}</span>
              <span className={`scan-recent-type ${record.tipo}`}>{getRecordTypeLabel(record.tipo)}</span>
            </div>
          ))}
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
