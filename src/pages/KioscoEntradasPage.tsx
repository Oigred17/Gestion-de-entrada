import { useState, useEffect, useRef, useCallback } from 'react';
import { Nfc, CheckCircle, LogOut, Clock, UserCheck, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type KioskResult = {
  tipo: 'ENTRADA' | 'SALIDA';
  nombre: string;
  matricula: string;
  hora: string;
} | null;

type WSMessage = {
  type: string;
  status?: string;
  tipo_evento?: string;
  uid_nfc?: string;
  alumno?: { id: number; nombre: string; matricula: string } | null;
  message?: string;
};

export default function KioscoEntradasPage() {
  const { logout, user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<KioskResult>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [pulse, setPulse] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/v1/nfc/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === 'scan_result' && msg.uid_nfc) {
          setPulse(true);
          if (pulseTimer.current) clearTimeout(pulseTimer.current);
          pulseTimer.current = setTimeout(() => setPulse(false), 2500);

          if (msg.status === 'success' && msg.alumno) {
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
          }

          if (resultTimer.current) clearTimeout(resultTimer.current);
          resultTimer.current = setTimeout(() => setResult(null), 8000);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
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
            {result ? 'Registro exitoso' : 'Acerca la credencial al lector'}
          </h1>
          <p className="kiosk-scan-sub">
            {wsConnected ? 'Lector conectado - Escaneo en tiempo real' : 'Conectando lector NFC...'}
          </p>
          <div className={`kiosk-status-dot ${wsConnected ? 'on' : 'off'}`} />
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
