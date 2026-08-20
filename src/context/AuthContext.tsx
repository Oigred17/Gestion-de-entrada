import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, setAuthToken, setOnUnauthorized } from '../api';
import type { User, LoginRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ mfa_required?: boolean; temp_token?: string }>;
  logout: () => Promise<void>;
  getUserRole: () => string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const redirectToLogin = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(redirectToLogin);
    return () => setOnUnauthorized(null);
  }, [redirectToLogin]);

  const refreshUser = async () => {
    try {
      const current = await authApi.getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    authApi.getCurrentUser()
      .then((current) => {
        setUser(current);
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);

    if (response.mfa_required) {
      return { mfa_required: true, temp_token: response.temp_token };
    }

    setAuthToken(response.access_token);
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
    return {};
  };

  const logout = async () => {
    await authApi.logout();
    setAuthToken(null);
    setUser(null);
    window.location.href = '/login';
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
        refreshUser,
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
