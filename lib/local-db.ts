import BetterSqlite3 from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const databasePath = process.env.AQUAGUARD_DB_PATH
  ? path.resolve(process.env.AQUAGUARD_DB_PATH)
  : path.join(process.cwd(), 'data', 'aquaguard.db');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new BetterSqlite3(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'uzman', 'yonetici', 'halk')),
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending', 'rejected')),
    requested_role TEXT CHECK (requested_role IN ('uzman', 'yonetici')),
    avatar TEXT,
    created_at TEXT NOT NULL,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    two_factor_secret TEXT,
    backup_codes_json TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    province TEXT,
    district TEXT,
    latitude REAL,
    longitude REAL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('discharge', 'fish-mortality', 'odor-or-color', 'waste', 'other')),
    incident_category TEXT NOT NULL DEFAULT 'evsel atık' CHECK (incident_category IN ('endüstriyel atık', 'evsel atık', 'balık ölümü', 'renk/koku değişimi')),
    tracking_code TEXT,
    resolution_status TEXT CHECK (resolution_status IN ('gecersiz_ihbar', 'kapatildi', 'reddedildi')),
    reporter_name TEXT NOT NULL DEFAULT 'Gizli İhbarcı',
    reporter_email TEXT,
    reporter_phone TEXT,
    reporter_contact_encrypted TEXT,
    privacy_level TEXT NOT NULL DEFAULT 'acik' CHECK (privacy_level IN ('anonim', 'gizli_iletisim', 'acik')),
    media_metadata_json TEXT NOT NULL DEFAULT '[]',
    expert_notes TEXT,
    manager_notes TEXT,
    audit_trail_json TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL,
    column_name TEXT NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL,
    risk_assessed INTEGER NOT NULL DEFAULT 0 CHECK (risk_assessed IN (0, 1)),
    ai_risk_score INTEGER CHECK (ai_risk_score BETWEEN 0 AND 100),
    expert_reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    creator_email TEXT,
    assignee_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    measurements_json TEXT,
    approvals_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);
  CREATE INDEX IF NOT EXISTS reports_column_idx ON reports(column_name);

  CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    measurements_json TEXT NOT NULL DEFAULT '{}',
    measured_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS measurement_thresholds (
    id TEXT PRIMARY KEY,
    parameter TEXT NOT NULL,
    unit TEXT NOT NULL,
    comparator TEXT NOT NULL CHECK (comparator IN ('above', 'below')),
    threshold_value REAL NOT NULL,
    hysteresis REAL NOT NULL DEFAULT 0 CHECK (hysteresis >= 0),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    consecutive_count INTEGER NOT NULL DEFAULT 1 CHECK (consecutive_count BETWEEN 1 AND 20),
    active_from TEXT NOT NULL,
    active_until TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS measurement_thresholds_active_idx
    ON measurement_thresholds(parameter, active_from, active_until);

  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    parameter TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    measured_at TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('manual', 'sensor', 'laboratory')),
    source_record_id TEXT NOT NULL,
    quality_flag TEXT NOT NULL CHECK (quality_flag IN ('valid', 'suspect', 'invalid')),
    calibration_status TEXT NOT NULL CHECK (calibration_status IN ('current', 'due', 'unknown', 'not_applicable')),
    recorded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (station_id, source, source_record_id)
  );
  CREATE INDEX IF NOT EXISTS measurements_station_parameter_time_idx
    ON measurements(station_id, parameter, measured_at DESC);
  CREATE INDEX IF NOT EXISTS measurements_measured_at_idx ON measurements(measured_at);

  CREATE TABLE IF NOT EXISTS station_alerts (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    threshold_id TEXT NOT NULL REFERENCES measurement_thresholds(id),
    parameter TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_value REAL NOT NULL,
    measurement_count INTEGER NOT NULL DEFAULT 1,
    acknowledged_by TEXT,
    acknowledged_at TEXT,
    resolved_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS station_alerts_active_dedup_idx
    ON station_alerts(station_id, threshold_id) WHERE status IN ('open', 'acknowledged');
  CREATE INDEX IF NOT EXISTS station_alerts_status_time_idx
    ON station_alerts(status, last_seen_at DESC);
`);

const reportColumns = new Set(
  (database.prepare('PRAGMA table_info(reports)').all() as { name: string }[]).map(column => column.name),
);
const reportMigrations: [string, string][] = [
  ['province', 'TEXT'],
  ['district', 'TEXT'],
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['category', "TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('discharge', 'fish-mortality', 'odor-or-color', 'waste', 'other'))"],
  ['risk_assessed', 'INTEGER NOT NULL DEFAULT 0 CHECK (risk_assessed IN (0, 1))'],
  ['incident_category', "TEXT NOT NULL DEFAULT 'evsel atık' CHECK (incident_category IN ('endüstriyel atık', 'evsel atık', 'balık ölümü', 'renk/koku değişimi'))"],
  ['tracking_code', 'TEXT'],
  ['resolution_status', "TEXT CHECK (resolution_status IN ('gecersiz_ihbar', 'kapatildi', 'reddedildi'))"],
  ['reporter_email', 'TEXT'],
  ['reporter_phone', 'TEXT'],
  ['reporter_name', "TEXT NOT NULL DEFAULT 'Gizli İhbarcı'"],
  ['reporter_contact_encrypted', 'TEXT'],
  ['privacy_level', "TEXT NOT NULL DEFAULT 'acik' CHECK (privacy_level IN ('anonim', 'gizli_iletisim', 'acik'))"],
  ['media_metadata_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['expert_notes', 'TEXT'],
  ['manager_notes', 'TEXT'],
  ['audit_trail_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['ai_risk_score', 'INTEGER CHECK (ai_risk_score BETWEEN 0 AND 100)'],
  ['expert_reviewed_at', 'TEXT'],
  ['version', 'INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)'],
];
for (const [column, definition] of reportMigrations) {
  if (!reportColumns.has(column)) {
    database.exec(`ALTER TABLE reports ADD COLUMN ${column} ${definition}`);
  }
}

database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS reports_tracking_code_unique_idx
    ON reports(tracking_code)
    WHERE tracking_code IS NOT NULL;
  CREATE TABLE IF NOT EXISTS sync_mutations (
    client_mutation_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
    payload_hash TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sync_mutations_incident_idx
    ON sync_mutations(incident_id, created_at);
`);

database.exec(`
    CREATE TABLE IF NOT EXISTS report_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'uzman', 'yonetici', 'halk')),
      timestamp TEXT NOT NULL,
      note TEXT NOT NULL,
      resolution TEXT CHECK (resolution IN ('FORCE_OVERWRITE', 'DISCARDED'))
    );
    CREATE INDEX IF NOT EXISTS report_status_events_report_idx
      ON report_status_events(report_id, id);
    CREATE TRIGGER IF NOT EXISTS report_status_events_immutable_update
      BEFORE UPDATE ON report_status_events
      BEGIN
        SELECT RAISE(ABORT, 'status audit events are immutable');
      END;
    CREATE TRIGGER IF NOT EXISTS report_status_events_immutable_delete
      BEFORE DELETE ON report_status_events
      BEGIN
        SELECT RAISE(ABORT, 'status audit events are immutable');
      END;
  `);

const statusEventColumns = new Set(
  (database.prepare('PRAGMA table_info(report_status_events)').all() as { name: string }[]).map(column => column.name),
);
if (!statusEventColumns.has('resolution')) {
  database.exec(`
    ALTER TABLE report_status_events ADD COLUMN resolution TEXT
      CHECK (resolution IN ('FORCE_OVERWRITE', 'DISCARDED'))
  `);
}

  database.prepare(`
    INSERT INTO report_status_events (
      report_id, action, previous_status, new_status, user_name, role, timestamp, note
    )
    SELECT r.id, 'MIGRATION_SNAPSHOT', NULL,
      CASE r.column_name
        WHEN 'yeni' THEN 'yeni_ihbar'
        WHEN 'ai-analiz' THEN 'uzman_incelemesinde'
        WHEN 'onay-uzman' THEN 'uzman_incelemesinde'
        WHEN 'onay-yonetici' THEN 'yonetici_onayinda'
        WHEN 'yayinlandi' THEN 'yayinda'
        ELSE COALESCE(r.resolution_status, 'reddedildi')
      END,
      'AquaGuard migration', 'super_admin', r.updated_at, 'Mevcut kayıt için denetim izi geçiş anında başlatıldı.'
    FROM reports r
    WHERE NOT EXISTS (
      SELECT 1 FROM report_status_events e WHERE e.report_id = r.id
    )
`).run();

database.exec(`
  UPDATE reports
  SET column_name = 'onay-uzman', version = version + 1
  WHERE column_name = 'ai-analiz'
`);

const reportsMissingTrackingCode = database.prepare(
  'SELECT id, category FROM reports WHERE tracking_code IS NULL',
).all() as { id: string; category: string }[];
const backfillIncident = database.prepare(`
  UPDATE reports
  SET tracking_code = ?, incident_category = CASE category
    WHEN 'discharge' THEN 'endüstriyel atık'
    WHEN 'fish-mortality' THEN 'balık ölümü'
    WHEN 'odor-or-color' THEN 'renk/koku değişimi'
    WHEN 'waste' THEN 'evsel atık'
    ELSE 'evsel atık'
  END
  WHERE id = ? AND tracking_code IS NULL
`);
for (const report of reportsMissingTrackingCode) {
  let trackingCode: string;
  do {
    const suffix = randomBytes(16).toString('hex').toUpperCase();
    trackingCode = `AG-${new Date().getFullYear()}-${suffix}`;
  } while (database.prepare('SELECT 1 FROM reports WHERE tracking_code = ?').get(trackingCode));
  backfillIncident.run(trackingCode, report.id);
}
database.exec('CREATE UNIQUE INDEX IF NOT EXISTS reports_tracking_code_idx ON reports(tracking_code)');

const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
if (adminEmail || adminPassword) {
  if (!adminEmail || !adminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL ve SUPER_ADMIN_PASSWORD birlikte tanımlanmalıdır.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminPassword.length < 12) {
    throw new Error('Süper yönetici e-postası geçerli olmalı ve şifresi en az 12 karakter olmalıdır.');
  }
  const adminName = process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin';
  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  database.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, account_status, created_at)
    VALUES ('super-admin-env', ?, ?, ?, 'super_admin', 'active', ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = 'super_admin',
      account_status = 'active',
      requested_role = NULL
  `).run(adminName, adminEmail, passwordHash, new Date().toISOString());
}

export default database;
