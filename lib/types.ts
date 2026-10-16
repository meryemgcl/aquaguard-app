/* ============================================================
   AquaGuard — Type Definitions
   ============================================================ */

export type UserRole = 'super_admin' | 'admin' | 'uzman' | 'yonetici' | 'halk';
export type AccountStatus = 'active' | 'pending' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  requestedRole?: Exclude<UserRole, 'super_admin' | 'admin' | 'halk'>;
  avatar?: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  requestedRole?: Exclude<UserRole, 'super_admin' | 'admin' | 'halk'>;
  avatar?: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  twoFactorVerified?: boolean;
  twoFactorChallenge?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: SafeUser;
}
export type WaterIncidentCategory =
  | 'endüstriyel atık'
  | 'evsel atık'
  | 'balık ölümü'
  | 'renk/koku değişimi';

export type WaterIncidentStatus =
  | 'yeni_ihbar'
  | 'uzman_incelemesinde'
  | 'dogrulandi'
  | 'yonetici_onayinda'
  | 'yayinda'
  | 'reddedildi'
  | 'gecersiz_ihbar'
  | 'kapatildi';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WaterIncidentAuditEntry {
  action: string;
  performedBy: string;
  role: UserRole;
  timestamp: string;
  note: string;
}

export interface WaterIncident {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  category: WaterIncidentCategory;
  coordinates: Coordinates;
  addressText: string;
  province: string | null;
  district: string | null;
  photos: string[];
  reportedAt: string;
  reporterEmail: string | null;
  reporterPhone: string | null;
  status: WaterIncidentStatus;
  aiRiskScore: number | null;
  expertNotes: string | null;
  managerNotes: string | null;
  auditTrail: WaterIncidentAuditEntry[];
}

/* Role display names & permissions */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Süper Admin',
  admin: 'Sistem Yöneticisi',
  uzman: 'Çevre Uzmanı',
  yonetici: 'Yönetici',
  halk: 'Halk Kullanıcısı',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#ff4444',
  admin: '#00d4ff',
  uzman: '#6e8efb',
  yonetici: '#00ff88',
  halk: '#8892a8',
};

/* Routes accessible by each role */
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  super_admin: ['/', '/ihbar', '/ihbar-takip', '/raporlarim', '/kanban', '/harita', '/radar', '/saha', '/istasyonlar', '/ai-analiz', '/kullanicilar', '/ayarlar', '/arsiv', '/profil'],
  admin: ['/', '/ihbar', '/ihbar-takip', '/raporlarim', '/kanban', '/harita', '/radar', '/saha', '/istasyonlar', '/ai-analiz', '/kullanicilar', '/ayarlar', '/arsiv', '/profil'],
  uzman: ['/', '/ihbar', '/ihbar-takip', '/raporlarim', '/kanban', '/harita', '/radar', '/saha', '/istasyonlar', '/ai-analiz', '/ayarlar', '/arsiv', '/profil'],
  yonetici: ['/', '/ihbar', '/ihbar-takip', '/raporlarim', '/kanban', '/harita', '/radar', '/istasyonlar', '/ai-analiz', '/ayarlar', '/arsiv', '/profil'],
  halk: ['/', '/ihbar', '/ihbar-takip', '/raporlarim', '/harita', '/ayarlar', '/arsiv', '/profil'],
};

/* Public routes (no auth needed) */
export const PUBLIC_ROUTES = ['/login', '/register', '/ihbar-takip', '/embed/harita'];
