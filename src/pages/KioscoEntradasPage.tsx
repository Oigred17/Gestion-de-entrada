import { useState, useEffect, useRef, useCallback } from 'react';
import { Nfc, CheckCircle, LogOut, Clock, UserCheck, ArrowUpRight, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { nfcApi } from '../api/nfc';

type KioskResult = {
  tipo: 'ENTRADA' | 'SALIDA';
  nombre: string;
  matricula: string;
  hora: string;
} | null;

export default function KioscoEntradasPage() {
  const { logout, user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<KioskResult>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [pulse, setPulse] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estacionAbierta, setEstacionAbierta] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = nfcApi.connectWebSocket(
      (msg) => {
        if (msg.type === 'scan_result' && msg.uid_nfc) {
          setPulse(true);
          if (pulseTimer.current) clearTimeout(pulseTimer.current);
          pulseTimer.current = setTimeout(() => setPulse(false), 2500);

          if (msg.status === 'success' && msg.alumno) {
            setErrorMsg('');
            const nowT = new Date();
            const hora = nowT.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setResult({
              tipo: msg.tipo_evento === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
              nombre: msg.alumno.nombre,
              matricula: msg.alumno.matricula,
              hora,
            });
          } else {
            setResult(null);
            setErrorMsg(msg.message || 'Credencial no reconocida');
          }

          if (resultTimer.current) clearTimeout(resultTimer.current);
          resultTimer.current = setTimeout(() => {
            setResult(null);
            setErrorMsg('');
          }, 8000);
        }
      },
      () => {
        setWsConnected(true);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      },
      () => {
        setWsConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connectWS, 3000);
      }
    );
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWS();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (resultTimer.current) clearTimeout(resultTimer.current);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      wsRef.current?.close();
    };
  }, [connectWS]);

  const userName = user ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`.trim() : 'Entrada';

  return (
    <div className="kiosk">
      <div className="kiosk-bg" />

      <header className="kiosk-header">
        <div className="kiosk-brand">
          <img src="/images/logo.png" alt="COBAO" className="kiosk-logo" />
          <div>
            <div className="kiosk-title">COBAO Plantel 27</div>
            <div className="kiosk-subtitle">Control de Acceso</div>
          </div>
        </div>
        <div className="kiosk-header-right">
          <div className="kiosk-clock">
            <Clock size={18} />
            <span className="kiosk-clock-time">
              {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="kiosk-clock-date">
              {now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="kiosk-user">
            <span className="kiosk-user-name">{userName}</span>
            <button className="kiosk-logout" onClick={logout} title="Cerrar sesion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="kiosk-main">
        <div className={`kiosk-scan-area ${pulse ? 'pulse' : ''} ${result ? 'has-result' : ''}`}>
          <div className="kiosk-scan-circle">
            <Nfc size={90} />
          </div>
          <h1 className="kiosk-scan-hint">
            {result ? 'Registro exitoso' : errorMsg ? 'Acceso no permitido' : 'Acerca la credencial al lector'}
          </h1>
          <p className="kiosk-scan-sub">
            {errorMsg ? (
              errorMsg
            ) : !estacionAbierta ? (
              'Estación cerrada — inicia sesión con Entrada o Prefectura'
            ) : wsConnected ? (
              'Estación abierta — lector listo'
            ) : (
              'Estación abierta — conectando lector NFC...'
            )}
          </p>
          {errorMsg && (
            <div className="kiosk-error">
              <XCircle size={32} />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className={`kiosk-status-dot ${wsConnected && estacionAbierta ? 'on' : 'off'}`} />
        </div>

        {result && (
          <div className={`kiosk-result ${result.tipo === 'ENTRADA' ? 'entry' : 'exit'}`}>
            <div className="kiosk-result-icon">
              {result.tipo === 'ENTRADA'
                ? <ArrowUpRight size={40} />
                : <UserCheck size={40} />}
            </div>
            <div className="kiosk-result-info">
              <div className="kiosk-result-label">
                {result.tipo === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'}
              </div>
              <div className="kiosk-result-name">{result.nombre}</div>
              <div className="kiosk-result-meta">
                <span>{result.matricula}</span>
                <span className="kiosk-result-hora">{result.hora}</span>
              </div>
            </div>
            <CheckCircle size={48} className="kiosk-result-check" />
          </div>
        )}
      </main>
    </div>
  );
}
