import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

export type UserRole = 'Directivo' | 'Prefectura' | 'Servicios Escolares' | 'Entrada';
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
import RegulationsPage from './pages/RegulationsPage';
import ProfesoresPage from './pages/ProfesoresPage';
import KioscoEntradasPage from './pages/KioscoEntradasPage';

function AppRoutes() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#F0EFEF'
      }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const userRole = user?.rol || 'Directivo';

  if (userRole === 'Entrada') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<KioscoEntradasPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout role={userRole as UserRole} onLogout={logout}>
        <Routes>
          {userRole === 'Directivo' ? (
            <>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alumnos" element={<StudentsPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/credenciales" element={<CredentialsPage />} />
              <Route path="/credenciales/:id" element={<CredentialDetailPage />} />
              <Route path="/permisos" element={<PermissionsPage role={userRole as UserRole} />} />
              <Route path="/incidencias" element={<IncidentsPage role={userRole as UserRole} />} />
              <Route path="/reportes" element={<ReportsPage />} />
              <Route path="/faltas" element={<RegulationsPage role={userRole as UserRole} />} />
              <Route path="/profesores" element={<ProfesoresPage />} />
              <Route path="/configuracion" element={<ConfigPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : userRole === 'Servicios Escolares' ? (
            <>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alumnos" element={<StudentsPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/credenciales" element={<CredentialsPage />} />
              <Route path="/credenciales/:id" element={<CredentialDetailPage />} />
              <Route path="/permisos" element={<PermissionsPage role={userRole as UserRole} />} />
              <Route path="/faltas" element={<RegulationsPage role={userRole as UserRole} />} />
              <Route path="/profesores" element={<ProfesoresPage />} />
              <Route path="/configuracion" element={<ConfigPage role={userRole as UserRole} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<ScanPage />} />
              <Route path="/escaneo" element={<ScanPage />} />
              <Route path="/permisos" element={<PermissionsPage role={userRole as UserRole} />} />
              <Route path="/incidencias" element={<IncidentsPage role={userRole as UserRole} />} />
              <Route path="/faltas" element={<RegulationsPage role={userRole as UserRole} />} />
              <Route path="/profesores" element={<ProfesoresPage />} />
              <Route path="/reportes" element={<ReportsPage />} />
              <Route path="*" element={<Navigate to="/escaneo" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
