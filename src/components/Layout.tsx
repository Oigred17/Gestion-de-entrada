import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText,
  CalendarCheck, AlertTriangle, Settings, LogOut, Bell, Menu, X,
  ScanLine, ChevronLeft, ChevronRight, Shield, UserCheck,
} from 'lucide-react';
import type { UserRole } from '../App';
import { useAuth } from '../context/AuthContext';
import { notificacionesApi, type NotificationItem } from '../api/notificaciones';
import Loader from './Loader';

interface LayoutProps {
  children: ReactNode;
  role: UserRole;
  onLogout: () => void;
}

const directivoMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Alumnos', path: '/alumnos' },
  { icon: Building2, label: 'Grupos', path: '/grupos' },
  { icon: UserCheck, label: 'Profesores', path: '/profesores' },
  { icon: CreditCard, label: 'Credenciales', path: '/credenciales' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
  { icon: CalendarCheck, label: 'Permisos', path: '/permisos' },
  { icon: AlertTriangle, label: 'Incidencias', path: '/incidencias' },
  { icon: Shield, label: 'Faltas al Reglamento', path: '/faltas' },
  { icon: Settings, label: 'Configuracion', path: '/configuracion' },
];

const serviciosEscolaresMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Alumnos', path: '/alumnos' },
  { icon: Building2, label: 'Grupos', path: '/grupos' },
  { icon: UserCheck, label: 'Profesores', path: '/profesores' },
  { icon: CreditCard, label: 'Credenciales', path: '/credenciales' },
  { icon: CalendarCheck, label: 'Permisos', path: '/permisos' },
  { icon: Shield, label: 'Faltas al Reglamento', path: '/faltas' },
  { icon: Settings, label: 'Configuracion', path: '/configuracion' },
];

const prefectoMenu = [
  { icon: ScanLine, label: 'Escaneo NFC', path: '/escaneo' },
  { icon: CalendarCheck, label: 'Permisos', path: '/permisos' },
  { icon: AlertTriangle, label: 'Incidencias', path: '/incidencias' },
  { icon: Shield, label: 'Faltas al Reglamento', path: '/faltas' },
  { icon: UserCheck, label: 'Profesores', path: '/profesores' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
];

export default function Layout({ children, role, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifTimer = useRef<number | undefined>(undefined);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const menu = role === 'Directivo' ? directivoMenu : role === 'Servicios Escolares' ? serviciosEscolaresMenu : prefectoMenu;

  const readKey = `notif_read_${user?.username ?? 'anon'}`;

  const loadReadIds = () => {
    try {
      return JSON.parse(localStorage.getItem(readKey) ?? '[]') as string[];
    } catch {
      return [];
    }
  };

  const fetchNotifications = async () => {
    try {
      const items = await notificacionesApi.getAll();
      const read = loadReadIds();
      const readSet = new Set(read);
      setNotifications(items.map(n => ({ ...n, unread: !readSet.has(n.id) })));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await notificacionesApi.getAll();
        if (!mounted) return;
        const read = loadReadIds();
        const readSet = new Set(read);
        setNotifications(items.map(n => ({ ...n, unread: !readSet.has(n.id) })));
      } catch {
        if (mounted) setNotifications([]);
      }
    })();
    return () => { mounted = false; };
  }, [readKey]);

  const userFullName = user ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`.trim() : 'Usuario';
  const userInitials = (user ? `${user.nombre?.[0] ?? ''}${user.apellido_paterno?.[0] ?? ''}` : '').trim().toUpperCase() || (user?.username?.[0]?.toUpperCase() ?? 'U');
  const userRoleLabel = user?.rol ?? role;

  const unreadCount = notifications.filter(n => n.unread).length;
  const pageTitle = location.pathname === '/'
    ? menu[0]?.label ?? 'Sistema NFC'
    : menu.find(m => location.pathname.startsWith(m.path))?.label ?? 'Sistema NFC';

  const markAllAsRead = () => {
    const all = notifications.map(n => n.id);
    const merged = Array.from(new Set([...loadReadIds(), ...all]));
    localStorage.setItem(readKey, JSON.stringify(merged));
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setNotifOpen(false);
  };

  const markAsRead = (id: string) => {
    if (notifications.find(n => n.id === id)?.unread) {
      const merged = Array.from(new Set([...loadReadIds(), id]));
      localStorage.setItem(readKey, JSON.stringify(merged));
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, unread: false } : n)));
    }
  };

  const formatRelativeTime = (iso: string | null): string => {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    const segundos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));
    if (segundos < 60) return 'hace un momento';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `hace ${dias} d`;
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const notifPath = (id: string, menuPaths: string[]): string => {
    const target = id.startsWith('inc:') ? '/incidencias'
      : id.startsWith('perm:') ? '/permisos'
      : id.startsWith('ret:') ? '/reportes'
      : id.startsWith('cred:') ? '/credenciales'
      : '';
    return target && menuPaths.includes(target) ? target : menuPaths[0] ?? '/dashboard';
  };

  const handleToggleNotifications = () => {
    const opening = !notifOpen;
    window.clearTimeout(notifTimer.current);
    if (opening) {
      setNotifLoading(true);
      fetchNotifications().finally(() => {
        notifTimer.current = window.setTimeout(() => setNotifLoading(false), 300);
      });
      notifTimer.current = window.setTimeout(() => setNotifLoading(false), 4000);
    }
    setNotifOpen(opening);
  };

  useEffect(() => () => window.clearTimeout(notifTimer.current), []);

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {!sidebarOpen && (
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expandir' : 'Contraer'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        <div className="sidebar-logo">
          <img src={collapsed ? "/images/logo.png" : "/images/logoCompleto.png"} alt="Logo" />
        </div>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{userFullName}</div>
          <div className="sidebar-user-role">{userRoleLabel}</div>
        </div>
        <div className="sidebar-divider" />
        <nav className="sidebar-nav">
          {menu.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                className={`sidebar-item ${active ? 'active' : ''}`}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                <span className="item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-item"
            onClick={onLogout}
            title={collapsed ? 'Cerrar sesion' : undefined}
          >
            <LogOut size={20} />
            <span className="item-label">Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <div className="main-content" style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)', transition: 'margin-left 250ms ease' }}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="topbar-title">{pageTitle}</h2>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 14, color: '#5F5657', fontWeight: 500 }}>
              Plantel 27 Miahuatlan
            </span>
            <div className="relative">
              <button
                className="topbar-notification"
                onClick={handleToggleNotifications}
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Notificaciones</span>
                    {unreadCount > 0 && (
                      <button
                        style={{ background: 'none', border: 'none', color: '#EB2466', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}
                        onClick={markAllAsRead}
                      >
                        Marcar todas como leidas
                      </button>
                    )}
                  </div>
                  {notifLoading ? (
                    <Loader message="Cargando notificaciones..." height={240} />
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#A79F9F', fontSize: 14 }}>
                      No tienes notificaciones
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map(n => {
                        const target = notifPath(n.id, menu.map(m => m.path));
                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            className={`notification-card ${n.unread ? 'unread' : ''}`}
                            onClick={() => { markAsRead(n.id); setNotifOpen(false); navigate(target); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                markAsRead(n.id);
                                setNotifOpen(false);
                                navigate(target);
                              }
                            }}
                          >
                            <div className="notification-card__text">
                              <div className="notification-card__textContent">
                                <p className="notification-card__h1">{n.title}</p>
                                <span className="notification-card__meta">
                                  {n.unread && <span className="notification-card__dot" />}
                                  <span className="notification-card__span">{formatRelativeTime(n.time)}</span>
                                </span>
                              </div>
                              <p className="notification-card__p">{n.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-avatar">
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EB2466', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {userInitials}
              </div>
            </div>
          </div>
        </header>
        <div className="content-area" style={{ animation: 'fadeInContent 200ms ease-out' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
