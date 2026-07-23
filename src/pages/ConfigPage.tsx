import { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Users,
  Bell,
  Database,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { DEFAULT_CREDENTIAL_LAYOUT, LAYOUT_VERSION, type CredentialLayout } from '../utils/generateCredentialsPDF';
import { usuariosApi } from '../api/usuarios';
import type { UserRole } from '../App';

interface ConfigPageProps {
  role?: UserRole;
}

const ALL_TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'credencial', label: 'Credencial', icon: CreditCard },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'respaldo', label: 'Respaldo', icon: Database },
] as const;

type TabId = (typeof ALL_TABS)[number]['id'];

interface HorarioEspecial {
  id: number;
  nombre: string;
  entrada: string;
  salida: string;
  fecha: string;
}

interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rol_id: number;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

interface Plantilla {
  id: number;
  nombre: string;
  asunto: string;
  cuerpo: string;
  variables: string[];
}

interface Respaldo {
  id: number;
  fecha: string;
  tamano: string;
  tipo: string;
  estado: string;
}

const colors = {
  primary: '#EB2466',
  primaryDark: '#AB1748',
  success: '#0F8122',
  info: '#1792AB',
  bg: '#F0EFEF',
  white: '#FFFFFF',
  border: '#CAC6C7',
  textPrimary: '#1C1819',
  textSecondary: '#5F5657',
  textMuted: '#85787A',
  lightPink: '#FEEBEE',
  lightGreen: '#E8F5E9',
  lightBlue: '#E3F2FD',
};

export default function ConfigPage({ role }: ConfigPageProps) {
  const tabs = role === 'Servicios Escolares'
    ? ALL_TABS.filter(t => t.id === 'credencial')
    : [...ALL_TABS];
  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);

  const [plantelNombre, setPlantelNombre] = useState('Plantel 27 Miahuatlan');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoInstitucional, setCorreoInstitucional] = useState('');
  const [zonaHoraria, setZonaHoraria] = useState('America/Mexico_City');
  const [logo, setLogo] = useState<string | null>(null);

  const [horaEntrada, setHoraEntrada] = useState('07:00');
  const [horaSalida, setHoraSalida] = useState('14:00');
  const [diasHabiles, setDiasHabiles] = useState<Record<string, boolean>>({
    Lunes: true,
    Martes: true,
    Miercoles: true,
    Jueves: true,
    Viernes: true,
    Sabado: false,
    Domingo: false,
  });
  const [toleranciaRetardo, setToleranciaRetardo] = useState(30);
  const [horariosEspeciales, setHorariosEspeciales] = useState<HorarioEspecial[]>([
    { id: 1, nombre: 'Examen final', entrada: '08:00', salida: '13:00', fecha: '2026-07-20' },
    { id: 2, nombre: 'Evento deportivo', entrada: '09:00', salida: '12:00', fecha: '2026-07-25' },
    { id: 3, nombre: 'Jornada extendida', entrada: '07:00', salida: '17:00', fecha: '2026-08-01' },
  ]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ username: '', nombre: '', contrasena: '', rol_id: 2, enviarCorreo: true });
  const [showPassword, setShowPassword] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);

  useEffect(() => {
    if (activeTab === 'usuarios') {
      usuariosApi.getAll().then(setUsuarios).catch(() => {});
    }
  }, [activeTab]);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifWhatsApp, setNotifWhatsApp] = useState(false);

  const [smtp, setSmtp] = useState({ servidor: 'smtp.gmail.com', puerto: '587', usuario: '', contrasena: '', remitente: '' });
  const [smsApi, setSmsApi] = useState({ proveedor: '', apiToken: '', remitente: '' });
  const [whatsappApi, setWhatsappApi] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '' });

  const [plantillas, setPlantillas] = useState<Plantilla[]>([
    {
      id: 1,
      nombre: 'Entrada registrada',
      asunto: 'Entrada registrada - {nombre_alumno}',
      cuerpo: 'El alumno {nombre_alumno} del grupo {grupo} registro su entrada a las {hora}.',
      variables: ['{nombre_alumno}', '{grupo}', '{hora}'],
    },
    {
      id: 2,
      nombre: 'Salida registrada',
      asunto: 'Salida registrada - {nombre_alumno}',
      cuerpo: 'El alumno {nombre_alumno} del grupo {grupo} registro su salida a las {hora}.',
      variables: ['{nombre_alumno}', '{grupo}', '{hora}'],
    },
    {
      id: 3,
      nombre: 'Entrada fuera de horario',
      asunto: 'Entrada fuera de horario registrada - {nombre_alumno}',
      cuerpo: 'El alumno {nombre_alumno} del grupo {grupo} llego fuera del horario de clase a las {hora}.',
      variables: ['{nombre_alumno}', '{grupo}', '{hora}'],
    },
    {
      id: 4,
      nombre: 'Falta',
      asunto: 'Falta registrada - {nombre_alumno}',
      cuerpo: 'El alumno {nombre_alumno} del grupo {grupo} registro falta el dia de hoy.',
      variables: ['{nombre_alumno}', '{grupo}'],
    },
    {
      id: 5,
      nombre: 'Salida anticipada',
      asunto: 'Salida anticipada - {nombre_alumno}',
      cuerpo: 'El alumno {nombre_alumno} del grupo {grupo} salio anticipadamente a las {hora} por motivo de: {motivo}.',
      variables: ['{nombre_alumno}', '{grupo}', '{hora}', '{motivo}'],
    },
    {
      id: 6,
      nombre: 'Incidencia de seguridad',
      asunto: 'Incidencia de seguridad - {nombre_alumno}',
      cuerpo: 'Se reporto una incidencia de seguridad con el alumno {nombre_alumno} del grupo {grupo}. Motivo: {motivo}.',
      variables: ['{nombre_alumno}', '{grupo}', '{motivo}'],
    },
    {
      id: 7,
      nombre: 'Credencial bloqueada',
      asunto: 'Credencial bloqueada - {nombre_alumno}',
      cuerpo: 'La credencial del alumno {nombre_alumno} del grupo {grupo} ha sido bloqueada. Motivo: {motivo}.',
      variables: ['{nombre_alumno}', '{grupo}', '{motivo}'],
    },
  ]);
  const [editingPlantilla, setEditingPlantilla] = useState<number | null>(null);

  const [frecuencia, setFrecuencia] = useState('Diario');
  const [ubicacion, setUbicacion] = useState('Local');
  const [retencion, setRetencion] = useState(30);
  const [respaldos] = useState<Respaldo[]>([
    { id: 1, fecha: '2026-07-12 23:00', tamano: '15.4 MB', tipo: 'Automatico', estado: 'Completado' },
    { id: 2, fecha: '2026-07-11 23:00', tamano: '15.2 MB', tipo: 'Automatico', estado: 'Completado' },
    { id: 3, fecha: '2026-07-10 15:30', tamano: '14.9 MB', tipo: 'Manual', estado: 'Completado' },
  ]);

  // Estado del layout de credencial (cargado de localStorage o defaults, con auto-reset por version)
  const [credLayout, setCredLayout] = useState<CredentialLayout>(() => {
    try {
      const savedVersion = localStorage.getItem('credentialLayoutVersion');
      const saved = localStorage.getItem('credentialLayout');
      if (saved && savedVersion === String(LAYOUT_VERSION)) {
        return { ...DEFAULT_CREDENTIAL_LAYOUT, ...JSON.parse(saved) };
      }
      // Version mismatch - limpiar y usar defaults nuevos
      localStorage.removeItem('credentialLayout');
      localStorage.removeItem('credentialLayoutVersion');
    } catch { }
    return { ...DEFAULT_CREDENTIAL_LAYOUT };
  });

  const generarContrasena = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const toggleDia = (dia: string) => setDiasHabiles(prev => ({ ...prev, [dia]: !prev[dia] }));

  const addHorarioEspecial = () => {
    const newId = Math.max(...horariosEspeciales.map(h => h.id), 0) + 1;
    setHorariosEspeciales([...horariosEspeciales, { id: newId, nombre: '', entrada: '07:00', salida: '14:00', fecha: '' }]);
  };

  const removeHorarioEspecial = (id: number) => setHorariosEspeciales(horariosEspeciales.filter(h => h.id !== id));

  const addUsuario = async () => {
    try {
      await usuariosApi.create({
        username: nuevoUsuario.username,
        password_user: nuevoUsuario.contrasena,
        nombre: nuevoUsuario.nombre,
        id_rol: nuevoUsuario.rol_id,
        activo: true,
      });
      const updated = await usuariosApi.getAll();
      setUsuarios(updated);
      setShowUsuarioModal(false);
      setNuevoUsuario({ username: '', nombre: '', contrasena: '', rol_id: 2, enviarCorreo: true });
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const removeUsuario = async (id: number) => {
    try {
      await usuariosApi.delete(id);
      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const s = {
    page: { padding: '24px', background: colors.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } as React.CSSProperties,
    header: { marginBottom: '24px' } as React.CSSProperties,
    title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 700, color: colors.textPrimary, margin: 0 } as React.CSSProperties,
    subtitle: { color: colors.textSecondary, fontSize: '14px', marginTop: '6px', marginBottom: 0 } as React.CSSProperties,
    tabs: { display: 'flex', gap: '0', borderBottom: `2px solid ${colors.border}`, marginBottom: '24px', background: colors.white, borderRadius: '12px 12px 0 0', padding: '0 8px', overflowX: 'auto' } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: active ? 600 : 400, color: active ? colors.primary : colors.textMuted, borderBottom: active ? `3px solid ${colors.primary}` : '3px solid transparent', marginBottom: '-2px', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }),
    content: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } as React.CSSProperties,
    tabContent: { display: 'flex', flexDirection: 'column' as const, gap: '20px' } as React.CSSProperties,
    section: { background: colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${colors.border}` } as React.CSSProperties,
    sectionTitle: { fontSize: '16px', fontWeight: 600, color: colors.textPrimary, marginTop: 0, marginRight: 0, marginBottom: '16px', marginLeft: 0 } as React.CSSProperties,
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } as React.CSSProperties,
    field: { display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '13px', fontWeight: 500, color: colors.textSecondary } as React.CSSProperties,
    input: { padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, fontSize: '14px', color: colors.textPrimary, outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
    inputSm: { padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, fontSize: '14px', color: colors.textPrimary, outline: 'none', width: '120px', boxSizing: 'border-box' as const } as React.CSSProperties,
    textarea: { padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, fontSize: '14px', color: colors.textPrimary, outline: 'none', resize: 'vertical' as const, minHeight: '80px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
    select: { padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, fontSize: '14px', color: colors.textPrimary, outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' as const } as React.CSSProperties,
    btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const } as React.CSSProperties,
    btnIcon: (danger?: boolean): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', color: danger ? colors.primary : colors.textMuted, transition: 'all 0.2s',
    }),
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' } as React.CSSProperties,
    tableWrapper: { overflowX: 'auto' as const } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const } as React.CSSProperties,
    th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: '12px', fontWeight: 600, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}`, background: colors.bg, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } as React.CSSProperties,
    td: { padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: '14px', color: colors.textPrimary } as React.CSSProperties,
    tdBold: { padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: '14px', color: colors.textPrimary, fontWeight: 600 } as React.CSSProperties,
    tableInput: { padding: '8px 12px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bg, fontSize: '13px', color: colors.textPrimary, outline: 'none', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
    actionsCell: { display: 'flex', gap: '4px' } as React.CSSProperties,
    badge: (variant: 'blue' | 'green' | 'gray'): React.CSSProperties => {
      const bg = variant === 'blue' ? colors.lightBlue : variant === 'green' ? colors.lightGreen : colors.bg;
      const color = variant === 'blue' ? colors.info : variant === 'green' ? colors.success : colors.textMuted;
      return { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: bg, color: color };
    },
    toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${colors.border}` } as React.CSSProperties,
    toggleLabel: { fontSize: '14px', color: colors.textPrimary, fontWeight: 500 } as React.CSSProperties,
    modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' } as React.CSSProperties,
    modal: { background: colors.white, borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '90%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } as React.CSSProperties,
    modalTitle: { fontSize: '20px', fontWeight: 700, color: colors.textPrimary, margin: '0 0 20px 0' } as React.CSSProperties,
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` } as React.CSSProperties,
    passwordRow: { display: 'flex', gap: '8px', alignItems: 'center' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: colors.textSecondary, cursor: 'pointer', marginTop: '8px' } as React.CSSProperties,
    diaChip: (active: boolean): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '20px', border: active ? `2px solid ${colors.primary}` : `2px solid ${colors.border}`, background: active ? colors.lightPink : colors.white, color: active ? colors.primary : colors.textMuted, fontSize: '14px', fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' as const,
    }),
    diasGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '10px' } as React.CSSProperties,
    logoUpload: { display: 'flex', justifyContent: 'center', marginTop: '8px' } as React.CSSProperties,
    dropzone: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px', border: `2px dashed ${colors.border}`, borderRadius: '12px', background: colors.bg, cursor: 'pointer', textAlign: 'center' as const, position: 'relative' as const, width: '100%' } as React.CSSProperties,
    dropzoneText: { fontSize: '14px', color: colors.textSecondary, margin: '12px 0 4px 0' } as React.CSSProperties,
    dropzoneHint: { fontSize: '12px', color: colors.textMuted } as React.CSSProperties,
    fileInput: { position: 'absolute' as const, inset: 0, opacity: 0, cursor: 'pointer' } as React.CSSProperties,
    logoPreview: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px', padding: '20px', border: `1px solid ${colors.border}`, borderRadius: '12px', background: colors.bg } as React.CSSProperties,
    logoPreviewImg: { maxWidth: '200px', maxHeight: '120px', borderRadius: '8px', objectFit: 'contain' } as React.CSSProperties,
    btnRemove: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: colors.lightPink, color: colors.primary, border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' } as React.CSSProperties,
    radioGroup: { display: 'flex', flexDirection: 'column' as const, gap: '10px' } as React.CSSProperties,
    radio: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: colors.textPrimary, cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.white, transition: 'border-color 0.2s' } as React.CSSProperties,
    radioActive: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: colors.textPrimary, cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${colors.primary}`, background: colors.lightPink, transition: 'border-color 0.2s' } as React.CSSProperties,
    plantillasList: { display: 'flex', flexDirection: 'column' as const, gap: '12px' } as React.CSSProperties,
    plantillaCard: { border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' as const, transition: 'border-color 0.2s' } as React.CSSProperties,
    plantillaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: colors.bg } as React.CSSProperties,
    plantillaName: { fontSize: '14px', fontWeight: 600, color: colors.textPrimary } as React.CSSProperties,
    plantillaEditor: { padding: '16px', borderTop: `1px solid ${colors.border}` } as React.CSSProperties,
    variables: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', alignItems: 'center', marginTop: '8px' } as React.CSSProperties,
    variablesLabel: { fontSize: '12px', color: colors.textMuted } as React.CSSProperties,
    variableTag: { display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: colors.bg, border: `1px solid ${colors.border}`, fontSize: '12px', fontFamily: 'monospace', color: colors.info } as React.CSSProperties,
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = colors.primary;
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = colors.border;
  };

  const renderToggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <div style={s.toggleRow} key={label}>
      <span style={s.toggleLabel}>{label}</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => onChange(!value)}>
        {value ? <ToggleRight size={28} color={colors.primary} /> : <ToggleLeft size={28} color={colors.textMuted} />}
      </button>
    </div>
  );

  const renderGeneralTab = () => (
    <div style={s.tabContent}>
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Informacion del Plantel</h3>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Nombre del Plantel</label>
            <input type="text" style={s.input} value={plantelNombre} onChange={e => setPlantelNombre(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Telefono</label>
            <input type="tel" style={s.input} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="(273) 123-4567" onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Direccion</label>
          <textarea style={s.textarea} rows={3} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Direccion completa del plantel" onFocus={handleInputFocus} onBlur={handleInputBlur} />
        </div>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Correo Institucional</label>
            <input type="email" style={s.input} value={correoInstitucional} onChange={e => setCorreoInstitucional(e.target.value)} placeholder="contacto@plantel27.edu.mx" onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Zona Horaria</label>
            <select style={s.select} value={zonaHoraria} onChange={e => setZonaHoraria(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur}>
              <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
              <option value="America/Mexico_Cancun">America/Mexico_Cancun (UTC-5)</option>
              <option value="America/Tijuana">America/Tijuana (UTC-8)</option>
              <option value="America/Mazatlan">America/Mazatlan (UTC-7)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Logo del Plantel</h3>
        <div style={s.logoUpload}>
          {logo ? (
            <div style={s.logoPreview}>
              <img src={logo} alt="Logo" style={s.logoPreviewImg} />
              <button style={s.btnRemove} onClick={() => setLogo(null)}>
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          ) : (
            <div style={s.dropzone}>
              <Upload size={48} color={colors.textMuted} />
              <p style={s.dropzoneText}>Arrastra el logo aqui o haz clic para seleccionar</p>
              <span style={s.dropzoneHint}>Formatos: PNG, JPG, SVG (Max 5MB)</span>
              <input
                type="file"
                accept="image/*"
                style={s.fileInput}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => setLogo(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={s.actions}>
        <button style={s.btnPrimary}><Save size={16} /> Guardar cambios</button>
      </div>
    </div>
  );

  const renderHorariosTab = () => (
    <div style={s.tabContent}>
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Horario Oficial</h3>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Hora de entrada oficial</label>
            <input type="time" style={s.input} value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Hora de salida oficial</label>
            <input type="time" style={s.input} value={horaSalida} onChange={e => setHoraSalida(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Minutos de tolerancia para entrada fuera de horario</label>
          <input type="number" style={s.inputSm} value={toleranciaRetardo} onChange={e => setToleranciaRetardo(Number(e.target.value))} min={0} max={120} onFocus={handleInputFocus} onBlur={handleInputBlur} />
        </div>
      </div>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Dias Habiles</h3>
        <div style={s.diasGrid}>
          {Object.entries(diasHabiles).map(([dia, activo]) => (
            <label key={dia} style={s.diaChip(activo)} onClick={() => toggleDia(dia)}>
              <input type="checkbox" checked={activo} readOnly style={{ display: 'none' }} />
              {dia}
            </label>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>Horarios Especiales</h3>
          <button style={s.btnSecondary} onClick={addHorarioEspecial}><Plus size={16} /> Agregar horario</button>
        </div>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Entrada</th>
                <th style={s.th}>Salida</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {horariosEspeciales.map(h => (
                <tr key={h.id}>
                  <td style={s.td}><input style={s.tableInput} value={h.nombre} onChange={e => setHorariosEspeciales(horariosEspeciales.map(x => x.id === h.id ? { ...x, nombre: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} /></td>
                  <td style={s.td}><input type="date" style={s.tableInput} value={h.fecha} onChange={e => setHorariosEspeciales(horariosEspeciales.map(x => x.id === h.id ? { ...x, fecha: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} /></td>
                  <td style={s.td}><input type="time" style={s.tableInput} value={h.entrada} onChange={e => setHorariosEspeciales(horariosEspeciales.map(x => x.id === h.id ? { ...x, entrada: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} /></td>
                  <td style={s.td}><input type="time" style={s.tableInput} value={h.salida} onChange={e => setHorariosEspeciales(horariosEspeciales.map(x => x.id === h.id ? { ...x, salida: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} /></td>
                  <td style={s.td}><button style={s.btnIcon(true)} onClick={() => removeHorarioEspecial(h.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={s.actions}>
        <button style={s.btnPrimary}><Save size={16} /> Guardar cambios</button>
      </div>
    </div>
  );

  const renderUsuariosTab = () => (
    <div style={s.tabContent}>
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={{ ...s.sectionTitle, marginBottom: 0 }}>Usuarios del Sistema</h3>
          <button style={s.btnPrimary} onClick={() => setShowUsuarioModal(true)}><Plus size={16} /> Nuevo usuario</button>
        </div>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Usuario</th>
                <th style={s.th}>Correo</th>
                <th style={s.th}>Rol</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}>Ultimo acceso</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={s.tdBold}>{u.nombre} {u.apellido_paterno} {u.apellido_materno}</td>
                  <td style={s.td}>{u.username}</td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}><span style={s.badge(u.rol_id === 1 ? 'blue' : u.rol_id === 3 ? 'green' : 'gray')}>{u.rol_id === 1 ? 'Directivo' : u.rol_id === 3 ? 'Servicios Escolares' : 'Prefectura'}</span></td>
                  <td style={s.td}><span style={s.badge(u.estatus === 'Activo' ? 'green' : 'gray')}>{u.estatus}</span></td>
                  <td style={s.td}>{u.created_at ? new Date(u.created_at).toLocaleString() : 'Nunca'}</td>
                  <td style={s.td}>
                    <div style={s.actionsCell}>
                      <button style={s.btnIcon()}><Edit size={16} /></button>
                      <button style={s.btnIcon(true)} onClick={() => removeUsuario(u.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUsuarioModal && (
        <div style={s.modalOverlay} onClick={() => setShowUsuarioModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Nuevo Usuario</h3>
            <div style={s.field}>
              <label style={s.label}>Nombre completo</label>
              <input style={s.input} value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Nombre de usuario</label>
              <input style={s.input} value={nuevoUsuario.username} onChange={e => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Ej: jperez" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Rol</label>
              <select style={s.select} value={nuevoUsuario.rol_id} onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol_id: Number(e.target.value) })} onFocus={handleInputFocus} onBlur={handleInputBlur}>
                <option value={1}>Directivo</option>
                <option value={2}>Prefectura</option>
                <option value={3}>Servicios Escolares</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Contrasena</label>
              <div style={s.passwordRow}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...s.input, flex: 1 }}
                  value={autoGenerate ? '' : nuevoUsuario.contrasena}
                  placeholder={autoGenerate ? generarContrasena() : ''}
                  disabled={autoGenerate}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <button style={s.btnIcon()} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  style={s.btnIcon()}
                  onClick={() => {
                    setNuevoUsuario({ ...nuevoUsuario, contrasena: generarContrasena() });
                    setAutoGenerate(false);
                  }}
                >
                  <Copy size={16} />
                </button>
              </div>
              <label style={s.checkboxLabel}>
                <input type="checkbox" checked={autoGenerate} onChange={e => setAutoGenerate(e.target.checked)} />
                Contrasena auto-generada
              </label>
            </div>
            <label style={s.checkboxLabel}>
              <input type="checkbox" checked={nuevoUsuario.enviarCorreo} onChange={e => setNuevoUsuario({ ...nuevoUsuario, enviarCorreo: e.target.checked })} />
              Enviar credenciales por correo
            </label>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setShowUsuarioModal(false)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={addUsuario}><Save size={16} /> Crear usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotificacionesTab = () => (
    <div style={s.tabContent}>
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Canales de Notificacion</h3>
        {renderToggle(notifEmail, setNotifEmail, 'Correo electronico')}
        {renderToggle(notifSMS, setNotifSMS, 'SMS')}
        {renderToggle(notifWhatsApp, setNotifWhatsApp, 'WhatsApp')}
      </div>

      {notifEmail && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Configuracion SMTP</h3>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Servidor SMTP</label>
              <input style={s.input} value={smtp.servidor} onChange={e => setSmtp({ ...smtp, servidor: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Puerto</label>
              <input style={s.input} value={smtp.puerto} onChange={e => setSmtp({ ...smtp, puerto: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Usuario</label>
              <input style={s.input} value={smtp.usuario} onChange={e => setSmtp({ ...smtp, usuario: e.target.value })} placeholder="usuario@gmail.com" onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contrasena</label>
              <input type="password" style={s.input} value={smtp.contrasena} onChange={e => setSmtp({ ...smtp, contrasena: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Direccion remitente</label>
            <input style={s.input} value={smtp.remitente} onChange={e => setSmtp({ ...smtp, remitente: e.target.value })} placeholder="Plantel 27 <notificaciones@plantel27.edu.mx>" onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
      )}

      {notifSMS && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Configuracion SMS API</h3>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Proveedor</label>
              <input style={s.input} value={smsApi.proveedor} onChange={e => setSmsApi({ ...smsApi, proveedor: e.target.value })} placeholder="Twilio / Vonage / etc." onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>API Token</label>
              <input type="password" style={s.input} value={smsApi.apiToken} onChange={e => setSmsApi({ ...smsApi, apiToken: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Numero remitente</label>
            <input style={s.input} value={smsApi.remitente} onChange={e => setSmsApi({ ...smsApi, remitente: e.target.value })} placeholder="+52 123 456 7890" onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
      )}

      {notifWhatsApp && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Configuracion WhatsApp Business API</h3>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Phone Number ID</label>
              <input style={s.input} value={whatsappApi.phoneNumberId} onChange={e => setWhatsappApi({ ...whatsappApi, phoneNumberId: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Business Account ID</label>
              <input style={s.input} value={whatsappApi.businessAccountId} onChange={e => setWhatsappApi({ ...whatsappApi, businessAccountId: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Access Token</label>
            <input type="password" style={s.input} value={whatsappApi.accessToken} onChange={e => setWhatsappApi({ ...whatsappApi, accessToken: e.target.value })} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
      )}

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Plantillas de Mensajes</h3>
        <div style={s.plantillasList}>
          {plantillas.map(p => (
            <div key={p.id} style={s.plantillaCard}>
              <div style={s.plantillaHeader}>
                <span style={s.plantillaName}>{p.nombre}</span>
                <button style={s.btnIcon()} onClick={() => setEditingPlantilla(editingPlantilla === p.id ? null : p.id)}>
                  <Edit size={16} />
                </button>
              </div>
              {editingPlantilla === p.id && (
                <div style={s.plantillaEditor}>
                  <div style={s.field}>
                    <label style={s.label}>Asunto</label>
                    <input style={s.input} value={p.asunto} onChange={e => setPlantillas(plantillas.map(x => x.id === p.id ? { ...x, asunto: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Cuerpo del mensaje</label>
                    <textarea style={s.textarea} rows={3} value={p.cuerpo} onChange={e => setPlantillas(plantillas.map(x => x.id === p.id ? { ...x, cuerpo: e.target.value } : x))} onFocus={handleInputFocus} onBlur={handleInputBlur} />
                  </div>
                  <div style={s.variables}>
                    <span style={s.variablesLabel}>Variables disponibles: </span>
                    {p.variables.map(v => (
                      <code key={v} style={s.variableTag}>{v}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={s.actions}>
        <button style={s.btnPrimary}><Save size={16} /> Guardar cambios</button>
      </div>
    </div>
  );

  const saveCredLayout = () => {
    localStorage.setItem('credentialLayout', JSON.stringify(credLayout));
    localStorage.setItem('credentialLayoutVersion', String(LAYOUT_VERSION));
  };

  const resetCredLayout = () => {
    setCredLayout({ ...DEFAULT_CREDENTIAL_LAYOUT });
    localStorage.removeItem('credentialLayout');
    localStorage.removeItem('credentialLayoutVersion');
  };

  const updateCredField = (key: string, field: 'y' | 'size' | 'xOffset' | 'label' | 'text', value: number | string) => {
    setCredLayout(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof CredentialLayout], [field]: value },
    }));
  };

  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldSide, setNewFieldSide] = useState<'izq' | 'der'>('izq');

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const key = `custom_${newFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
    const campo = {
      y: 50,
      size: 7.5,
      x: newFieldSide,
      xOffset: 0,
      label: newFieldLabel.trim(),
    };
    setCredLayout(prev => ({ ...prev, [key]: campo }));
    setNewFieldLabel('');
    setShowAddField(false);
  };

  const removeCredField = (key: string) => {
    setCredLayout(prev => {
      const next = { ...prev };
      delete (next as Record<string, unknown>)[key];
      return next;
    });
  };

  const DEFAULT_KEYS = Object.keys(DEFAULT_CREDENTIAL_LAYOUT) as string[];

  const renderCredencialTab = () => {
    const MM = 2.835;
    const BLOCK_HEIGHT = 65.8 * MM;
    const PREVIEW_SCALE = 0.62;
    const previewH = BLOCK_HEIGHT / PREVIEW_SCALE;
    const toPreview = (yPt: number) => yPt / PREVIEW_SCALE;

    const fieldLabel = (key: string, campo: { label?: string; y: number; x: string }) => {
      if (campo.label) return campo.label;
      const map: Record<string, string> = {
        nombre: 'Nombre', plantel: 'Plantel', no_control: 'No. Control',
        domicilio1: 'Domicilio 1', domicilio2: 'Domicilio 2', domicilio3: 'Domicilio 3',
        curp: 'CURP', tipo_sangre: 'Tipo Sangre', afiliacion: 'Afiliacion',
        tutor: 'Tutor', tel_tutor: 'Tel. Tutor', firma: 'Firma',
      };
      return map[key] ?? key;
    };

    const sampleTexts: Record<string, string> = {
      nombre: 'NOMBRE: JUAN PEREZ LOPEZ',
      plantel: 'PLANTEL 27 MIAHUATLAN',
      no_control: 'NO. DE CONTROL: 20240012',
      domicilio1: 'DOMICILIO: C. PRINCIPAL #123',
      domicilio2: 'COL. CENTRO',
      domicilio3: 'C.P. 75920',
      curp: 'CURP: MAJP050310HTCPPR09',
      tipo_sangre: 'TIPO DE SANGRE: O+',
      afiliacion: 'NUMERO DE AFILIACION: 987654',
      tutor: 'TUTOR: MARIA LOPEZ GARCIA',
      tel_tutor: 'TELEFONO TUTOR: 2731234567',
      firma: 'LIC. FABIAN OCAMPO GODINEZ',
    };

    const sideColor: Record<string, { bg: string; border: string; text: string; accent: string }> = {
      izq:  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', accent: '#2563EB' },
      der:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', accent: '#16A34A' },
      firma:{ bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', accent: '#DC2626' },
    };

    const allFields = Object.entries(credLayout).sort(([, a], [, b]) => a.y - b.y) as [string, { y: number; size: number; x: string; xOffset: number; text?: string; label?: string }][];

    return (
      <div style={s.tabContent}>
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>Diseno de la Credencial</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btnSecondary} onClick={resetCredLayout}><RefreshCw size={16} /> Restaurar</button>
              <button style={s.btnPrimary} onClick={saveCredLayout}><Save size={16} /> Guardar</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>

            {/* PREVIEW */}
            <div style={{ flex: '0 0 44%', minWidth: 0 }}>
              <div style={{
                background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10,
                padding: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Vista Previa
                </div>

                <div style={{
                  position: 'relative', width: '100%', height: previewH,
                  background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6,
                  overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ position: 'absolute', left: '49.5%', top: 0, bottom: 0, width: 1, background: `${colors.border}88`, borderLeft: '1px dashed #ccc' }} />
                  <div style={{ position: 'absolute', top: 3, left: 4, fontSize: 8, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>IZQ</div>
                  <div style={{ position: 'absolute', top: 3, right: 4, fontSize: 8, fontWeight: 700, color: '#86EFAC', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DER</div>

                  {allFields.map(([key, campo]) => {
                    const top = toPreview(campo.y);
                    const side = sideColor[campo.x] ?? sideColor.izq;
                    const text = campo.text ?? sampleTexts[key] ?? campo.label ?? key;
                    const isFirma = campo.x === 'firma';
                    const xPct = ((campo.xOffset ?? 0) / 12) * 10;
                    const leftPos = isFirma ? `${52 + xPct}%` : campo.x === 'izq' ? `${6 + xPct}%` : `${50.5 + xPct}%`;
                    const rightPos = isFirma ? 6 : campo.x === 'izq' ? '50.5%' : 6;

                    return (
                      <div key={key} style={{ position: 'absolute', top, left: leftPos, right: rightPos }}>
                        <div style={{
                          background: side.bg, border: `1px solid ${side.border}`,
                          borderRadius: 3, padding: '1px 5px',
                          fontSize: Math.max(campo.size * 0.7, 8),
                          color: side.text, fontWeight: 600, lineHeight: 1.5,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          position: 'relative',
                        }}>
                          {text}
                          <span style={{
                            position: 'absolute', top: -1, right: 2,
                            fontSize: 7, fontWeight: 700, color: `${side.accent}99`,
                            background: `${side.accent}12`, borderRadius: 2, padding: '0 2px',
                          }}>{campo.size}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 14, background: '#f8f8f8', borderRight: `1px solid ${colors.border}` }}>
                    {Array.from({ length: 20 }, (_, i) => {
                      const yPt = i * (BLOCK_HEIGHT / 19);
                      const yPx = toPreview(yPt);
                      return (
                        <div key={i} style={{ position: 'absolute', top: yPx, left: 0, display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: i % 5 === 0 ? 8 : 4, height: 1, background: '#bbb' }} />
                          {i % 5 === 0 && (
                            <span style={{ fontSize: 7, color: '#999', marginLeft: 1, lineHeight: 1 }}>{(yPt / MM).toFixed(0)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
                  {Object.entries(sideColor).filter(([k]) => k !== 'firma' || allFields.some(([, c]) => c.x === 'firma')).map(([key, sc]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: colors.textSecondary }}>
                      <div style={{ width: 12, height: 8, borderRadius: 2, background: sc.bg, border: `1px solid ${sc.border}` }} />
                      {key === 'izq' ? 'Izquierda' : key === 'der' ? 'Derecha' : 'Firma'}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { l: 'Bloque', v: '182 pt' },
                  { l: 'Pagina', v: '4 cred.' },
                  { l: 'Margen sup.', v: '23 pt' },
                  { l: 'Ancho nombre', v: '56 mm' },
                ].map(d => (
                  <div key={d.l} style={{ flex: '1 1 100px', padding: '6px 10px', background: colors.bg, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{d.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>{d.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTROLS */}
            <div style={{ flex: '1 1 56%', minWidth: 0 }}>
              <div style={{
                background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 10,
                padding: 14, maxHeight: previewH + 200, overflowY: 'auto',
              }}>
                {(['izq', 'der', 'firma'] as const).map(side => {
                  const fields = allFields.filter(([, c]) => c.x === side);
                  if (fields.length === 0) return null;
                  const sc = sideColor[side];
                  return (
                    <div key={side} style={{ marginBottom: 16 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                        paddingBottom: 6, borderBottom: `2px solid ${sc.border}`,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: sc.accent }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                          {side === 'izq' ? 'Lado Izquierdo' : side === 'der' ? 'Lado Derecho' : 'Firma'}
                        </span>
                        <span style={{
                          fontSize: 10, color: sc.accent, background: sc.bg,
                          padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                        }}>
                          {fields.length} campo{fields.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {fields.map(([key, campo]) => (
                        <div key={key} style={{
                          display: 'flex', flexDirection: 'column', gap: 4,
                          padding: '8px 10px', marginBottom: 6,
                          background: sc.bg, border: `1px solid ${sc.border}`,
                          borderRadius: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700, color: sc.text, flexShrink: 0,
                              minWidth: 90,
                            }}>
                              {fieldLabel(key, campo)}
                            </span>
                            {sampleTexts[key] && (
                              <span style={{
                                fontSize: 9, color: sc.accent, opacity: 0.7,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                              }}>
                                {sampleTexts[key]}
                              </span>
                            )}
                            {!DEFAULT_KEYS.includes(key) && (
                              <button
                                onClick={() => removeCredField(key)}
                                style={{
                                  background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 4,
                                  padding: '1px 6px', cursor: 'pointer', fontSize: 10, color: '#DC2626',
                                  flexShrink: 0,
                                }}
                              >X</button>
                            )}
                          </div>

                          {/* Y position */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: colors.textMuted, width: 14, flexShrink: 0 }}>Y</span>
                            <input
                              type="range"
                              min={0}
                              max={BLOCK_HEIGHT}
                              step={0.5}
                              value={campo.y}
                              onChange={e => updateCredField(key, 'y', Number(e.target.value))}
                              style={{ flex: 1, height: 4, borderRadius: 2, outline: 'none', cursor: 'pointer', accentColor: sc.accent }}
                            />
                            <span style={{ fontSize: 9, color: colors.textMuted, width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {(campo.y / MM).toFixed(1)} mm
                            </span>
                          </div>

                          {/* X offset */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: colors.textMuted, width: 14, flexShrink: 0 }}>X</span>
                            <input
                              type="range"
                              min={-20}
                              max={20}
                              step={0.5}
                              value={campo.xOffset ?? 0}
                              onChange={e => updateCredField(key, 'xOffset', Number(e.target.value))}
                              style={{ flex: 1, height: 4, borderRadius: 2, outline: 'none', cursor: 'pointer', accentColor: sc.accent }}
                            />
                            <span style={{ fontSize: 9, color: colors.textMuted, width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {((campo.xOffset ?? 0) / MM).toFixed(1)} mm
                            </span>
                          </div>

                          {/* Font size + label */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: colors.textMuted, width: 14, flexShrink: 0 }}>F</span>
                            <input
                              type="number"
                              min={5}
                              max={14}
                              step={0.5}
                              value={campo.size}
                              onChange={e => updateCredField(key, 'size', Number(e.target.value))}
                              style={{
                                width: 40, padding: '2px 4px', borderRadius: 4,
                                border: `1px solid ${sc.border}`, fontSize: 10, textAlign: 'center',
                                background: '#fff', color: sc.text,
                              }}
                            />
                            <span style={{ fontSize: 9, color: colors.textMuted }}>pt</span>
                            {!DEFAULT_KEYS.includes(key) && (
                              <input
                                type="text"
                                value={campo.label ?? ''}
                                onChange={e => updateCredField(key, 'label', e.target.value)}
                                placeholder="Etiqueta..."
                                style={{
                                  flex: 1, padding: '2px 6px', borderRadius: 4,
                                  border: `1px solid ${sc.border}`, fontSize: 10,
                                  background: '#fff', color: sc.text,
                                }}
                              />
                            )}
                          </div>

                          {campo.text !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 9, color: colors.textMuted, width: 14, flexShrink: 0 }}>Txt</span>
                              <input
                                type="text"
                                value={campo.text ?? ''}
                                onChange={e => updateCredField(key, 'text', e.target.value)}
                                style={{
                                  flex: 1, padding: '3px 6px', borderRadius: 4,
                                  border: `1px solid ${sc.border}`, fontSize: 10,
                                  background: '#fff', color: sc.text,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Agregar campo */}
                {!showAddField ? (
                  <button
                    onClick={() => setShowAddField(true)}
                    style={{
                      width: '100%', padding: '10px 0', border: `2px dashed ${colors.border}`,
                      borderRadius: 8, background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, color: colors.textMuted,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Plus size={16} /> Agregar campo personalizado
                  </button>
                ) : (
                  <div style={{
                    padding: 12, border: `2px solid ${colors.primary}40`,
                    borderRadius: 8, background: colors.lightPink + '33',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 8 }}>
                      Nuevo Campo
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={e => setNewFieldLabel(e.target.value)}
                        placeholder="Nombre del campo..."
                        autoFocus
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6,
                          border: `1px solid ${colors.border}`, fontSize: 12,
                          outline: 'none',
                        }}
                        onKeyDown={e => e.key === 'Enter' && addCustomField()}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: colors.textSecondary, alignSelf: 'center' }}>Lado:</span>
                      <button
                        onClick={() => setNewFieldSide('izq')}
                        style={{
                          padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: newFieldSide === 'izq' ? sideColor.izq.accent : sideColor.izq.bg,
                          color: newFieldSide === 'izq' ? '#fff' : sideColor.izq.text,
                        }}
                      >Izquierda</button>
                      <button
                        onClick={() => setNewFieldSide('der')}
                        style={{
                          padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: newFieldSide === 'der' ? sideColor.der.accent : sideColor.der.bg,
                          color: newFieldSide === 'der' ? '#fff' : sideColor.der.text,
                        }}
                      >Derecha</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...s.btnPrimary, flex: 1, fontSize: 11, padding: '6px 0' }} onClick={addCustomField}>
                        <Plus size={14} /> Agregar
                      </button>
                      <button style={{ ...s.btnSecondary, flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setShowAddField(false); setNewFieldLabel(''); }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 10, padding: '8px 12px', background: colors.bg, borderRadius: 6, fontSize: 10, color: colors.textMuted, lineHeight: 1.6 }}>
                  <strong>Y</strong> — Posicion vertical (arriba/abajo) &nbsp;|&nbsp;
                  <strong>X</strong> — Offset horizontal (izq/der) &nbsp;|&nbsp;
                  <strong>F</strong> — Tamano de fuente (pt)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRespaldoTab = () => (
    <div style={s.tabContent}>
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Configuracion de Respaldo</h3>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Frecuencia</label>
            <select style={s.select} value={frecuencia} onChange={e => setFrecuencia(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur}>
              <option value="Hora">Cada hora</option>
              <option value="Diario">Diario</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensual">Mensual</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Retention de respaldos (dias)</label>
            <input type="number" style={s.input} value={retencion} onChange={e => setRetencion(Number(e.target.value))} min={1} max={365} onFocus={handleInputFocus} onBlur={handleInputBlur} />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Ubicacion de almacenamiento</label>
          <div style={s.radioGroup}>
            <label style={ubicacion === 'Local' ? s.radioActive : s.radio}>
              <input type="radio" name="ubicacion" value="Local" checked={ubicacion === 'Local'} onChange={e => setUbicacion(e.target.value)} style={{ accentColor: colors.primary }} />
              Local (Dispositivo)
            </label>
            <label style={ubicacion === 'Nube' ? s.radioActive : s.radio}>
              <input type="radio" name="ubicacion" value="Nube" checked={ubicacion === 'Nube'} onChange={e => setUbicacion(e.target.value)} style={{ accentColor: colors.primary }} />
              Nube (Almacenamiento remoto)
            </label>
          </div>
        </div>
        <button style={s.btnPrimary}><RefreshCw size={16} /> Generar respaldo manual</button>
      </div>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Respaldos Recientes</h3>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Tamano</th>
                <th style={s.th}>Tipo</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {respaldos.map(r => (
                <tr key={r.id}>
                  <td style={s.td}>{r.fecha}</td>
                  <td style={s.td}>{r.tamano}</td>
                  <td style={s.td}><span style={s.badge(r.tipo === 'Manual' ? 'blue' : 'green')}>{r.tipo}</span></td>
                  <td style={s.td}><span style={s.badge('green')}>{r.estado}</span></td>
                  <td style={s.td}>
                    <div style={s.actionsCell}>
                      <button style={s.btnIcon()}><Download size={16} /></button>
                      <button style={s.btnIcon(true)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'horarios': return renderHorariosTab();
      case 'usuarios': return renderUsuariosTab();
      case 'credencial': return renderCredencialTab();
      case 'notificaciones': return renderNotificacionesTab();
      case 'respaldo': return renderRespaldoTab();
    }
  };

  return (
    <div style={s.page}>
      <div style={s.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={s.tab(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {renderTab()}
      </div>
    </div>
  );
}
