import { useState } from 'react';
import { Eye, EyeOff, Mail, KeyRound, ShieldCheck, ArrowLeft, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, setAuthToken } from '../api';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverStep, setRecoverStep] = useState<'ask' | 'username' | 'code' | 'done'>('ask');
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverMsg, setRecoverMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [recoverLoading, setRecoverLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const canSubmit = username.trim().length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { username?: string; password?: string } = {};
    if (!username.trim()) nextErrors.username = 'El usuario es obligatorio';
    if (!password) nextErrors.password = 'La contraseña es obligatoria';
    setFieldErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ username, password });
      if (result.mfa_required) {
        setMfaRequired(true);
        setMfaTempToken(result.temp_token || '');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(mfaCode)) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.mfaVerify(mfaCode, mfaTempToken);
      setAuthToken(response.access_token);
      window.location.href = '/';
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Código TOTP inválido.');
    } finally {
      setIsLoading(false);
    }
  };

  const openRecover = () => {
    setRecoverOpen(true);
    setRecoverStep('ask');
    setRecoverUsername(username);
    setRecoverEmail('');
    setRecoverCode('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoverMsg(null);
  };

  const closeRecover = () => {
    setRecoverOpen(false);
    setRecoverMsg(null);
  };

  const sendRecoveryCode = async (uname: string) => {
    setRecoverLoading(true);
    setRecoverMsg(null);
    try {
      const res = await authApi.requestRecoveryCode(uname);
      if (res.status === 'ok') {
        setRecoverEmail(res.email || '');
        setRecoverMsg({ type: 'ok', text: res.message || 'Se envió el código a tu correo.' });
        setRecoverStep('code');
      } else {
        setRecoverMsg({ type: 'error', text: res.message || 'No se pudo enviar el correo.' });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const text = typeof detail === 'string' ? detail : 'No se pudo enviar el correo. Intenta de nuevo.';
      setRecoverMsg({ type: 'error', text });
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleRecoverSubmit = async () => {
    if (recoverStep === 'ask') {
      if (recoverUsername.trim()) {
        await sendRecoveryCode(recoverUsername.trim());
      } else {
        setRecoverStep('username');
      }
      return;
    }
    if (recoverStep === 'username') {
      if (!recoverUsername.trim()) {
        setRecoverMsg({ type: 'error', text: 'Ingresa tu usuario.' });
        return;
      }
      await sendRecoveryCode(recoverUsername.trim());
      return;
    }
    if (recoverStep === 'code') {
      if (!/^\d{6}$/.test(recoverCode.trim())) {
        setRecoverMsg({ type: 'error', text: 'Ingresa el código de 6 dígitos recibido por correo.' });
        return;
      }
      if (newPassword.length < 4) {
        setRecoverMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 4 caracteres.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setRecoverMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
        return;
      }
      setRecoverLoading(true);
      setRecoverMsg(null);
      try {
        await authApi.resetPassword({
          username: recoverUsername.trim(),
          code: recoverCode.trim(),
          new_password: newPassword,
        });
        setRecoverStep('done');
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        const text = typeof detail === 'string' ? detail : 'No se pudo restablecer la contraseña.';
        setRecoverMsg({ type: 'error', text });
      } finally {
        setRecoverLoading(false);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-brand" aria-label="Identidad COBAO">
          <p className="login-brand-kicker">Bienvenido al</p>
          <div className="login-brand-copy">
            <div className="login-brand-logo">
              <img src="/images/logo.png" alt="COBAO Logo" />
            </div>
            <h1>COBAO</h1>
            <p className="login-brand-plantel">Plantel 27 Miahuatlán</p>
            <p className="login-brand-desc">
              Sistema de Control de Acceso NFC.
              <br />
              Accede para gestionar el registro y control de estudiantes.
            </p>
          </div>

        </section>

        <div className="login-form-panel">
          {!mfaRequired ? (
            <>
              <h2>Iniciar Sesión</h2>
              <p className="login-form-lead">Ingresa tus credenciales para acceder</p>

              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="username">Usuario</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    required
                    autoComplete="username"
                    className={fieldErrors.username ? 'login-input--error' : ''}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                  />
                  {fieldErrors.username && (
                    <span className="field-error">{fieldErrors.username}</span>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="password">Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      required
                      autoComplete="current-password"
                      className={fieldErrors.password ? 'login-input--error' : ''}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                    />
                    <button
                      type="button"
                      className="login-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span className="field-error">{fieldErrors.password}</span>
                  )}
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <div className="login-row">
                  <span />
                  <button type="button" className="login-link" onClick={openRecover}>
                    Olvidaste tu contraseña
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={isLoading || !canSubmit}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Smartphone size={40} color="#AB1748" style={{ marginBottom: 12 }} />
                <h2>Verificación en dos pasos</h2>
                <p className="login-form-lead">
                  Ingresa el código de tu aplicación de autenticación
                </p>
              </div>

              <form onSubmit={handleMfaSubmit}>
                <div className="login-field">
                  <label htmlFor="mfa-code">Código TOTP</label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    style={{ textAlign: 'center', letterSpacing: 8, fontFamily: 'var(--font-mono, monospace)', fontSize: 24 }}
                    autoFocus
                  />
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <button
                  type="submit"
                  className="login-submit"
                  disabled={isLoading || mfaCode.length !== 6}
                >
                  {isLoading ? 'Verificando...' : 'Verificar'}
                </button>

                <button
                  type="button"
                  className="login-link"
                  onClick={() => { setMfaRequired(false); setMfaCode(''); setError(''); }}
                  style={{ display: 'block', margin: '16px auto 0', textAlign: 'center' }}
                >
                  Volver al inicio de sesión
                </button>
              </form>
            </>
          )}

          <p className="login-help">
            ¿No tienes cuenta?{' '}
            <a href="mailto:sistemas@cobao.edu.mx?subject=Acceso%20al%20Sistema%20de%20Control%20de%20Entrada%20NFC">
              Contacta al administrador
            </a>
          </p>
        </div>
      </div>

      <div className="login-legal">
        Colegio de Bachilleres del Estado de Oaxaca. Todos los derechos reservados.
      </div>

      {recoverOpen && (
        <>
          <div className="modal-backdrop" onClick={closeRecover} />
          <div className="login-recover" role="dialog" aria-modal="true" aria-labelledby="recover-title">
            <div className="login-recover-icon" aria-hidden="true">
              {recoverStep === 'done' ? (
                <ShieldCheck size={22} color="#0F8122" />
              ) : (
                <KeyRound size={22} color="#AB1748" />
              )}
            </div>
            <h2 id="recover-title">Recuperar contraseña</h2>

            {recoverStep === 'ask' && (
              <>
                <p className="login-form-lead" style={{ marginBottom: 24 }}>
                  {recoverUsername.trim() ? (
                    <>Se enviará un código de verificación al correo electrónico registrado del usuario <b>{recoverUsername.trim()}</b>. ¿Continuar?</>
                  ) : (
                    <>Se enviará un código de verificación al correo electrónico registrado de tu cuenta.</>
                  )}
                </p>
                {recoverMsg && (
                  <div className={recoverMsg.type === 'ok' ? 'alert alert--success' : 'alert alert--error'} style={{ marginBottom: 16 }}>
                    {recoverMsg.text}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16 }}>
                  <button type="button" className="btn btn--secondary" onClick={closeRecover}>No</button>
                  <button type="button" className="btn btn--primary" onClick={() => handleRecoverSubmit()} disabled={recoverLoading}>
                    <Mail size={16} />
                    Sí, enviar
                  </button>
                </div>
              </>
            )}

            {recoverStep === 'username' && (
              <>
                <p className="login-form-lead">
                  Ingresa tu usuario para enviar el código al correo registrado.
                </p>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Ingresa tu usuario"
                  value={recoverUsername}
                  onChange={(e) => setRecoverUsername(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                {recoverMsg && (
                  <div className={recoverMsg.type === 'ok' ? 'alert alert--success' : 'alert alert--error'} style={{ marginBottom: 16 }}>
                    {recoverMsg.text}
                  </div>
                )}
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => handleRecoverSubmit()}
                  disabled={recoverLoading || !recoverUsername.trim()}
                >
                  {recoverLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              </>
            )}

            {recoverStep === 'code' && (
              <>
                <p className="login-form-lead">
                  {recoverEmail && (
                    <>Se envió un código de verificación a <b>{recoverEmail}</b>.</>
                  )}
                  <br />
                  Ingresa el código y define tu nueva contraseña.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="login-input"
                  placeholder="Código de verificación"
                  value={recoverCode}
                  onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: 6, fontFamily: 'var(--font-mono)', marginBottom: 12 }}
                />
                <input
                  type="password"
                  className="login-input"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <input
                  type="password"
                  className="login-input"
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRecoverSubmit();
                  }}
                  style={{ marginBottom: 16 }}
                />
                {recoverMsg && (
                  <div className={recoverMsg.type === 'ok' ? 'alert alert--success' : 'alert alert--error'} style={{ marginBottom: 16 }}>
                    {recoverMsg.text}
                  </div>
                )}
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => handleRecoverSubmit()}
                  disabled={recoverLoading || recoverCode.trim().length !== 6 || newPassword.length < 4 || newPassword !== confirmPassword}
                >
                  {recoverLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
                </button>
              </>
            )}

            {recoverStep === 'done' && (
              <>
                <p style={{ fontSize: 15, color: '#0F8122', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con la nueva contraseña.
                </p>
                <button type="button" className="login-submit" onClick={closeRecover}>
                  Volver al inicio de sesión
                </button>
              </>
            )}

            {recoverStep !== 'done' && recoverStep !== 'ask' && (
              <button
                type="button"
                className="login-link"
                onClick={() => { setRecoverStep('ask'); setRecoverMsg(null); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16 }}
              >
                <ArrowLeft size={14} />
                Volver
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
