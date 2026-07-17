/* ============================================================
   AquaGuard — Kanban Types & In-Memory Store (v2 — with Approvals)
   ============================================================ */

export type KanbanColumn =
  | 'yeni'
  | 'ai-analiz'
  | 'onay-uzman'
  | 'onay-yonetici'
  | 'yayinlandi'
  | 'reddedildi';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalAction = 'approved' | 'rejected';
export type ApprovalRole = 'uzman' | 'yonetici' | 'admin';

/* ── Approval Record (persisted per card) ── */
export interface ApprovalRecord {
  id: string;
  cardId: string;
  action: ApprovalAction;
  role: ApprovalRole;
  actorName: string;
  actorInitials: string;
  actorColor: string;
  reason?: string;           // required on rejection
  columnFrom: KanbanColumn;
  columnTo: KanbanColumn;
  timestamp: string;
}

/* ── Kanban Card ── */
export interface KanbanCard {
  id: string;
  title: string;
  location: string;
  column: KanbanColumn;
  riskScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
  creatorEmail: string;      // for email notification
  assignee: {
    name: string;
    role: string;
    initials: string;
    color: string;
  };
  tags: string[];
  description: string;
  approvals: ApprovalRecord[];
}

/* ── Column metadata ── */
export const COLUMNS: {
  id: KanbanColumn;
  label: string;
  color: string;
  glow: string;
  icon: string;
}[] = [
  { id: 'yeni',           label: 'Yeni Rapor',         color: '#8892a8', glow: 'rgba(136,146,168,0.2)', icon: '📋' },
  { id: 'ai-analiz',      label: 'AI Analiz',           color: '#6e8efb', glow: 'rgba(110,142,251,0.2)', icon: '🤖' },
  { id: 'onay-uzman',     label: '1. Onay (Uzman)',     color: '#00d4ff', glow: 'rgba(0,212,255,0.2)',   icon: '🔬' },
  { id: 'onay-yonetici',  label: '2. Onay (Yönetici)', color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',  icon: '✅' },
  { id: 'yayinlandi',     label: 'Yayınlandı',          color: '#00ff88', glow: 'rgba(0,255,136,0.2)',   icon: '🌊' },
  { id: 'reddedildi',     label: 'Reddedildi',          color: '#ff4444', glow: 'rgba(255,68,68,0.2)',   icon: '❌' },
];

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low:      { label: 'Düşük',  color: '#00ff88', bg: 'rgba(0,255,136,0.12)'  },
  medium:   { label: 'Orta',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  high:     { label: 'Yüksek', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)' },
  critical: { label: 'Kritik', color: '#ff4444', bg: 'rgba(255,68,68,0.12)'  },
};

export function scoreToLevel(score: number): RiskLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

/* ── Approval workflow rules ── */
export const APPROVAL_NEXT: Partial<Record<KanbanColumn, KanbanColumn>> = {
  'onay-uzman':    'onay-yonetici',
  'onay-yonetici': 'yayinlandi',
};

/* Which roles can approve which column */
export const APPROVAL_ROLES: Partial<Record<KanbanColumn, ApprovalRole[]>> = {
  'onay-uzman':    ['uzman', 'admin'],
  'onay-yonetici': ['yonetici', 'admin'],
};

/* ── In-memory store ── */
const cards: KanbanCard[] = [
  {
    id: 'card-1', title: 'Ergene Nehri pH Anomalisi', location: 'Tekirdağ, TR',
    column: 'yeni', riskScore: 72, riskLevel: 'high',
    createdAt: '2026-07-15T09:12:00Z', updatedAt: '2026-07-15T09:12:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['pH', 'nehir', 'acil'],
    description: 'pH seviyesi 4.2\'ye düştü, normal aralık 6.5-8.5.',
    approvals: [],
  },
  {
    id: 'card-2', title: 'Sapanca Gölü Oksijen Eksikliği', location: 'Sakarya, TR',
    column: 'ai-analiz', riskScore: 85, riskLevel: 'critical',
    createdAt: '2026-07-14T14:30:00Z', updatedAt: '2026-07-16T08:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Mehmet Demir', role: 'yonetici', initials: 'MD', color: '#00ff88' },
    tags: ['oksijen', 'göl', 'kritik'],
    description: 'Çözünmüş oksijen 2 mg/L altına indi.',
    approvals: [],
  },
  {
    id: 'card-3', title: 'Gediz Havzası Nitrat Kirliliği', location: 'İzmir, TR',
    column: 'onay-uzman', riskScore: 58, riskLevel: 'medium',
    createdAt: '2026-07-13T11:00:00Z', updatedAt: '2026-07-16T10:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['nitrat', 'tarım', 'havza'],
    description: 'Tarımsal kaynaklı nitrat konsantrasyonu yüksek.',
    approvals: [],
  },
  {
    id: 'card-4', title: 'İzmit Körfezi Mikroplastik Tespiti', location: 'Kocaeli, TR',
    column: 'onay-yonetici', riskScore: 45, riskLevel: 'medium',
    createdAt: '2026-07-12T09:45:00Z', updatedAt: '2026-07-16T11:30:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Admin User', role: 'admin', initials: 'AU', color: '#00d4ff' },
    tags: ['mikroplastik', 'deniz', 'körfez'],
    description: 'Körfezde yüksek yoğunlukta mikroplastik partikülleri tespit edildi.',
    approvals: [
      {
        id: 'appr-1', cardId: 'card-4', action: 'approved', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        columnFrom: 'onay-uzman', columnTo: 'onay-yonetici',
        timestamp: '2026-07-16T11:00:00Z',
      },
    ],
  },
  {
    id: 'card-5', title: 'Melen Çayı Kalite Raporu', location: 'Düzce, TR',
    column: 'yayinlandi', riskScore: 18, riskLevel: 'low',
    createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-15T14:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Mehmet Demir', role: 'yonetici', initials: 'MD', color: '#00ff88' },
    tags: ['içme suyu', 'temiz'],
    description: 'Tüm parametreler normal sınırlar içinde.',
    approvals: [
      {
        id: 'appr-2', cardId: 'card-5', action: 'approved', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        columnFrom: 'onay-uzman', columnTo: 'onay-yonetici',
        timestamp: '2026-07-14T10:00:00Z',
      },
      {
        id: 'appr-3', cardId: 'card-5', action: 'approved', role: 'yonetici',
        actorName: 'Mehmet Demir', actorInitials: 'MD', actorColor: '#00ff88',
        columnFrom: 'onay-yonetici', columnTo: 'yayinlandi',
        timestamp: '2026-07-15T14:00:00Z',
      },
    ],
  },
  {
    id: 'card-6', title: 'Küçükçekmece Gölü Kirlilik Raporu', location: 'İstanbul, TR',
    column: 'reddedildi', riskScore: 91, riskLevel: 'critical',
    createdAt: '2026-07-09T16:00:00Z', updatedAt: '2026-07-14T09:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['endüstriyel', 'şehir'],
    description: 'Eksik veri noktaları nedeniyle rapor reddedildi.',
    approvals: [
      {
        id: 'appr-4', cardId: 'card-6', action: 'rejected', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        reason: 'Raporda kritik ölçüm noktaları eksik. En az 5 farklı lokasyondan veri alınmalı.',
        columnFrom: 'onay-uzman', columnTo: 'reddedildi',
        timestamp: '2026-07-14T09:00:00Z',
      },
    ],
  },
  {
    id: 'card-7', title: 'Kızılırmak Nehri Aylık İzleme', location: 'Kırıkkale, TR',
    column: 'yeni', riskScore: 32, riskLevel: 'medium',
    createdAt: '2026-07-17T07:30:00Z', updatedAt: '2026-07-17T07:30:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Admin User', role: 'admin', initials: 'AU', color: '#00d4ff' },
    tags: ['rutin', 'nehir', 'aylık'],
    description: 'Rutin aylık su kalitesi ölçümleri.',
    approvals: [],
  },
  {
    id: 'card-8', title: 'Terkos Gölü Turbidite Artışı', location: 'İstanbul, TR',
    column: 'onay-uzman', riskScore: 64, riskLevel: 'high',
    createdAt: '2026-07-16T13:00:00Z', updatedAt: '2026-07-17T06:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['turbidite', 'içme suyu', 'göl'],
    description: 'Yağış sonrası turbidite değerleri sınır üstünde seyrediyor.',
    approvals: [],
  },
];

/* ── CRUD ── */
export function getCards(): KanbanCard[] {
  return cards.map(c => ({ ...c, approvals: [...c.approvals] }));
}

export function getCardById(id: string): KanbanCard | undefined {
  return cards.find(c => c.id === id);
}

export function updateCardColumn(id: string, column: KanbanColumn): KanbanCard | null {
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return null;
  cards[idx] = { ...cards[idx], column, updatedAt: new Date().toISOString() };
  return cards[idx];
}

export function addApproval(
  cardId: string,
  record: Omit<ApprovalRecord, 'id' | 'cardId' | 'timestamp'>
): { card: KanbanCard; approval: ApprovalRecord } | null {
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return null;

  const approval: ApprovalRecord = {
    ...record,
    id: `appr-${Date.now()}`,
    cardId,
    timestamp: new Date().toISOString(),
  };

  cards[idx] = {
    ...cards[idx],
    column: record.columnTo,
    updatedAt: approval.timestamp,
    approvals: [...cards[idx].approvals, approval],
  };

  return { card: cards[idx], approval };
}

export function getCardsByColumn(column: KanbanColumn): KanbanCard[] {
  return cards.filter(c => c.column === column);
}
