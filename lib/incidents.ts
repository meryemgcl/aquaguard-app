import 'server-only';

import { z } from 'zod';
import database from '@/lib/local-db';
import type { WaterIncidentStatus } from '@/lib/types';

const approvalSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  role: z.enum(['uzman', 'yonetici']),
  reason: z.string().optional(),
  timestamp: z.string(),
});

interface IncidentRow {
  id: string;
  tracking_code: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  incident_category: string;
  description: string;
  column_name: string;
  created_at: string;
  updated_at: string;
  expert_notes: string | null;
  manager_notes: string | null;
  audit_trail_json: string;
  approvals_json: string;
  resolution_status: 'gecersiz_ihbar' | 'kapatildi' | 'reddedildi' | null;
}

interface IncidentAuditRow {
  action: string;
  new_status: string;
  role: string;
  timestamp: string;
  note: string;
}

export interface PublicIncidentTracking {
  trackingCode: string;
  title: string;
  category: string;
  addressText: string;
  coordinates: { lat: number; lng: number };
  reportedAt: string;
  updatedAt: string;
  status: WaterIncidentStatus;
  statusLabel: string;
  timeline: {
    label: string;
    completed: boolean;
    timestamp: string | null;
  }[];
  officialNote: string | null;
}

const statusByColumn: Record<string, WaterIncidentStatus> = {
  yeni: 'yeni_ihbar',
  'ai-analiz': 'uzman_incelemesinde',
  'onay-uzman': 'uzman_incelemesinde',
  'onay-yonetici': 'yonetici_onayinda',
  yayinlandi: 'yayinda',
  reddedildi: 'reddedildi',
};

const statusLabels: Record<WaterIncidentStatus, string> = {
  yeni_ihbar: 'İhbar alındı',
  uzman_incelemesinde: 'Uzman incelemesinde',
  dogrulandi: 'Yetkili ekip tarafından doğrulandı',
  yonetici_onayinda: 'Yönetici kararı bekleniyor',
  yayinda: 'Çözüldü / yayınlandı',
  reddedildi: 'İhbar reddedildi',
  gecersiz_ihbar: 'Geçersiz ihbar olarak kapatıldı',
  kapatildi: 'İhbar kapatıldı',
};

export function getPublicIncidentTracking(trackingCode: string): PublicIncidentTracking | undefined {
  const row = database.prepare(`
    SELECT id, tracking_code, title, location, latitude, longitude, incident_category, description,
      column_name, created_at, updated_at, expert_notes, manager_notes, audit_trail_json, approvals_json,
      resolution_status
    FROM reports
    WHERE tracking_code = ?
  `).get(trackingCode) as IncidentRow | undefined;
  if (!row) return undefined;

  if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') {
    throw new Error(`İhbar ${row.tracking_code} için konum verisi geçersiz.`);
  }
  const status = row.column_name === 'reddedildi'
    ? row.resolution_status ?? 'reddedildi'
    : statusByColumn[row.column_name];
  if (!status) throw new Error(`İhbar ${row.tracking_code} için bilinmeyen durum: ${row.column_name}`);

  const approvals = z.array(approvalSchema).parse(JSON.parse(row.approvals_json));
  const auditTrail = database.prepare(`
    SELECT action, new_status, role, timestamp, note
    FROM report_status_events WHERE report_id = ? ORDER BY id
  `).all(row.id) as IncidentAuditRow[];
  const expertAction = auditTrail.find(entry => entry.role === 'uzman' && entry.new_status !== 'yeni_ihbar');
  const managerAction = auditTrail.find(entry => entry.role === 'yonetici');
  const latestApproval = approvals.at(-1);
  const latestAuditEvent = auditTrail.filter(event => event.action !== 'MIGRATION_SNAPSHOT').at(-1);

  const currentStep = row.column_name === 'yeni' ? 0
    : row.column_name === 'ai-analiz' || row.column_name === 'onay-uzman' ? 1
    : row.column_name === 'onay-yonetici' ? 2
    : row.column_name === 'yayinlandi' ? 3
    : latestApproval?.role === 'yonetici' ? 2 : 1;
  const rejected = row.column_name === 'reddedildi';
  const stepLabels = ['İhbar alındı', 'Uzman incelemesi', 'Yönetici kararı', rejected ? 'İhbar kapatıldı' : 'Çözüldü / yayınlandı'];
  const timeline = stepLabels.map((label, index) => ({
    label,
    completed: rejected ? index < currentStep || index === 3 : index <= currentStep,
    timestamp: index === 0 ? row.created_at
      : index === 1 ? expertAction?.timestamp ?? null
      : index === 2 ? managerAction?.timestamp ?? null
      : rejected ? latestAuditEvent?.timestamp ?? latestApproval?.timestamp ?? row.updated_at
      : row.column_name === 'yayinlandi' ? row.updated_at : null,
  }));

  const officialNote = rejected
    ? latestAuditEvent?.note?.trim() || latestApproval?.reason?.trim() || row.expert_notes?.trim() || 'İhbar, inceleme sonucunda kapatıldı. Ayrıntılı gerekçe henüz paylaşılmadı.'
    : row.column_name === 'yayinlandi'
      ? row.manager_notes?.trim() || 'İhbar yetkili yönetici tarafından onaylanarak yayımlandı.'
      : null;

  return {
    trackingCode: row.tracking_code,
    title: row.title,
    category: row.incident_category,
    addressText: row.location,
    coordinates: { lat: row.latitude, lng: row.longitude },
    reportedAt: row.created_at,
    updatedAt: row.updated_at,
    status,
    statusLabel: statusLabels[status],
    timeline,
    officialNote,
  };
}
