/* ============================================================
   AquaGuard — Mail Log Store
   ============================================================ */

export type MailStatus = 'sent' | 'failed' | 'pending';
export type MailTrigger =
  | 'new-report'
  | 'ai-complete'
  | 'first-approval'
  | 'first-rejection'
  | 'published'
  | 'final-rejection';

export interface MailLog {
  id: string;
  templateId: MailTrigger;
  templateName: string;
  to: string;
  subject: string;
  status: MailStatus;
  error?: string;
  metadata: Record<string, string>;
  sentAt: string;
}

/* ── In-memory log store ── */
const logs: MailLog[] = [
  /* Seed with demo logs */
  {
    id: 'log-1', templateId: 'first-approval', templateName: '1. Onay Verildi — Yöneticiye Bildirim',
    to: 'mehmet@aquaguard.com', subject: '[AquaGuard] Onayınız Bekleniyor: İzmit Körfezi Mikroplastik Tespiti',
    status: 'sent', sentAt: '2026-07-16T11:01:00Z',
    metadata: { reportTitle: 'İzmit Körfezi Mikroplastik Tespiti', actorName: 'Ayşe Yılmaz' },
  },
  {
    id: 'log-2', templateId: 'first-rejection', templateName: '1. Red — Düzeltme Daveti',
    to: 'halk@aquaguard.com', subject: '[AquaGuard] Raporunuz Düzeltme Gerektiriyor: Küçükçekmece Gölü Kirlilik Raporu',
    status: 'sent', sentAt: '2026-07-14T09:01:00Z',
    metadata: { reportTitle: 'Küçükçekmece Gölü Kirlilik Raporu', reason: 'Eksik ölçüm noktaları.' },
  },
  {
    id: 'log-3', templateId: 'published', templateName: 'Rapor Yayınlandı',
    to: 'halk@aquaguard.com', subject: '[AquaGuard] 🎉 Raporunuz Yayınlandı: Melen Çayı Kalite Raporu',
    status: 'sent', sentAt: '2026-07-15T14:01:00Z',
    metadata: { reportTitle: 'Melen Çayı Kalite Raporu', actorName: 'Mehmet Demir' },
  },
  {
    id: 'log-4', templateId: 'new-report', templateName: 'Yeni Rapor Bildirimi',
    to: 'admin@aquaguard.com', subject: '[AquaGuard] Yeni Rapor Alındı: Kızılırmak Nehri Aylık İzleme',
    status: 'failed', error: 'SMTP connection timeout', sentAt: '2026-07-17T07:31:00Z',
    metadata: { reportTitle: 'Kızılırmak Nehri Aylık İzleme' },
  },
];

let logIdCounter = 100;

/* ── CRUD ── */
export function getLogs(limit = 100): MailLog[] {
  return [...logs].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, limit);
}

export function addLog(entry: Omit<MailLog, 'id' | 'sentAt'>): MailLog {
  const log: MailLog = {
    ...entry,
    id: `log-${++logIdCounter}`,
    sentAt: new Date().toISOString(),
  };
  logs.unshift(log);
  return log;
}

export function getLogStats() {
  const total = logs.length;
  const sent = logs.filter(l => l.status === 'sent').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const pending = logs.filter(l => l.status === 'pending').length;
  return { total, sent, failed, pending };
}
