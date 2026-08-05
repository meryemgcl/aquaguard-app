'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SafeUser, UserRole, ROLE_ROUTES } from '@/lib/types';

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  hasAccess: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Check session on mount ── */
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* ── Login ── */
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Giriş başarısız.' };
    } catch {
      return { success: false, message: 'Bağlantı hatası.' };
    }
  };

  /* ── Register ── */
  const register = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Kayıt başarısız.' };
    } catch {
      return { success: false, message: 'Bağlantı hatası.' };
    }
  };

  /* ── Logout ── */
  const logout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  };

  /* ── Role-based access check ── */
  const hasAccess = useCallback(
    (route: string) => {
      if (!user) return false;
      const allowedRoutes = ROLE_ROUTES[user.role] || [];
      return allowedRoutes.some((r) => route === r || route.startsWith(r + '/'));
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
