import type { IncidentPrivacyLevel, WaterIncident, WaterIncidentCategory } from './types';

export type KanbanColumn =
  | 'yeni'
  | 'ai-analiz'
  | 'onay-uzman'
  | 'onay-yonetici'
  | 'yayinlandi'
  | 'reddedildi';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReportCategory = 'discharge' | 'fish-mortality' | 'odor-or-color' | 'waste' | 'other';
export type ApprovalAction = 'approved' | 'rejected';
export type ApprovalRole = 'uzman' | 'yonetici';
export type IncidentResolution = 'gecersiz_ihbar' | 'kapatildi' | 'reddedildi';

export interface StatusAuditEvent {
  id: number;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  user: string;
  role: import('./types').UserRole;
  timestamp: string;
  note: string;
  resolution?: 'FORCE_OVERWRITE' | 'DISCARDED' | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ApprovalRecord {
  id: string;
  cardId: string;
  action: ApprovalAction;
  role: ApprovalRole;
  actorName: string;
  actorInitials: string;
  actorColor: string;
  reason?: string;
  columnFrom: KanbanColumn;
  columnTo: KanbanColumn;
  timestamp: string;
  resolution?: IncidentResolution;
}

export interface KanbanCard extends Pick<WaterIncident, 'id' | 'title' | 'description'> {
  location: string;
  province: string | null;
  district: string | null;
  coordinates: Coordinates | null;
  category: ReportCategory;
  incidentCategory: WaterIncidentCategory;
  privacyLevel: IncidentPrivacyLevel;
  column: KanbanColumn;
  riskScore: number;
  riskLevel: RiskLevel;
  riskAssessed: boolean;
  aiRiskScore: number | null;
  photos: string[];
  trackingCode: string | null;
  resolution: IncidentResolution | null;
  expertReviewedAt: string | null;
  expertNotes: string | null;
  managerNotes: string | null;
  auditTrail: StatusAuditEvent[];
  createdAt: string;
  updatedAt: string;
  version: number;
  creatorEmail: string;
  assignee: {
    name: string;
    role: string;
    initials: string;
    color: string;
  };
  tags: string[];
  measurements?: Partial<{
    ph: number;
    turbidity: number;
    dissolvedO2: number;
    temperature: number;
    conductivity: number;
  }>;
  approvals: ApprovalRecord[];
}

export function isCriticalSlaBreached(card: Pick<
  KanbanCard,
  'column' | 'createdAt' | 'expertReviewedAt' | 'aiRiskScore' | 'riskAssessed' | 'riskLevel'
>, now = Date.now()): boolean {
  const hasCriticalRisk = (card.aiRiskScore ?? 0) >= 80 ||
    (card.riskAssessed && card.riskLevel === 'critical');
  return card.column === 'yeni' &&
    !card.expertReviewedAt &&
    hasCriticalRisk &&
    now - new Date(card.createdAt).getTime() > 24 * 60 * 60 * 1000;
}

export const COLUMNS: {
  id: KanbanColumn;
  label: string;
  color: string;
  glow: string;
  icon: string;
}[] = [
  { id: 'yeni', label: 'Yeni İhbarlar (Gelen Kutusu)', color: '#8892a8', glow: 'rgba(136,146,168,0.2)', icon: '📋' },
  { id: 'onay-uzman', label: 'Uzman Değerlendirmesinde', color: '#00d4ff', glow: 'rgba(0,212,255,0.2)', icon: '🔬' },
  { id: 'onay-yonetici', label: 'Yönetici Onayı Bekleyenler', color: '#f59e0b', glow: 'rgba(245,158,11,0.2)', icon: '✅' },
  { id: 'yayinlandi', label: 'Kamuya Açık / Müdahale Edilenler', color: '#00ff88', glow: 'rgba(0,255,136,0.2)', icon: '🌊' },
  { id: 'reddedildi', label: 'Kapatılan / Reddedilenler', color: '#ff4444', glow: 'rgba(255,68,68,0.2)', icon: '❌' },
];

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low: { label: 'Düşük', color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
  medium: { label: 'Orta', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high: { label: 'Yüksek', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)' },
  critical: { label: 'Kritik', color: '#ff4444', bg: 'rgba(255,68,68,0.12)' },
};

export function scoreToLevel(score: number): RiskLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

export const APPROVAL_NEXT: Partial<Record<KanbanColumn, KanbanColumn>> = {
  'onay-yonetici': 'yayinlandi',
};

export const APPROVAL_ROLES: Partial<Record<KanbanColumn, ApprovalRole[]>> = {
  'onay-yonetici': ['yonetici'],
};
