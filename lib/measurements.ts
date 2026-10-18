import { randomUUID } from 'node:crypto';
import database from '@/lib/local-db';

export type MeasurementSource = 'manual' | 'sensor' | 'laboratory';
export type MeasurementQuality = 'valid' | 'suspect' | 'invalid';
export type CalibrationStatus = 'current' | 'due' | 'unknown' | 'not_applicable';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type ThresholdComparator = 'above' | 'below';

export interface Measurement {
  id: string;
  stationId: string;
  stationName?: string;
  parameter: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: MeasurementSource;
  sourceRecordId: string;
  qualityFlag: MeasurementQuality;
  calibrationStatus: CalibrationStatus;
  recordedBy: string;
  createdAt: string;
}

export interface MeasurementThreshold {
  id: string;
  parameter: string;
  unit: string;
  comparator: ThresholdComparator;
  thresholdValue: number;
  hysteresis: number;
  severity: AlertSeverity;
  consecutiveCount: number;
  activeFrom: string;
  activeUntil: string | null;
  createdBy: string;
  createdAt: string;
}

export interface StationAlert {
  id: string;
  stationId: string;
  stationName: string;
  thresholdId: string;
  parameter: string;
  comparator: ThresholdComparator;
  thresholdValue: number;
  unit: string;
  severity: AlertSeverity;
  status: AlertStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  lastValue: number;
  measurementCount: number;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

interface MeasurementRow {
  id: string;
  station_id: string;
  station_name?: string;
  parameter: string;
  value: number;
  unit: string;
  measured_at: string;
  source: MeasurementSource;
  source_record_id: string;
  quality_flag: MeasurementQuality;
  calibration_status: CalibrationStatus;
  recorded_by: string;
  created_at: string;
}

interface ThresholdRow {
  id: string;
  parameter: string;
  unit: string;
  comparator: ThresholdComparator;
  threshold_value: number;
  hysteresis: number;
  severity: AlertSeverity;
  consecutive_count: number;
  active_from: string;
  active_until: string | null;
  created_by: string;
  created_at: string;
}

interface AlertRow {
  id: string;
  station_id: string;
  station_name: string;
  threshold_id: string;
  parameter: string;
  comparator: ThresholdComparator;
  threshold_value: number;
  unit: string;
  severity: AlertSeverity;
  status: AlertStatus;
  first_seen_at: string;
  last_seen_at: string;
  last_value: number;
  measurement_count: number;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

function mapMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    stationId: row.station_id,
    ...(row.station_name ? { stationName: row.station_name } : {}),
    parameter: row.parameter,
    value: row.value,
    unit: row.unit,
    measuredAt: row.measured_at,
    source: row.source,
    sourceRecordId: row.source_record_id,
    qualityFlag: row.quality_flag,
    calibrationStatus: row.calibration_status,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

function mapThreshold(row: ThresholdRow): MeasurementThreshold {
  return {
    id: row.id,
    parameter: row.parameter,
    unit: row.unit,
    comparator: row.comparator,
    thresholdValue: row.threshold_value,
    hysteresis: row.hysteresis,
    severity: row.severity,
    consecutiveCount: row.consecutive_count,
    activeFrom: row.active_from,
    activeUntil: row.active_until,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapAlert(row: AlertRow): StationAlert {
  return {
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    thresholdId: row.threshold_id,
    parameter: row.parameter,
    comparator: row.comparator,
    thresholdValue: row.threshold_value,
    unit: row.unit,
    severity: row.severity,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastValue: row.last_value,
    measurementCount: row.measurement_count,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
  };
}

function meetsTrigger(value: number, comparator: ThresholdComparator, threshold: number): boolean {
  return comparator === 'above' ? value > threshold : value < threshold;
}

function meetsRecovery(value: number, comparator: ThresholdComparator, threshold: number, hysteresis: number): boolean {
  return comparator === 'above' ? value <= threshold - hysteresis : value >= threshold + hysteresis;
}

function evaluateThreshold(stationId: string, threshold: MeasurementThreshold, measurement: Measurement): void {
  const recent = database.prepare(`
    SELECT value FROM measurements
    WHERE station_id = ? AND parameter = ? AND unit = ?
      AND quality_flag = 'valid'
      AND calibration_status IN ('current', 'not_applicable')
      AND measured_at <= ?
    ORDER BY measured_at DESC, created_at DESC
    LIMIT ?
  `).all(
    stationId,
    threshold.parameter,
    threshold.unit,
    measurement.measuredAt,
    threshold.consecutiveCount,
  ) as { value: number }[];

  if (recent.length < threshold.consecutiveCount) return;
  const currentAlert = database.prepare(`
    SELECT id FROM station_alerts
    WHERE station_id = ? AND threshold_id = ? AND status IN ('open', 'acknowledged')
  `).get(stationId, threshold.id) as { id: string } | undefined;

  if (recent.every(({ value }) => meetsTrigger(value, threshold.comparator, threshold.thresholdValue))) {
    if (currentAlert) {
      database.prepare(`
        UPDATE station_alerts
        SET last_seen_at = ?, last_value = ?, measurement_count = measurement_count + 1
        WHERE id = ?
      `).run(measurement.measuredAt, measurement.value, currentAlert.id);
    } else {
      database.prepare(`
        INSERT INTO station_alerts (
          id, station_id, threshold_id, parameter, severity, status,
          first_seen_at, last_seen_at, last_value, measurement_count
        ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
      `).run(
        randomUUID(), stationId, threshold.id, threshold.parameter, threshold.severity,
        measurement.measuredAt, measurement.measuredAt, measurement.value, threshold.consecutiveCount,
      );
    }
    return;
  }

  if (
    currentAlert &&
    recent.every(({ value }) => meetsRecovery(
      value,
      threshold.comparator,
      threshold.thresholdValue,
      threshold.hysteresis,
    ))
  ) {
    database.prepare(`
      UPDATE station_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?
    `).run(measurement.measuredAt, currentAlert.id);
  }
}

export function createMeasurement(input: {
  stationId: string;
  parameter: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: MeasurementSource;
  sourceRecordId: string;
  qualityFlag: MeasurementQuality;
  calibrationStatus: CalibrationStatus;
  recordedBy: string;
}): { measurement: Measurement; created: boolean } {
  const insert = database.transaction(() => {
    const existing = database.prepare(`
      SELECT * FROM measurements WHERE station_id = ? AND source = ? AND source_record_id = ?
    `).get(input.stationId, input.source, input.sourceRecordId) as MeasurementRow | undefined;
    if (existing) return { measurement: mapMeasurement(existing), created: false };

    const station = database.prepare('SELECT id FROM stations WHERE id = ?').get(input.stationId);
    if (!station) throw new Error('station_not_found');

    const latest = database.prepare(`
      SELECT MAX(measured_at) AS measured_at FROM measurements
      WHERE station_id = ? AND parameter = ?
    `).get(input.stationId, input.parameter) as { measured_at: string | null };
    const isLatest = latest.measured_at === null || input.measuredAt >= latest.measured_at;
    const now = new Date().toISOString();
    const id = randomUUID();
    database.prepare(`
      INSERT INTO measurements (
        id, station_id, parameter, value, unit, measured_at, source, source_record_id,
        quality_flag, calibration_status, recorded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.stationId,
      input.parameter,
      input.value,
      input.unit,
      input.measuredAt,
      input.source,
      input.sourceRecordId,
      input.qualityFlag,
      input.calibrationStatus,
      input.recordedBy,
      now,
    );

    const row = database.prepare('SELECT * FROM measurements WHERE id = ?').get(id) as MeasurementRow;
    const measurement = mapMeasurement(row);
    if (isLatest && measurement.qualityFlag === 'valid' &&
      (measurement.calibrationStatus === 'current' || measurement.calibrationStatus === 'not_applicable')) {
      const thresholds = database.prepare(`
        SELECT * FROM measurement_thresholds
        WHERE parameter = ? AND unit = ? AND active_from <= ?
          AND (active_until IS NULL OR active_until > ?)
      `).all(input.parameter, input.unit, input.measuredAt, input.measuredAt) as ThresholdRow[];
      for (const thresholdRow of thresholds) {
        evaluateThreshold(input.stationId, mapThreshold(thresholdRow), measurement);
      }
    }
    return { measurement, created: true };
  });

  return insert();
}

export function listMeasurements(filters: {
  stationId?: string;
  parameter?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Measurement[] {
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (filters.stationId) {
    clauses.push('m.station_id = ?');
    values.push(filters.stationId);
  }
  if (filters.parameter) {
    clauses.push('m.parameter = ?');
    values.push(filters.parameter);
  }
  if (filters.from) {
    clauses.push('m.measured_at >= ?');
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push('m.measured_at <= ?');
    values.push(filters.to);
  }
  values.push(filters.limit ?? 500);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = database.prepare(`
    SELECT m.*, s.name AS station_name
    FROM measurements m JOIN stations s ON s.id = m.station_id ${where}
    ORDER BY m.measured_at DESC, m.created_at DESC LIMIT ?
  `).all(...values) as MeasurementRow[];
  return rows.map(mapMeasurement);
}

export function createThreshold(input: Omit<MeasurementThreshold, 'id' | 'createdAt'>): MeasurementThreshold {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO measurement_thresholds (
      id, parameter, unit, comparator, threshold_value, hysteresis, severity,
      consecutive_count, active_from, active_until, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.parameter,
    input.unit,
    input.comparator,
    input.thresholdValue,
    input.hysteresis,
    input.severity,
    input.consecutiveCount,
    input.activeFrom,
    input.activeUntil,
    input.createdBy,
    createdAt,
  );
  return { ...input, id, createdAt };
}

export function listThresholds(): MeasurementThreshold[] {
  const rows = database.prepare(`
    SELECT * FROM measurement_thresholds ORDER BY parameter, active_from DESC
  `).all() as ThresholdRow[];
  return rows.map(mapThreshold);
}

export function listStationAlerts(status?: AlertStatus): StationAlert[] {
  const rows = database.prepare(`
    SELECT a.*, s.name AS station_name, t.comparator, t.threshold_value, t.unit
    FROM station_alerts a
    JOIN stations s ON s.id = a.station_id
    JOIN measurement_thresholds t ON t.id = a.threshold_id
    ${status ? 'WHERE a.status = ?' : ''}
    ORDER BY CASE a.severity
      WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      a.last_seen_at DESC
    LIMIT 500
  `).all(...(status ? [status] : [])) as AlertRow[];
  return rows.map(mapAlert);
}

export function acknowledgeStationAlert(alertId: string, actor: string): StationAlert | null {
  const result = database.prepare(`
    UPDATE station_alerts
    SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ?
    WHERE id = ? AND status = 'open'
  `).run(actor, new Date().toISOString(), alertId);
  if (result.changes === 0) return null;
  const row = database.prepare(`
    SELECT a.*, s.name AS station_name, t.comparator, t.threshold_value, t.unit
    FROM station_alerts a
    JOIN stations s ON s.id = a.station_id
    JOIN measurement_thresholds t ON t.id = a.threshold_id
    WHERE a.id = ?
  `).get(alertId) as AlertRow | undefined;
  return row ? mapAlert(row) : null;
}
