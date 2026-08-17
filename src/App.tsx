import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

export type UserRole = 'Directivo' | 'Prefectura' | 'Servicios Escolares' | 'Entrada';
import Layout from './components/Layout';
import { Toaster } from './components/ui/toast';
import Loader from './components/Loader';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const CredentialsPage = lazy(() => import('./pages/CredentialsPage'));
const CredentialDetailPage = lazy(() => import('./pages/CredentialDetailPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const GruposPage = lazy(() => import('./pages/GruposPage'));
const RegulationsPage = lazy(() => import('./pages/RegulationsPage'));
const ProfesoresPage = lazy(() => import('./pages/ProfesoresPage'));
const KioscoEntradasPage = lazy(() => import('./pages/KioscoEntradasPage'));

function SuspenseBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loader message="Cargando..." fullScreen />}>{children}</Suspense>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return <Loader message="Cargando..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <SuspenseBoundary><LoginPage /></SuspenseBoundary>;
  }

  const userRole = user?.rol || 'Directivo';

  if (userRole === 'Entrada') {
    return (
      <BrowserRouter>
        <SuspenseBoundary>
          <Routes>
            <Route path="*" element={<KioscoEntradasPage />} />
          </Routes>
        </SuspenseBoundary>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout role={userRole as UserRole} onLogout={logout}>
        <SuspenseBoundary>
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
              <Route path="/reportes" element={<ReportsPage />} />
              <Route path="*" element={<Navigate to="/escaneo" replace />} />
            </>
          )}
          </Routes>
        </SuspenseBoundary>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}
