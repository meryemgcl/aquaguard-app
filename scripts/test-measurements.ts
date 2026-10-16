import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Module } from 'node:module';
import os from 'node:os';
import path from 'node:path';

async function run(): Promise<void> {
  const databasePath = path.join(os.tmpdir(), `aquaguard-measurements-${process.pid}.db`);
  process.env.AQUAGUARD_DB_PATH = databasePath;
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string): unknown {
    return id === 'server-only' ? {} : originalRequire.call(this, id);
  };

  let closeDatabase: (() => void) | undefined;
  try {
    const { default: database } = await import('@/lib/local-db');
    closeDatabase = () => database.close();
    const { createStation } = await import('@/lib/stations');
    const {
      acknowledgeStationAlert,
      createMeasurement,
      createThreshold,
      listStationAlerts,
    } = await import('@/lib/measurements');

    const station = createStation({
      name: 'Measurement test station',
      location: 'Test location',
      latitude: 39,
      longitude: 32,
    });
    createThreshold({
      parameter: 'ph',
      unit: 'pH',
      comparator: 'above',
      thresholdValue: 8.5,
      hysteresis: 0.2,
      severity: 'high',
      consecutiveCount: 2,
      activeFrom: '2026-01-01T00:00:00.000Z',
      activeUntil: null,
      createdBy: 'test',
    });

    const addMeasurement = (sourceRecordId: string, value: number, measuredAt: string) =>
      createMeasurement({
        stationId: station.id,
        parameter: 'ph',
        value,
        unit: 'pH',
        measuredAt,
        source: 'sensor',
        sourceRecordId,
        qualityFlag: 'valid',
        calibrationStatus: 'current',
        recordedBy: 'test',
      });

    assert.equal(addMeasurement('reading-1', 8.7, '2026-09-28T10:00:00.000Z').created, true);
    assert.equal(addMeasurement('reading-1', 8.7, '2026-09-28T10:00:00.000Z').created, false);
    assert.equal(listStationAlerts('open').length, 0, 'single reading must not bypass debounce');

    addMeasurement('reading-2', 8.8, '2026-09-28T10:01:00.000Z');
    assert.equal(listStationAlerts('open').length, 1);
    const alert = listStationAlerts('open')[0];
    assert.equal(alert.measurementCount, 2, 'the alert count includes debounce samples');
    assert.ok(acknowledgeStationAlert(alert.id, 'reviewer'));

    addMeasurement('reading-3', 8.2, '2026-09-28T10:02:00.000Z');
    assert.equal(listStationAlerts('acknowledged').length, 1, 'one safe reading must not clear the alert');
    addMeasurement('reading-4', 8.2, '2026-09-28T10:03:00.000Z');
    assert.equal(listStationAlerts('resolved').length, 1, 'hysteresis and consecutive readings must resolve the alert');
  } finally {
    closeDatabase?.();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(`${databasePath}${suffix}`);
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      }
    }
  }
}

void run().then(() => {
  console.log('Measurement idempotency, debounce, acknowledgement, and hysteresis checks passed.');
});
