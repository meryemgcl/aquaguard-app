import 'server-only';

import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import database from './local-db';
import {
  ApprovalRecord,
  IncidentResolution,
  KanbanCard,
  KanbanColumn,
  ReportCategory,
  RiskLevel,
  StatusAuditEvent,
  scoreToLevel,
} from './kanban-types';
import type { IncidentSubmission } from './incident-validation';
import type { UserRole, WaterIncidentAuditEntry } from './types';
import { suggestLocalRiskScore } from './local-risk-suggestion';

const measurementsSchema = z.object({
  ph: z.number().finite().min(0).max(14).optional(),
  turbidity: z.number().finite().min(0).max(100000).optional(),
  dissolvedO2: z.number().finite().min(0).max(100).optional(),
  temperature: z.number().finite().min(-5).max(100).optional(),
  conductivity: z.number().finite().min(0).max(1_000_000).optional(),
}).strict();

interface ReportRow {
  id: string;
  title: string;
  location: string;
  province: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  category: ReportCategory;
  incident_category: KanbanCard['incidentCategory'];
  description: string;
  column_name: KanbanColumn;
  risk_score: number;
  risk_level: RiskLevel;
  risk_assessed: number;
  ai_risk_score: number | null;
  photos_json: string;
  tracking_code: string | null;
  resolution_status: IncidentResolution | null;
  expert_reviewed_at: string | null;
  expert_notes: string | null;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
  creator_email: string;
  assignee_json: string;
  tags_json: string;
  measurements_json: string | null;
  approvals_json: string;
}

function readAuditTrail(reportId: string): StatusAuditEvent[] {
  return (database.prepare(`
    SELECT id, action, previous_status AS previousStatus, new_status AS newStatus,
      user_name AS user, role, timestamp, note
    FROM report_status_events
    WHERE report_id = ?
    ORDER BY id
  `).all(reportId) as StatusAuditEvent[]);
}

function statusForColumn(column: KanbanColumn, resolution: IncidentResolution | null = null): string {
  if (column === 'yeni') return 'yeni_ihbar';
  if (column === 'ai-analiz' || column === 'onay-uzman') return 'uzman_incelemesinde';
  if (column === 'onay-yonetici') return 'yonetici_onayinda';
  if (column === 'yayinlandi') return 'yayinda';
  return resolution ?? 'reddedildi';
}

function mapCard(
  row: ReportRow,
  includePhotos = true,
  auditTrail: StatusAuditEvent[] = readAuditTrail(row.id),
): KanbanCard {
  const coordinates = typeof row.latitude === 'number' && Number.isFinite(row.latitude) &&
    typeof row.longitude === 'number' && Number.isFinite(row.longitude) &&
    row.latitude >= -90 && row.latitude <= 90 &&
    row.longitude >= -180 && row.longitude <= 180
    ? { lat: row.latitude, lng: row.longitude }
    : null;

  return {
    id: row.id,
    title: row.title,
    location: row.location,
    province: row.province,
    district: row.district,
    coordinates,
    category: row.category,
    incidentCategory: row.incident_category,
    description: row.description,
    column: row.column_name,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    riskAssessed: row.risk_assessed === 1,
    aiRiskScore: row.ai_risk_score,
    photos: includePhotos ? parseJsonStringArray(row.photos_json) : [],
    trackingCode: row.tracking_code,
    resolution: row.resolution_status,
    expertReviewedAt: row.expert_reviewed_at,
    expertNotes: row.expert_notes,
    managerNotes: row.manager_notes,
    auditTrail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorEmail: row.creator_email,
    assignee: JSON.parse(row.assignee_json) as KanbanCard['assignee'],
    tags: JSON.parse(row.tags_json) as string[],
    measurements: row.measurements_json
      ? measurementsSchema.parse(JSON.parse(row.measurements_json))
      : undefined,
    approvals: JSON.parse(row.approvals_json) as ApprovalRecord[],
  };
}

function parseJsonStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
    throw new Error('Rapor fotoğraf verisi geçersiz.');
  }
  return parsed;
}

function readCard(id: string): KanbanCard | undefined {
  const row = database.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  return row ? mapCard(row) : undefined;
}

export function getCards(): KanbanCard[] {
  const rows = database.prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as ReportRow[];
  const events = database.prepare(`
    SELECT report_id, id, action, previous_status AS previousStatus, new_status AS newStatus,
      user_name AS user, role, timestamp, note
    FROM report_status_events ORDER BY id
  `).all() as (StatusAuditEvent & { report_id: string })[];
  const eventsByReport = new Map<string, StatusAuditEvent[]>();
  for (const event of events) {
    const { report_id: reportId, ...auditEvent } = event;
    const reportEvents = eventsByReport.get(reportId) ?? [];
    reportEvents.push(auditEvent);
    eventsByReport.set(reportId, reportEvents);
  }
  return rows.map(row => mapCard(row, false, eventsByReport.get(row.id) ?? []));
}

export function getFieldInspectionQueue(): KanbanCard[] {
  return (database.prepare(`
    SELECT * FROM reports
    WHERE column_name IN ('yeni', 'ai-analiz', 'onay-uzman')
    ORDER BY created_at ASC
  `).all() as ReportRow[]).map(row => mapCard(row));
}

export function getCardById(id: string): KanbanCard | undefined {
  return readCard(id);
}

export function getCardPhotos(id: string): string[] | undefined {
  const row = database.prepare('SELECT photos_json FROM reports WHERE id = ?').get(id) as
    { photos_json: string } | undefined;
  return row ? parseJsonStringArray(row.photos_json) : undefined;
}

export interface FieldInspectionInput {
  incidentId: string;
  verdict: 'confirmed' | 'not_confirmed';
  note: string;
  measurements: {
    ph?: number;
    dissolvedO2?: number;
    temperature?: number;
    conductivity?: number;
    turbidity?: number;
  };
  photos: string[];
  submittedAt: string;
}

export type FieldInspectionResult =
  | { ok: true; card: KanbanCard }
  | { ok: false; reason: 'not_found' | 'not_expert_queue' };

export function applyFieldInspection(
  input: FieldInspectionInput,
  actor: { name: string; role: 'uzman' },
): FieldInspectionResult {
  const timestamp = new Date().toISOString();
  const result = database.transaction((): FieldInspectionResult => {
    const card = readCard(input.incidentId);
    if (!card) return { ok: false, reason: 'not_found' };
    if (!['yeni', 'ai-analiz', 'onay-uzman'].includes(card.column)) {
      return { ok: false, reason: 'not_expert_queue' };
    }

    const combinedMeasurements = measurementsSchema.parse({
      ...card.measurements,
      ...input.measurements,
    });
    const combinedPhotos = [...card.photos, ...input.photos];
    const nextColumn: KanbanColumn = input.verdict === 'confirmed' ? 'onay-yonetici' : 'reddedildi';
    const nextResolution: IncidentResolution | null = input.verdict === 'confirmed' ? null : 'gecersiz_ihbar';
    const outcomeNote = input.verdict === 'confirmed'
      ? 'Kirlilik doğrulandı - acil müdahale gerekli.'
      : 'Doğal tortu / kirlilik doğrulanmadı.';
    const note = [outcomeNote, input.note.trim()].filter(Boolean).join('\n');
    const updated = database.prepare(`
      UPDATE reports
      SET column_name = ?, resolution_status = ?, measurements_json = ?,
          photos_json = ?, expert_notes = ?, risk_assessed = 1,
          expert_reviewed_at = COALESCE(expert_reviewed_at, ?),
          updated_at = ?
      WHERE id = ? AND column_name IN ('yeni', 'ai-analiz', 'onay-uzman')
    `).run(
      nextColumn,
      nextResolution,
      JSON.stringify(combinedMeasurements),
      JSON.stringify(combinedPhotos),
      [card.expertNotes, note].filter(Boolean).join('\n\n'),
      timestamp,
      timestamp,
      card.id,
    );
    if (!updated.changes) return { ok: false, reason: 'not_expert_queue' };

    const oldStatus = statusForColumn(card.column, card.resolution);
    const newStatus = statusForColumn(nextColumn, nextResolution);
    if (oldStatus !== newStatus) {
      appendStatusEvent(
        card.id,
        oldStatus,
        newStatus,
        actor,
        timestamp,
        note,
        'SAHA_OLCUMU_SENKRONIZE_EDILDI',
      );
    } else {
      appendStatusEvent(
        card.id,
        oldStatus,
        oldStatus,
        actor,
        timestamp,
        note,
        'SAHA_OLCUMU_SENKRONIZE_EDILDI',
      );
    }

    const updatedCard = readCard(card.id);
    if (!updatedCard) throw new Error('Saha incelemesi kaydedildi ancak güncel rapor okunamadı.');
    return { ok: true, card: updatedCard };
  });
  return result();
}

function appendStatusEvent(
  reportId: string,
  previousStatus: string | null,
  newStatus: string,
  actor: { name: string; role: UserRole },
  timestamp: string,
  note: string,
  action = 'STATU_DEGISTI',
) {
  database.prepare(`
    INSERT INTO report_status_events (
      report_id, action, previous_status, new_status, user_name, role, timestamp, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reportId, action, previousStatus, newStatus, actor.name, actor.role, timestamp, note);
}

export function startExpertReview(
  cardId: string,
  actor: { name: string; role: UserRole },
): KanbanCard | null {
  const transaction = database.transaction(() => {
    const card = readCard(cardId);
    if (!card || card.column !== 'yeni') return null;
    const timestamp = new Date().toISOString();
    const result = database.prepare(`
      UPDATE reports SET column_name = 'onay-uzman', updated_at = ?
      WHERE id = ? AND column_name = 'yeni'
    `).run(timestamp, cardId);
    if (!result.changes) return null;
    appendStatusEvent(cardId, 'yeni_ihbar', 'uzman_incelemesinde', actor, timestamp, 'Uzman incelemesi başlatıldı.');
    return readCard(cardId) ?? null;
  });
  return transaction();
}

export interface ExpertReviewInput {
  action: 'save' | 'forward' | 'invalid';
  riskScore: number;
  riskLevel: RiskLevel;
  acceptedAiSuggestion: boolean;
  measurements: Partial<{ ph: number; turbidity: number; dissolvedO2: number; temperature: number }>;
  note: string;
}

export function updateExpertReview(
  cardId: string,
  input: ExpertReviewInput,
  actor: { name: string; role: UserRole },
): KanbanCard | null {
  const transaction = database.transaction(() => {
    const card = readCard(cardId);
    if (!card || card.column !== 'onay-uzman') return null;
    if (!input.acceptedAiSuggestion && scoreToLevel(input.riskScore) !== input.riskLevel) {
      throw new Error('Seçilen risk düzeyi ile risk skoru eşleşmiyor.');
    }
    if (input.action === 'invalid' && !input.note.trim()) {
      throw new Error('Geçersiz ihbar için gerekçe zorunludur.');
    }

    const timestamp = new Date().toISOString();
    const acceptedScore = input.acceptedAiSuggestion ? card.aiRiskScore : null;
    if (input.acceptedAiSuggestion && acceptedScore === null) {
      throw new Error('Bu ihbar için kullanılabilir bir yerel risk önerisi bulunmuyor.');
    }
    const riskScore = acceptedScore ?? input.riskScore;
    const riskLevel = acceptedScore === null ? input.riskLevel : scoreToLevel(acceptedScore);
    const measurements = Object.keys(input.measurements).length
      ? JSON.stringify(input.measurements)
      : null;
    const note = [
      input.note.trim(),
      input.acceptedAiSuggestion ? 'Yerel risk önerisi uzman tarafından onaylandı.' : 'Risk seviyesi uzman tarafından belirlendi.',
    ].filter(Boolean).join(' ');
    const newColumn: KanbanColumn = input.action === 'forward'
      ? 'onay-yonetici'
      : input.action === 'invalid'
        ? 'reddedildi'
        : card.column;
    const resolution: IncidentResolution | null = input.action === 'invalid' ? 'gecersiz_ihbar' : null;

    const legacyAudit = database.prepare(
      'SELECT audit_trail_json FROM reports WHERE id = ?',
    ).get(cardId) as { audit_trail_json: string };
    const legacyEntries = JSON.parse(legacyAudit.audit_trail_json) as WaterIncidentAuditEntry[];
    legacyEntries.push({
      action: input.action === 'invalid' ? 'geçersiz ihbar olarak kapatıldı' : 'uzman değerlendirmesi kaydedildi',
      performedBy: actor.name,
      role: actor.role,
      timestamp,
      note: note || 'Uzman değerlendirmesi kaydedildi.',
    });

    const result = database.prepare(`
      UPDATE reports
      SET column_name = ?, resolution_status = ?, risk_score = ?, risk_level = ?,
          risk_assessed = 1, expert_reviewed_at = ?, measurements_json = ?,
          expert_notes = ?, audit_trail_json = ?, updated_at = ?
      WHERE id = ? AND column_name = 'onay-uzman'
    `).run(
      newColumn,
      resolution,
      riskScore,
      riskLevel,
      timestamp,
      measurements,
      note || null,
      JSON.stringify(legacyEntries),
      timestamp,
      cardId,
    );
    if (!result.changes) return null;

    const oldStatus = statusForColumn(card.column, card.resolution);
    const newStatus = statusForColumn(newColumn, resolution);
    appendStatusEvent(
      cardId,
      oldStatus,
      newStatus,
      actor,
      timestamp,
      note || 'Uzman değerlendirmesi kaydedildi.',
      input.action === 'save' ? 'UZMAN_DEGERLENDIRMESI' : 'STATU_DEGISTI',
    );
    return readCard(cardId) ?? null;
  });
  return transaction();
}

export function recordApproval(
  cardId: string,
  expectedColumn: KanbanColumn,
  record: Omit<ApprovalRecord, 'id' | 'cardId' | 'timestamp'>,
): KanbanCard | undefined {
  const transaction = database.transaction(() => {
    const card = readCard(cardId);
    if (!card || card.column !== expectedColumn ||
        record.role !== 'yonetici' ||
        expectedColumn !== 'onay-yonetici' ||
        (record.action === 'approved' && record.columnTo !== 'yayinlandi') ||
        (record.action === 'rejected' && (record.columnTo !== 'reddedildi' || record.resolution !== 'kapatildi'))) {
      return undefined;
    }

    const approval: ApprovalRecord = {
      ...record,
      id: randomUUID(),
      cardId,
      timestamp: new Date().toISOString(),
    };
    const newColumn = record.columnTo;
    const newResolution = newColumn === 'reddedildi'
      ? record.resolution ?? 'reddedildi'
      : null;
    const updatedApprovals = [...card.approvals, approval];
    const auditTrail = database.prepare(
      'SELECT audit_trail_json FROM reports WHERE id = ?',
    ).get(cardId) as { audit_trail_json: string };
    const auditEntries = JSON.parse(auditTrail.audit_trail_json) as WaterIncidentAuditEntry[];
    const auditEntry: WaterIncidentAuditEntry = {
      action: record.action === 'approved' ? 'onaylandı' : 'reddedildi',
      performedBy: record.actorName,
      role: record.role,
      timestamp: approval.timestamp,
      note: record.reason ?? (record.action === 'approved' ? 'İnceleme adımı tamamlandı.' : 'İhbar reddedildi.'),
    };
    auditEntries.push(auditEntry);
    const result = database.prepare(`
      UPDATE reports
      SET column_name = ?, resolution_status = ?, updated_at = ?, approvals_json = ?, audit_trail_json = ?,
          expert_notes = CASE WHEN ? = 'uzman' AND ? IS NOT NULL THEN ? ELSE expert_notes END,
          manager_notes = CASE
            WHEN ? = 'yonetici' AND ? IS NOT NULL THEN ?
            WHEN ? = 'yonetici' AND ? = 'yayinlandi' THEN 'İhbar yetkili yönetici tarafından onaylanarak yayımlandı.'
            ELSE manager_notes
          END
      WHERE id = ? AND column_name = ?
    `).run(
      newColumn,
      newResolution,
      approval.timestamp,
      JSON.stringify(updatedApprovals),
      JSON.stringify(auditEntries),
      record.role,
      record.reason ?? null,
      record.reason ?? null,
      record.role,
      record.reason ?? null,
      record.reason ?? null,
      record.role,
      newColumn,
      cardId,
      expectedColumn,
    );

    if (result.changes) {
      appendStatusEvent(
        cardId,
        statusForColumn(card.column, card.resolution),
        statusForColumn(newColumn, newResolution),
        { name: record.actorName, role: record.role },
        approval.timestamp,
        record.reason ?? (record.action === 'approved' ? 'İnceleme adımı tamamlandı.' : 'İhbar kapatıldı.'),
      );
    }
    return result.changes ? readCard(cardId) : undefined;
  });

  return transaction();
}

export function getCardsByColumn(column: KanbanColumn): KanbanCard[] {
  return (database.prepare(
    'SELECT * FROM reports WHERE column_name = ? ORDER BY created_at DESC',
  ).all(column) as ReportRow[]).map(row => mapCard(row));
}

function createUniqueTrackingCode(): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = Array.from({ length: 5 }, () => randomInt(36).toString(36)).join('').toUpperCase();
    const trackingCode = `AG-${new Date().getFullYear()}-${suffix}`;
    const existing = database.prepare('SELECT 1 FROM reports WHERE tracking_code = ?').get(trackingCode);
    if (!existing) return trackingCode;
  }
  throw new Error('Benzersiz ihbar takip kodu oluşturulamadı.');
}

export function addCard(data: IncidentSubmission & {
  creatorEmail: string;
  submittedBy: string;
  role: UserRole;
}): KanbanCard & { trackingCode: string } {
  const now = new Date().toISOString();
  const aiRiskScore = suggestLocalRiskScore(data.category, data.description);
  const legacyCategory: ReportCategory = ({
    'endüstriyel atık': 'discharge',
    'evsel atık': 'waste',
    'balık ölümü': 'fish-mortality',
    'renk/koku değişimi': 'odor-or-color',
  }[data.category] ?? 'other') as ReportCategory;
  const titlePrefix = data.category.charAt(0).toLocaleUpperCase('tr-TR') + data.category.slice(1);
  const card: KanbanCard = {
    id: randomUUID(),
    title: `${titlePrefix}: ${data.description.split(/\r?\n/)[0].slice(0, 120 - titlePrefix.length - 2)}`,
    location: data.addressText,
    province: data.province,
    district: data.district,
    coordinates: data.coordinates,
    category: legacyCategory,
    incidentCategory: data.category,
    description: data.description,
    column: 'yeni',
    riskScore: 0,
    riskLevel: scoreToLevel(0),
    riskAssessed: false,
    aiRiskScore,
    photos: data.photos,
    trackingCode: null,
    resolution: null,
    expertReviewedAt: null,
    expertNotes: null,
    managerNotes: null,
    auditTrail: [],
    createdAt: now,
    updatedAt: now,
    creatorEmail: data.creatorEmail,
    assignee: { name: 'Atanmadı', role: 'uzman', initials: '--', color: '#8892a8' },
    tags: [],
    approvals: [],
  };
  const auditTrail: WaterIncidentAuditEntry[] = [{
    action: 'oluşturuldu',
    performedBy: data.submittedBy,
    role: data.role,
    timestamp: now,
    note: 'İhbar alındı.',
  }];

  const insertReport = database.prepare(`
    INSERT INTO reports (
      id, title, location, province, district, latitude, longitude, category, incident_category, tracking_code, resolution_status,
      reporter_email, reporter_phone, photos_json, expert_notes, manager_notes, audit_trail_json,
      description, column_name, risk_score, risk_level, risk_assessed, ai_risk_score, expert_reviewed_at,
      created_at, updated_at, creator_email, assignee_json, tags_json,
      measurements_json, approvals_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const createReport = database.transaction(() => {
    const trackingCode = createUniqueTrackingCode();
    insertReport.run(
      card.id,
      card.title,
      card.location,
      card.province,
      card.district,
      card.coordinates?.lat ?? null,
      card.coordinates?.lng ?? null,
      card.category,
      data.category,
      trackingCode,
      null,
      data.contact.includes('@') ? data.contact : null,
      data.contact.includes('@') ? null : data.contact,
      JSON.stringify(data.photos),
      null,
      null,
      JSON.stringify(auditTrail),
      card.description,
      card.column,
      card.riskScore,
      card.riskLevel,
      card.riskAssessed ? 1 : 0,
      aiRiskScore,
      null,
      card.createdAt,
      card.updatedAt,
      card.creatorEmail,
      JSON.stringify(card.assignee),
      JSON.stringify(card.tags),
      null,
      JSON.stringify(card.approvals),
    );
    appendStatusEvent(
      card.id,
      null,
      'yeni_ihbar',
      { name: data.submittedBy, role: data.role },
      now,
      'İhbar sisteme alındı.',
    );
    return trackingCode;
  });
  const trackingCode = createReport();
  return { ...card, trackingCode, aiRiskScore, auditTrail: readAuditTrail(card.id) };
}
