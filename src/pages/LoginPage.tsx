import { useState } from 'react';
import { Eye, EyeOff, Mail, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estado del flujo de recuperacion de contrasena
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverStep, setRecoverStep] = useState<'ask' | 'username' | 'code' | 'done'>('ask');
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverMsg, setRecoverMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [recoverLoading, setRecoverLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login({ username, password }, remember);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Credenciales incorrectas. Intenta de nuevo.');
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
        setRecoverMsg({ type: 'ok', text: res.message || 'Se envio el codigo a tu correo.' });
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
      await sendRecoveryCode(recoverUsername.trim());
      return;
    }
    if (recoverStep === 'code') {
      if (!/^\d{6}$/.test(recoverCode.trim())) {
        setRecoverMsg({ type: 'error', text: 'Ingresa el codigo de 6 digitos recibido por correo.' });
        return;
      }
      if (newPassword.length < 4) {
        setRecoverMsg({ type: 'error', text: 'La nueva contrasena debe tener al menos 4 caracteres.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setRecoverMsg({ type: 'error', text: 'Las contrasenas no coinciden.' });
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
        const text = typeof detail === 'string' ? detail : 'No se pudo restablecer la contrasena.';
        setRecoverMsg({ type: 'error', text });
      } finally {
        setRecoverLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0EFEF',
        fontFamily: 'var(--font-sans)',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 920,
          minHeight: 560,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(28,24,25,0.12), 0 2px 8px rgba(28,24,25,0.06)',
          position: 'relative',
        }}
      >
        {/* PANEL IZQUIERDO - Identidad */}
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(160deg, #EB2466 0%, #AB1748 55%, #6F0B2C 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 40px',
            position: 'relative',
            overflow: 'hidden',
            color: '#fff',
            minWidth: 0,
          }}
        >
          {/* Superposicion de patron geometrico de Oaxaca */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.05,
              backgroundImage: `repeating-linear-gradient(
                0deg, transparent, transparent 18px, rgba(255,255,255,0.4) 18px, rgba(255,255,255,0.4) 19px
              ), repeating-linear-gradient(
                90deg, transparent, transparent 18px, rgba(255,255,255,0.4) 18px, rgba(255,255,255,0.4) 19px
              ), repeating-linear-gradient(
                45deg, transparent, transparent 24px, rgba(255,255,255,0.2) 24px, rgba(255,255,255,0.2) 25px
              ), repeating-linear-gradient(
                -45deg, transparent, transparent 24px, rgba(255,255,255,0.2) 24px, rgba(255,255,255,0.2) 25px
              )`,
              pointerEvents: 'none',
            }}
          />

          {/* Texto de bienvenida */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: 'uppercase',
              margin: '0 0 20px',
              opacity: 0.8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Bienvenido al
          </p>

          {/* Logo circular */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src="/images/logo.png"
              alt="COBAO Logo"
              style={{ width: 64, height: 64, objectFit: 'contain' }}
            />
          </div>

          {/* Nombre de la marca */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: '0 0 8px',
              letterSpacing: 3,
              textTransform: 'uppercase',
              position: 'relative',
              zIndex: 1,
            }}
          >
            COBAO
          </h1>

          {/* Subtitulo */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              margin: '0 0 20px',
              opacity: 0.9,
              letterSpacing: 1,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Plantel 27 Miahuatlan
          </p>

          {/* Descripcion */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 400,
              margin: 0,
              opacity: 0.75,
              textAlign: 'center',
              lineHeight: 1.7,
              maxWidth: 260,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Sistema de Control de Acceso NFC.
            <br />
            Accede para gestionar el registro y control de estudiantes.
          </p>

          {/* Enlaces inferiores */}
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                opacity: 0.6,
              }}
            >
              SISTEMA NFC
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                opacity: 0.6,
              }}
            >
              PLANTEL 27
            </span>
          </div>

          {/* Transicion ondulada al panel derecho */}
          <svg
            viewBox="0 0 120 560"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute',
              top: 0,
              right: -1,
              height: '100%',
              width: 80,
              zIndex: 2,
            }}
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C40,80 80,60 120,100 L120,560 C80,520 40,480 0,460 Z"
              fill="#AB1748"
              fillOpacity="0.5"
            />
            <path
              d="M0,0 C60,120 100,80 120,160 L120,560 C100,500 60,460 0,440 Z"
              fill="#6F0B2C"
              fillOpacity="0.3"
            />
            <path
              d="M0,0 C30,60 70,40 120,60 L120,560 C70,540 30,520 0,500 Z"
              fill="white"
              fillOpacity="0.08"
            />
          </svg>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '48px 44px',
            background: '#fff',
            position: 'relative',
            minWidth: 0,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#1C1819',
              margin: '0 0 6px',
              textAlign: 'left',
            }}
          >
            Iniciar Sesion
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#85787A',
              margin: '0 0 28px',
              textAlign: 'left',
            }}
          >
            Ingresa tus credenciales para acceder
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#5F5657',
                  marginBottom: 6,
                }}
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #CAC6C7',
                  background: '#F0EFEF',
                  fontSize: 14,
                  color: '#1C1819',
                  outline: 'none',
                  transition: 'border-color 200ms',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#EB2466')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#CAC6C7')}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#5F5657',
                  marginBottom: 6,
                }}
              >
                Contrasena
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #CAC6C7',
                    background: '#F0EFEF',
                    fontSize: 14,
                    color: '#1C1819',
                    outline: 'none',
                    transition: 'border-color 200ms',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#EB2466')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CAC6C7')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#85787A',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px',
                borderRadius: 10,
                background: '#FEEBEE',
                color: '#EB2466',
                fontSize: 14,
                marginBottom: 18,
                border: '1px solid #EB2466',
              }}>
                {error}
              </div>
            )}

            {/* Recordar + Olvidaste */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#5F5657',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#EB2466' }}
                />
                Recordar sesion
              </label>
              <button
                type="button"
                onClick={openRecover}
                style={{
                  fontSize: 13,
                  color: '#EB2466',
                  textDecoration: 'none',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Olvidaste tu contrasena
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 10,
                border: 'none',
                background: isLoading ? '#CAC6C7' : '#EB2466',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 200ms',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#AB1748')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#EB2466')}
            >
              {isLoading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>

          {/* Sin cuenta */}
          <p
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: '#85787A',
              margin: '24px 0 0',
            }}
          >
            No tienes cuenta?{' '}
            <a
              href="mailto:sistemas@cobao.edu.mx?subject=Acceso%20al%20Sistema%20de%20Control%20de%20Entrada%20NFC"
              style={{ fontWeight: 600, color: '#EB2466', textDecoration: 'none' }}
            >
              Contacta al administrador
            </a>
          </p>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          color: '#CAC6C7',
          pointerEvents: 'none',
        }}
      >
        Colegio de Bachilleres del Estado de Oaxaca. Todos los derechos reservados.
      </div>

      {/* Modal de recuperacion de contrasena */}
      {recoverOpen && (
        <>
          <div
            onClick={closeRecover}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28,24,25,0.5)',
              zIndex: 1000,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 420,
              background: '#fff',
              borderRadius: 16,
              zIndex: 1001,
              boxShadow: '0 20px 60px rgba(28,24,25,0.3)',
              padding: '32px 28px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  background: '#FEEBEE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {recoverStep === 'done' ? (
                  <ShieldCheck size={26} color="#0F8122" />
                ) : (
                  <KeyRound size={26} color="#EB2466" />
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1C1819' }}>
                Recuperar contrasena
              </h2>
            </div>

            {recoverStep === 'ask' && (
              <>
                <p
                  style={{
                    fontSize: 14,
                    color: '#5F5657',
                    lineHeight: 1.6,
                    textAlign: 'center',
                    margin: '0 0 24px',
                  }}
                >
                  {recoverUsername.trim() ? (
                    <>Se enviara un codigo de verificacion al correo electronico registrado del usuario <b>{recoverUsername.trim()}</b>. Continuar?</>
                  ) : (
                    <>Se enviara un codigo de verificacion al correo electronico registrado de tu cuenta.</>
                  )}
                </p>
                {recoverMsg && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: recoverMsg.type === 'ok' ? '#E8F5E9' : '#FEEBEE',
                    color: recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466',
                    fontSize: 13,
                    marginBottom: 16,
                    border: `1px solid ${recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466'}`,
                  }}>
                    {recoverMsg.text}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={closeRecover}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 10,
                      border: '1.5px solid #CAC6C7',
                      background: '#fff',
                      color: '#5F5657',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    No
                  </button>
                  <button
                    onClick={() => handleRecoverSubmit()}
                    disabled={recoverLoading}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 0',
                      borderRadius: 10,
                      border: 'none',
                      background: '#EB2466',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: recoverLoading ? 'not-allowed' : 'pointer',
                      opacity: recoverLoading ? 0.7 : 1,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Mail size={16} />
                    Si, enviar
                  </button>
                </div>
              </>
            )}

            {recoverStep === 'username' && (
              <>
                <p style={{ fontSize: 14, color: '#5F5657', lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>
                  Ingresa tu usuario para enviar el codigo al correo registrado.
                </p>
                <input
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={recoverUsername}
                  onChange={(e) => setRecoverUsername(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #CAC6C7',
                    background: '#F0EFEF',
                    fontSize: 14,
                    color: '#1C1819',
                    outline: 'none',
                    marginBottom: 16,
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#EB2466')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CAC6C7')}
                />
                {recoverMsg && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: recoverMsg.type === 'ok' ? '#E8F5E9' : '#FEEBEE',
                    color: recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466',
                    fontSize: 13,
                    marginBottom: 16,
                    border: `1px solid ${recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466'}`,
                  }}>
                    {recoverMsg.text}
                  </div>
                )}
                <button
                  onClick={() => handleRecoverSubmit()}
                  disabled={recoverLoading || !recoverUsername.trim()}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: recoverLoading || !recoverUsername.trim() ? '#CAC6C7' : '#EB2466',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: recoverLoading || !recoverUsername.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {recoverLoading ? 'Enviando...' : 'Enviar codigo'}
                </button>
              </>
            )}

            {recoverStep === 'code' && (
              <>
                <p style={{ fontSize: 14, color: '#5F5657', lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>
                  {recoverEmail && (
                    <>Se envio un codigo de verificacion a <b>{recoverEmail}</b>.</>
                  )}
                  <br />
                  Ingresa el codigo y define tu nueva contrasena.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Codigo de verificacion"
                  value={recoverCode}
                  onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    letterSpacing: 6,
                    fontSize: 18,
                    fontWeight: 700,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #CAC6C7',
                    background: '#F0EFEF',
                    color: '#1C1819',
                    outline: 'none',
                    marginBottom: 12,
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                />
                <input
                  type="password"
                  placeholder="Nueva contrasena"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #CAC6C7',
                    background: '#F0EFEF',
                    fontSize: 14,
                    color: '#1C1819',
                    outline: 'none',
                    marginBottom: 12,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirmar nueva contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRecoverSubmit();
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #CAC6C7',
                    background: '#F0EFEF',
                    fontSize: 14,
                    color: '#1C1819',
                    outline: 'none',
                    marginBottom: 16,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {recoverMsg && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: recoverMsg.type === 'ok' ? '#E8F5E9' : '#FEEBEE',
                    color: recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466',
                    fontSize: 13,
                    marginBottom: 16,
                    border: `1px solid ${recoverMsg.type === 'ok' ? '#0F8122' : '#EB2466'}`,
                  }}>
                    {recoverMsg.text}
                  </div>
                )}
                <button
                  onClick={() => handleRecoverSubmit()}
                  disabled={recoverLoading}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: recoverLoading ? '#CAC6C7' : '#EB2466',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: recoverLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {recoverLoading ? 'Restableciendo...' : 'Restablecer contrasena'}
                </button>
              </>
            )}

            {recoverStep === 'done' && (
              <>
                <p style={{ fontSize: 14, color: '#0F8122', lineHeight: 1.6, textAlign: 'center', margin: '0 0 20px', fontWeight: 500 }}>
                  Tu contrasena se actualizo correctamente. Ya puedes iniciar sesion con la nueva contrasena.
                </p>
                <button
                  onClick={closeRecover}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: '#EB2466',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Volver al inicio de sesion
                </button>
              </>
            )}

            {recoverStep !== 'done' && recoverStep !== 'ask' && (
              <button
                onClick={() => { setRecoverStep('ask'); setRecoverMsg(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: '16px auto 0',
                  background: 'none',
                  border: 'none',
                  color: '#85787A',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
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
