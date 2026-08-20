import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { authApi } from '../api';
import { toastError } from '@/lib/toast';

interface ConfirmPasswordModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmPasswordModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  onClose,
  onConfirm,
}: ConfirmPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (verifying) return;
    setPassword('');
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Ingrese su contraseña para confirmar.');
      return;
    }
    setVerifying(true);
    setError('');
    const action = onConfirm;
    try {
      await authApi.verifyPassword(password);
      setPassword('');
      handleClose();
      await action();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Contraseña incorrecta. Intente de nuevo.');
      } else {
        toastError('No se pudo verificar la contraseña');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} style={{ zIndex: 9998 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} color="#AB1748" />
            {title}
          </h3>
          <button className="modal-close" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: '#5F5657', lineHeight: 1.6, marginBottom: 16 }}>{message}</p>
          <div>
            <label className="field-label" style={{ marginBottom: 6, display: 'block' }}>Contraseña del usuario</label>
            <input
              type="password"
              className={`input ${error ? 'input--error' : ''}`}
              placeholder="Ingrese su contraseña..."
              value={password}
              required
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleConfirm(); }}
              autoFocus
            />
            {error && <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>{error}</span>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={handleClose} disabled={verifying}>Cancelar</button>
          <button className="btn btn--danger" onClick={handleConfirm} disabled={!password.trim() || verifying}>
            {verifying ? 'Verificando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
