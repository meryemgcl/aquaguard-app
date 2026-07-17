/* ============================================================
   AquaGuard — Type Definitions
   ============================================================ */

export type UserRole = 'admin' | 'uzman' | 'yonetici' | 'halk';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: SafeUser;
}

/* Role display names & permissions */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Sistem Yöneticisi',
  uzman: 'Çevre Uzmanı',
  yonetici: 'Yönetici',
  halk: 'Halk Kullanıcısı',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#00d4ff',
  uzman: '#6e8efb',
  yonetici: '#00ff88',
  halk: '#8892a8',
};

/* Routes accessible by each role */
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin: ['/', '/kanban', '/harita', '/ai-analiz', '/mail-sablonlari', '/kullanicilar', '/ayarlar', '/arsiv'],
  uzman: ['/', '/kanban', '/harita', '/ai-analiz', '/arsiv'],
  yonetici: ['/', '/kanban', '/harita', '/ai-analiz', '/mail-sablonlari', '/arsiv'],
  halk: ['/', '/harita'],
};

/* Public routes (no auth needed) */
export const PUBLIC_ROUTES = ['/login', '/register'];
