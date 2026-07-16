import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText,
  CalendarCheck, AlertTriangle, Settings, LogOut, Bell, Menu, X,
  ScanLine, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { UserRole } from '../App';

interface LayoutProps {
  children: ReactNode;
  role: UserRole;
  onLogout: () => void;
}

const directivoMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Alumnos', path: '/alumnos' },
  { icon: Building2, label: 'Grupos', path: '/grupos' },
  { icon: CreditCard, label: 'Credenciales', path: '/credenciales' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
  { icon: CalendarCheck, label: 'Permisos', path: '/permisos' },
  { icon: AlertTriangle, label: 'Incidencias', path: '/incidencias' },
  { icon: Settings, label: 'Configuracion', path: '/configuracion' },
];

const prefectoMenu = [
  { icon: ScanLine, label: 'Escaneo NFC', path: '/escaneo' },
  { icon: AlertTriangle, label: 'Incidencias', path: '/incidencias' },
];

export default function Layout({ children, role, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menu = role === 'Directivo' ? directivoMenu : prefectoMenu;

  const pageTitle = menu.find(m => location.pathname.startsWith(m.path))?.label ?? 'Sistema NFC';

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
        {role === 'Directivo' && (
          <div className="sidebar-user">
            <div className="sidebar-user-name">Lic. Fabian Ocampo</div>
            <div className="sidebar-user-role">Directivo</div>
          </div>
        )}
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
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell size={22} />
                <span className="topbar-badge">3</span>
              </button>
              {notifOpen && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Notificaciones</span>
                    <button
                      style={{ background: 'none', border: 'none', color: '#EB2466', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}
                      onClick={() => setNotifOpen(false)}
                    >
                      Marcar todas como leidas
                    </button>
                  </div>
                  <div className="notification-list">
                    <div className="notification-item unread">
                      <div className="notification-icon notification-icon--warning">&#9888;</div>
                      <div className="notification-content">
                        <div className="notification-text"><strong>RETARDO</strong> - ALEIDA XIMENA GARCIA CANSECO registro entrada fuera de horario</div>
                        <div className="notification-time">07:45 - 10 Jul 2026</div>
                      </div>
                      <div className="notification-dot" />
                    </div>
                    <div className="notification-item unread">
                      <div className="notification-icon notification-icon--error">&#10006;</div>
                      <div className="notification-content">
                        <div className="notification-text"><strong>ACCESO DENEGADO</strong> - Credencial no reconocida en lector 2</div>
                        <div className="notification-time">08:30 - 10 Jul 2026</div>
                      </div>
                      <div className="notification-dot" />
                    </div>
                    <div className="notification-item unread">
                      <div className="notification-icon notification-icon--error">&#9888;</div>
                      <div className="notification-content">
                        <div className="notification-text"><strong>INCIDENCIA GRAVE</strong> - Intento de acceso no autorizado reportado</div>
                        <div className="notification-time">08:32 - 10 Jul 2026</div>
                      </div>
                      <div className="notification-dot" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="topbar-avatar">
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EB2466', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {role === 'Directivo' ? 'FO' : 'VI'}
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
