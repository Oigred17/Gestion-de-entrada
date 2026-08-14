import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../api';
import type { User, LoginRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest, remember?: boolean) => Promise<void>;
  logout: () => void;
  getUserRole: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStorage(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function writeStorage(key: string, value: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
}

function clearStorages() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = readStorage('access_token');
    const savedUser = readStorage('user');

    if (!token || !savedUser) {
      setIsLoading(false);
      return;
    }

    try {
      const cached: User = JSON.parse(savedUser);
      setUser(cached);
    } catch {
      clearStorages();
      setIsLoading(false);
      return;
    }

    // Validar el token contra el backend para refrescar datos y detectar sesion expirada
    authApi.getCurrentUser()
      .then((current) => {
        setUser(current);
        writeStorage('user', JSON.stringify(current), !!localStorage.getItem('access_token'));
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearStorages();
          setUser(null);
        }
        // Para errores de red se conserva el usuario en cache
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginRequest, remember = false) => {
    const response = await authApi.login(credentials);
    writeStorage('access_token', response.access_token, remember);

    const currentUser = await authApi.getCurrentUser();
    writeStorage('user', JSON.stringify(currentUser), remember);
    setUser(currentUser);
  };

  const logout = () => {
    authApi.logout();
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const getUserRole = () => {
    return user?.rol || 'Directivo';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
