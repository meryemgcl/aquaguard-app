import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
import type {
  FieldInspectionPayload,
  FieldSyncResult,
  FieldSyncServerIncident,
} from './field-inspection';
import { suggestLocalRiskScore } from './local-risk-suggestion';
import {
  mediaUrl,
  removeMediaFiles,
  saveImageDataUrl,
  type MediaMetadata,
} from './media-storage';
import { decryptReporterContact, encryptReporterContact } from './reporter-contact';

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
  media_metadata_json: string;
  privacy_level: KanbanCard['privacyLevel'];
  tracking_code: string | null;
  resolution_status: IncidentResolution | null;
  expert_reviewed_at: string | null;
  expert_notes: string | null;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  creator_email: string | null;
  assignee_json: string;
  tags_json: string;
  measurements_json: string | null;
  approvals_json: string;
}

function readAuditTrail(reportId: string): StatusAuditEvent[] {
  return (database.prepare(`
    SELECT id, action, previous_status AS previousStatus, new_status AS newStatus,
      user_name AS user, role, timestamp, note, resolution
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
    photos: includePhotos ? parseMediaMetadata(row.media_metadata_json).map(item => mediaUrl(item.filename)) : [],
    trackingCode: row.tracking_code,
    privacyLevel: row.privacy_level,
    resolution: row.resolution_status,
    expertReviewedAt: row.expert_reviewed_at,
    expertNotes: row.expert_notes,
    managerNotes: row.manager_notes,
    auditTrail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    creatorEmail: row.creator_email ?? '',
    assignee: JSON.parse(row.assignee_json) as KanbanCard['assignee'],
    tags: JSON.parse(row.tags_json) as string[],
    measurements: row.measurements_json
      ? measurementsSchema.parse(JSON.parse(row.measurements_json))
      : undefined,
    approvals: JSON.parse(row.approvals_json) as ApprovalRecord[],
  };
}

function parseMediaMetadata(value: string): MediaMetadata[] {
  const parsed: unknown = JSON.parse(value);
  const schema = z.array(z.object({
    id: z.string().uuid(),
    filename: z.string().regex(/^inc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().positive().max(5 * 1024 * 1024),
    createdAt: z.string().datetime(),
  }).strict());
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Rapor medya üst verisi geçersiz.');
  }
  return result.data;
}

const REPORT_COLUMNS = `
  id, title, location, province, district, latitude, longitude, category, incident_category,
  description, column_name, risk_score, risk_level, risk_assessed, ai_risk_score,
  media_metadata_json, tracking_code, resolution_status, expert_reviewed_at,
  expert_notes, manager_notes, created_at, updated_at, creator_email, assignee_json,
  tags_json, measurements_json, approvals_json, privacy_level, version
`;

function readCard(id: string): KanbanCard | undefined {
  const row = database.prepare(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ?`).get(id) as ReportRow | undefined;
  return row ? mapCard(row) : undefined;
}

export function getCards(): KanbanCard[] {
  const rows = database.prepare(`SELECT ${REPORT_COLUMNS} FROM reports ORDER BY created_at DESC`).all() as ReportRow[];
  const events = database.prepare(`
    SELECT report_id, id, action, previous_status AS previousStatus, new_status AS newStatus,
      user_name AS user, role, timestamp, note, resolution
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
    SELECT ${REPORT_COLUMNS} FROM reports
    WHERE column_name IN ('yeni', 'ai-analiz', 'onay-uzman')
    ORDER BY created_at ASC
  `).all() as ReportRow[]).map(row => mapCard(row));
}

export function getCardById(id: string): KanbanCard | undefined {
  return readCard(id);
}

export function getCardPhotos(id: string): string[] | undefined {
  const row = database.prepare('SELECT media_metadata_json FROM reports WHERE id = ?').get(id) as
    { media_metadata_json: string } | undefined;
  return row ? parseMediaMetadata(row.media_metadata_json).map(item => mediaUrl(item.filename)) : undefined;
}

export function getMediaAccess(filename: string): { media: MediaMetadata; isPublic: boolean } | undefined {
  const rows = database.prepare(`
    SELECT id, column_name, resolution_status, media_metadata_json FROM reports
  `).all() as Array<{
    id: string;
    column_name: KanbanColumn;
    resolution_status: IncidentResolution | null;
    media_metadata_json: string;
  }>;
  for (const row of rows) {
    const media = parseMediaMetadata(row.media_metadata_json).find(item => item.filename === filename);
    if (media) {
      return {
        media,
        isPublic: row.column_name === 'yayinlandi' ||
          (row.column_name === 'reddedildi' && row.resolution_status === 'kapatildi'),
      };
    }
  }
  return undefined;
}

export function getReporterContact(cardId: string): {
  privacyLevel: KanbanCard['privacyLevel'];
  reporterName: string;
  contact: string | null;
} | undefined {
  const row = database.prepare(`
    SELECT reporter_name, privacy_level, reporter_contact_encrypted, reporter_email, reporter_phone
    FROM reports WHERE id = ?
  `).get(cardId) as {
    reporter_name: string;
    privacy_level: KanbanCard['privacyLevel'];
    reporter_contact_encrypted: string | null;
    reporter_email: string | null;
    reporter_phone: string | null;
  } | undefined;
  if (!row) return undefined;
  if (row.privacy_level === 'anonim') {
    return { privacyLevel: row.privacy_level, reporterName: 'Gizli İhbarcı', contact: null };
  }
  if (row.reporter_contact_encrypted) {
    const decrypted = decryptReporterContact(row.reporter_contact_encrypted);
    return {
      privacyLevel: row.privacy_level,
      reporterName: decrypted.name,
      contact: decrypted.contact,
    };
  }
  return {
    privacyLevel: row.privacy_level,
    reporterName: row.reporter_name,
    contact: row.reporter_email ?? row.reporter_phone,
  };
}

export type FieldInspectionInput = FieldInspectionPayload;

function syncServerIncident(card: KanbanCard): FieldSyncServerIncident {
  return {
    id: card.id,
    trackingCode: card.trackingCode,
    title: card.title,
    status: statusForColumn(card.column, card.resolution),
    column: card.column,
    resolution: card.resolution,
    version: card.version,
    updatedAt: card.updatedAt,
    ...(card.measurements ? { measurements: card.measurements } : {}),
    managerNotes: card.managerNotes,
    expertNotes: card.expertNotes,
  };
}

function mutationHash(input: FieldInspectionInput): string {
  const stablePayload = {
    incidentId: input.incidentId,
    baseVersion: input.baseVersion,
    verdict: input.verdict,
    notes: input.notes,
    measurements: input.measurements,
    fieldPhotos: input.fieldPhotos,
    timestamp: input.timestamp,
    resolution: input.resolution ?? null,
  };
  return createHash('sha256').update(JSON.stringify(stablePayload)).digest('hex');
}

export function applyFieldInspection(
  input: FieldInspectionInput,
  actor: { name: string; role: 'uzman' },
): FieldSyncResult {
  const timestamp = new Date().toISOString();
  const createdMedia: MediaMetadata[] = [];
  let committed = false;
  try {
    const result = database.transaction((): FieldSyncResult => {
    const payloadHash = mutationHash(input);
    const prior = database.prepare(`
      SELECT payload_hash, result_json FROM sync_mutations WHERE client_mutation_id = ?
    `).get(input.clientMutationId) as { payload_hash: string; result_json: string } | undefined;
    if (prior) {
      if (prior.payload_hash !== payloadHash) {
        return {
          clientMutationId: input.clientMutationId,
          incidentId: input.incidentId,
          status: 'REJECTED',
          message: 'Bu mutation kimliği daha önce farklı bir içerikle kullanılmış.',
        };
      }
      const cached = JSON.parse(prior.result_json) as FieldSyncResult;
      return {
        ...cached,
        status: cached.status === 'SUCCESS' || cached.status === 'ALREADY_PROCESSED'
          ? 'ALREADY_PROCESSED'
          : cached.status,
        message: cached.status === 'SUCCESS'
          ? 'Bu saha kaydı daha önce başarıyla işlendi.'
          : cached.message,
      };
    }

    const card = readCard(input.incidentId);
    if (!card) {
      return {
        clientMutationId: input.clientMutationId,
        incidentId: input.incidentId,
        status: 'REJECTED',
        message: 'İhbar bulunamadı.',
      };
    }
    const editable = ['yeni', 'ai-analiz', 'onay-uzman'].includes(card.column);

    if (input.resolution === 'DISCARDED') {
      const updated = database.prepare(`
        UPDATE reports SET version = version + 1, updated_at = ?
        WHERE id = ? AND version = ?
      `).run(timestamp, card.id, input.baseVersion);
      if (!updated.changes) {
        const current = readCard(card.id);
        const conflict: FieldSyncResult = {
          clientMutationId: input.clientMutationId,
          incidentId: card.id,
          status: 'CONFLICT',
          message: 'İhbar bu karar sırasında yeniden değişti. Güncel sürümü inceleyin.',
          ...(current ? { serverIncident: syncServerIncident(current) } : {}),
        };
        storeSyncMutation(input, payloadHash, conflict, timestamp);
        return conflict;
      }
      appendStatusEvent(
        card.id,
        statusForColumn(card.column, card.resolution),
        statusForColumn(card.column, card.resolution),
        actor,
        timestamp,
        'Uzman sunucu sürümünü kabul ederek çakışan saha ölçümünden vazgeçti.',
        'CATISMA_COZULDU',
        'DISCARDED',
      );
      const discardedCard = readCard(card.id);
      const discarded: FieldSyncResult = {
        clientMutationId: input.clientMutationId,
        incidentId: card.id,
        status: 'SUCCESS',
        message: 'Sunucudaki güncel sürüm kabul edildi; yerel saha ölçümü vazgeçildi.',
        ...(discardedCard ? { serverIncident: syncServerIncident(discardedCard) } : {}),
      };
      storeSyncMutation(input, payloadHash, discarded, timestamp);
      return discarded;
    }

    if (!editable || card.version !== input.baseVersion) {
      const conflict: FieldSyncResult = {
        clientMutationId: input.clientMutationId,
        incidentId: card.id,
        status: 'CONFLICT',
        message: !editable
          ? 'İhbar uzman düzenlemesine kapalı; yönetici kararı korunmuştur.'
          : 'İhbar cihaz çevrimdışıyken değişti. Sunucu ve saha sürümleri farklı.',
        serverIncident: syncServerIncident(card),
      };
      storeSyncMutation(input, payloadHash, conflict, timestamp);
      return conflict;
    }

    const combinedMeasurements = measurementsSchema.parse({
      ...card.measurements,
      ...input.measurements,
    });
    const existingMediaRow = database.prepare(
      'SELECT media_metadata_json FROM reports WHERE id = ?',
    ).get(card.id) as { media_metadata_json: string };
    const combinedMedia = parseMediaMetadata(existingMediaRow.media_metadata_json);
    for (const photo of input.fieldPhotos) createdMedia.push(saveImageDataUrl(card.id, photo));
    combinedMedia.push(...createdMedia);
    const nextColumn: KanbanColumn = input.verdict === 'confirmed' ? 'onay-yonetici' : 'reddedildi';
    const nextResolution: IncidentResolution | null = input.verdict === 'confirmed' ? null : 'gecersiz_ihbar';
    const outcomeNote = input.verdict === 'confirmed'
      ? 'Kirlilik doğrulandı - acil müdahale gerekli.'
      : 'Doğal tortu / kirlilik doğrulanmadı.';
    const note = [outcomeNote, input.notes.trim()].filter(Boolean).join('\n');
    const updated = database.prepare(`
      UPDATE reports
      SET column_name = ?, resolution_status = ?, measurements_json = ?,
          media_metadata_json = ?, expert_notes = ?, risk_assessed = 1,
          expert_reviewed_at = COALESCE(expert_reviewed_at, ?),
          updated_at = ?, version = version + 1
      WHERE id = ? AND version = ? AND column_name IN ('yeni', 'ai-analiz', 'onay-uzman')
    `).run(
      nextColumn,
      nextResolution,
      JSON.stringify(combinedMeasurements),
      JSON.stringify(combinedMedia),
      [card.expertNotes, note].filter(Boolean).join('\n\n'),
      timestamp,
      timestamp,
      card.id,
      input.baseVersion,
    );
    if (!updated.changes) {
      const current = readCard(card.id);
      const conflict: FieldSyncResult = {
        clientMutationId: input.clientMutationId,
        incidentId: card.id,
        status: 'CONFLICT',
        message: 'İhbar eşzamanlı olarak değişti; uzman değerlendirmesi uygulanmadı.',
        ...(current ? { serverIncident: syncServerIncident(current) } : {}),
      };
      storeSyncMutation(input, payloadHash, conflict, timestamp);
      return conflict;
    }

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
          input.resolution === 'FORCE_OVERWRITE'
            ? 'SAHA_OLCUMU_SENKRONIZE_EDILDI:FORCE_OVERWRITE'
            : 'SAHA_OLCUMU_SENKRONIZE_EDILDI',
        );
    } else {
      appendStatusEvent(
        card.id,
        oldStatus,
        oldStatus,
        actor,
        timestamp,
        note,
        input.resolution === 'FORCE_OVERWRITE'
          ? 'SAHA_OLCUMU_SENKRONIZE_EDILDI:FORCE_OVERWRITE'
          : 'SAHA_OLCUMU_SENKRONIZE_EDILDI',
      );
    }

    if (input.resolution === 'FORCE_OVERWRITE') {
      appendStatusEvent(
        card.id,
        newStatus,
        newStatus,
        actor,
        timestamp,
        'Uzman, güncel ve düzenlenebilir sunucu sürümüne saha ölçümlerini uyguladı.',
        'CATISMA_COZULDU',
        'FORCE_OVERWRITE',
      );
    }
    const updatedCard = readCard(card.id);
    if (!updatedCard) throw new Error('Saha incelemesi kaydedildi ancak güncel rapor okunamadı.');
    const success: FieldSyncResult = {
      clientMutationId: input.clientMutationId,
      incidentId: card.id,
      status: 'SUCCESS',
      message: input.resolution === 'FORCE_OVERWRITE'
        ? 'Çakışma açıkça çözüldü; saha ölçümleri güncel sürüme uygulandı.'
        : 'Saha ölçümleri ve inceleme kaydedildi.',
      serverIncident: syncServerIncident(updatedCard),
    };
    storeSyncMutation(input, payloadHash, success, timestamp);
    committed = true;
    return success;
    });
    const applied = result();
    if (!committed) removeMediaFiles(createdMedia);
    return applied;
  } catch (error) {
    removeMediaFiles(createdMedia);
    throw error;
  }
}

function storeSyncMutation(
  input: FieldInspectionInput,
  payloadHash: string,
  result: FieldSyncResult,
  timestamp: string,
): void {
  database.prepare(`
    INSERT INTO sync_mutations (client_mutation_id, incident_id, payload_hash, result_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.clientMutationId, input.incidentId, payloadHash, JSON.stringify(result), timestamp);
}

function appendStatusEvent(
  reportId: string,
  previousStatus: string | null,
  newStatus: string,
  actor: { name: string; role: UserRole },
  timestamp: string,
  note: string,
  action = 'STATU_DEGISTI',
  resolution?: 'FORCE_OVERWRITE' | 'DISCARDED',
) {
  database.prepare(`
    INSERT INTO report_status_events (
      report_id, action, previous_status, new_status, user_name, role, timestamp, note, resolution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reportId, action, previousStatus, newStatus, actor.name, actor.role, timestamp, note, resolution ?? null);
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
      UPDATE reports       SET column_name = 'onay-uzman', updated_at = ?, version = version + 1
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
          expert_notes = ?, audit_trail_json = ?, updated_at = ?, version = version + 1
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
          version = version + 1,
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
    `SELECT ${REPORT_COLUMNS} FROM reports WHERE column_name = ? ORDER BY created_at DESC`,
  ).all(column) as ReportRow[]).map(row => mapCard(row));
}

function createUniqueTrackingCode(): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = randomBytes(16).toString('hex').toUpperCase();
    const trackingCode = `AG-${new Date().getFullYear()}-${suffix}`;
    const existing = database.prepare('SELECT 1 FROM reports WHERE tracking_code = ?').get(trackingCode);
    if (!existing) return trackingCode;
  }
  throw new Error('Benzersiz ihbar takip kodu oluşturulamadı.');
}

export function addCard(data: IncidentSubmission & {
  creatorEmail: string | null;
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
    privacyLevel: data.privacyLevel,
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
    version: 1,
    creatorEmail: data.creatorEmail ?? '',
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

  const encryptedContact = data.privacyLevel === 'anonim'
    ? null
    : encryptReporterContact({ name: data.reporterName!, contact: data.contact! });
  const media: MediaMetadata[] = [];
  try {
    for (const photo of data.photos) media.push(saveImageDataUrl(card.id, photo));
  } catch (error) {
    removeMediaFiles(media);
    throw error;
  }
  const insertReport = database.prepare(`
    INSERT INTO reports (
      id, title, location, province, district, latitude, longitude, category, incident_category, tracking_code, resolution_status,
      reporter_name, reporter_email, reporter_phone, reporter_contact_encrypted, privacy_level,
      media_metadata_json, expert_notes, manager_notes, audit_trail_json,
      description, column_name, risk_score, risk_level, risk_assessed, ai_risk_score, expert_reviewed_at,
      created_at, updated_at, version, creator_email, assignee_json, tags_json,
      measurements_json, approvals_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  try {
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
        data.privacyLevel === 'acik' ? data.reporterName : 'Gizli İhbarcı',
        null,
        null,
        encryptedContact,
        data.privacyLevel,
        JSON.stringify(media),
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
        card.version,
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
    return {
      ...card,
      trackingCode,
      photos: media.map(item => mediaUrl(item.filename)),
      aiRiskScore,
      auditTrail: readAuditTrail(card.id),
    };
  } catch (error) {
    removeMediaFiles(media);
    throw error;
  }
}
