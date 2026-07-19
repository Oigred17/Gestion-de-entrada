import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import CredentialsPage from './pages/CredentialsPage';
import CredentialDetailPage from './pages/CredentialDetailPage';
import PermissionsPage from './pages/PermissionsPage';
import IncidentsPage from './pages/IncidentsPage';
import ReportsPage from './pages/ReportsPage';
import ConfigPage from './pages/ConfigPage';
import GruposPage from './pages/GruposPage';

export type UserRole = 'Directivo' | 'Prefectura';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Directivo');

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout role={userRole} onLogout={handleLogout}>
        <Routes>
          {userRole === 'Directivo' ? (
            <>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alumnos" element={<StudentsPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/credenciales" element={<CredentialsPage />} />
              <Route path="/credenciales/:id" element={<CredentialDetailPage />} />
              <Route path="/permisos" element={<PermissionsPage role={userRole} />} />
              <Route path="/incidencias" element={<IncidentsPage role={userRole} />} />
              <Route path="/reportes" element={<ReportsPage />} />
              <Route path="/configuracion" element={<ConfigPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<ScanPage />} />
              <Route path="/escaneo" element={<ScanPage />} />
              <Route path="/incidencias" element={<IncidentsPage role={userRole} />} />
              <Route path="*" element={<Navigate to="/escaneo" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
