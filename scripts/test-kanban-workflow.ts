import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Module } from 'node:module';
import os from 'node:os';
import path from 'node:path';

async function run(): Promise<void> {
  const databasePath = path.join(os.tmpdir(), `aquaguard-workflow-${process.pid}.db`);
  process.env.AQUAGUARD_DB_PATH = databasePath;
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string): unknown {
    return id === 'server-only' ? {} : originalRequire.call(this, id);
  };

  let closeDatabase: (() => void) | undefined;
  try {
    const { default: database } = await import('@/lib/local-db');
    closeDatabase = () => database.close();
    const { incidentSubmissionSchema } = await import('@/lib/incident-validation');
    const { getPublicIncidentTracking } = await import('@/lib/incidents');
    const { addCard, getCardById, recordApproval, startExpertReview, updateExpertReview } =
      await import('@/lib/kanban');
    const { isCriticalSlaBreached } = await import('@/lib/kanban-types');
    const { filterIncidentMapMarkers, toIncidentMapMarker } = await import('@/lib/incident-map');
    const { getDashboardData } = await import('@/lib/dashboard');
    const { riskScoreToColor } = await import('@/lib/risk-colors');

    const createIncident = (description: string) => addCard({
      ...incidentSubmissionSchema.parse({
        category: 'endüstriyel atık',
        description,
        addressText: 'Test nehri, kuzey kıyısı',
        province: 'İzmir',
        district: 'Foça',
        contact: 'citizen@example.test',
        coordinates: { lat: 39, lng: 32 },
        photos: ['data:image/png;base64,aGVsbG8='],
      }),
      creatorEmail: 'citizen@example.test',
      submittedBy: 'Test citizen',
      role: 'halk',
    });

    const forwarded = createIncident('Nehir yüzeyinde yoğun renk değişimi görüldü.');
    assert.equal(forwarded.column, 'yeni');
    assert.equal(forwarded.auditTrail.length, 1);
    assert.equal(startExpertReview(forwarded.id, { name: 'Test expert', role: 'uzman' })?.column, 'onay-uzman');
    assert.equal(updateExpertReview(forwarded.id, {
      action: 'save',
      riskScore: 85,
      riskLevel: 'critical',
      acceptedAiSuggestion: false,
      measurements: { ph: 6.8, turbidity: 22 },
      note: 'Saha incelemesi gerekli.',
    }, { name: 'Test expert', role: 'uzman' })?.measurements?.ph, 6.8);
    assert.equal(updateExpertReview(forwarded.id, {
      action: 'forward',
      riskScore: 85,
      riskLevel: 'critical',
      acceptedAiSuggestion: false,
      measurements: { ph: 6.8, turbidity: 22 },
      note: 'Yönetici değerlendirmesine iletildi.',
    }, { name: 'Test expert', role: 'uzman' })?.column, 'onay-yonetici');

    assert.equal(recordApproval(forwarded.id, 'onay-yonetici', {
      action: 'approved',
      role: 'yonetici',
      actorName: 'Test manager',
      actorInitials: 'TM',
      actorColor: '#123456',
      columnFrom: 'onay-yonetici',
      columnTo: 'yayinlandi',
    })?.column, 'yayinlandi');
    const published = getCardById(forwarded.id);
    assert.equal(published?.auditTrail.length, 5);
    assert.equal(published?.auditTrail.at(-1)?.newStatus, 'yayinda');
    assert.equal(getPublicIncidentTracking(forwarded.trackingCode)?.status, 'yayinda');

    const invalid = createIncident('Bu kayıt farklı bir yerden alınmış görünüyor.');
    startExpertReview(invalid.id, { name: 'Test expert', role: 'uzman' });
    assert.equal(updateExpertReview(invalid.id, {
      action: 'invalid',
      riskScore: 20,
      riskLevel: 'low',
      acceptedAiSuggestion: false,
      measurements: {},
      note: 'Fotoğraf ve konum birbiriyle uyuşmuyor.',
    }, { name: 'Test expert', role: 'uzman' })?.resolution, 'gecersiz_ihbar');
    assert.equal(getPublicIncidentTracking(invalid.trackingCode)?.status, 'gecersiz_ihbar');

    const closed = createIncident('Kıyı yakınında atık birikimi bildirildi.');
    startExpertReview(closed.id, { name: 'Test expert', role: 'uzman' });
    updateExpertReview(closed.id, {
      action: 'forward',
      riskScore: 40,
      riskLevel: 'medium',
      acceptedAiSuggestion: false,
      measurements: {},
      note: 'İlk değerlendirme tamamlandı.',
    }, { name: 'Test expert', role: 'uzman' });
    assert.equal(recordApproval(closed.id, 'onay-yonetici', {
      action: 'rejected',
      role: 'yonetici',
      actorName: 'Test manager',
      actorInitials: 'TM',
      actorColor: '#123456',
      reason: 'Müdahale tamamlandı.',
      columnFrom: 'onay-yonetici',
      columnTo: 'reddedildi',
      resolution: 'kapatildi',
    })?.resolution, 'kapatildi');
    assert.equal(getPublicIncidentTracking(closed.trackingCode)?.officialNote, 'Müdahale tamamlandı.');
    const pendingCritical = createIncident('İmalathane çıkışında koyu renkli atık su akışı görülüyor.');
    startExpertReview(pendingCritical.id, { name: 'Test expert', role: 'uzman' });
    updateExpertReview(pendingCritical.id, {
      action: 'save',
      riskScore: 92,
      riskLevel: 'critical',
      acceptedAiSuggestion: false,
      measurements: {},
      note: 'Acil saha müdahalesi gerekiyor.',
    }, { name: 'Test expert', role: 'uzman' });
    assert.equal(new Set([forwarded.trackingCode, invalid.trackingCode, closed.trackingCode]).size, 3);
    assert.ok((database.prepare('PRAGMA index_list(reports)').all() as { name: string; unique: number }[])
      .some(index => index.name === 'reports_tracking_code_unique_idx' && index.unique === 1));

    const staffDashboard = getDashboardData();
    assert.equal(staffDashboard.stats.totalReports, 4);
    assert.equal(staffDashboard.stats.criticalPending, 1);
    assert.ok(staffDashboard.stats.averageResponseHours !== null && staffDashboard.stats.averageResponseHours < 1);
    assert.equal(staffDashboard.categoryDistribution.find(item => item.category === 'endüstriyel atık')?.count, 4);
    assert.deepEqual(staffDashboard.regionData, [{ province: 'İzmir', district: 'Foça', count: 4 }]);
    assert.equal(forwarded.province, 'İzmir');
    assert.equal(filterIncidentMapMarkers(staffDashboard.markers, {
      category: 'endüstriyel atık',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      publishedOnly: true,
    }).length, 1);
    assert.equal(filterIncidentMapMarkers(staffDashboard.markers, {
      category: 'balık ölümü',
      dateFrom: '',
      dateTo: '',
      publishedOnly: false,
    }).length, 0);
    assert.deepEqual([
      riskScoreToColor(15).riskColor,
      riskScoreToColor(45).riskColor,
      riskScoreToColor(90).riskColor,
    ], ['#2f80ed', '#f2c94c', '#eb5757']);
    assert.equal(toIncidentMapMarker({
      ...pendingCritical,
      riskLevel: 'medium',
      riskScore: 95,
      riskAssessed: true,
    })?.riskColor, '#f2c94c', 'map pin color follows the verified risk level');
    assert.equal(getDashboardData(false).stats.totalReports, 1, 'citizen aggregates only include published incidents');

    const now = Date.parse('2026-01-02T01:00:00.000Z');
    const criticalCard = {
      column: 'yeni',
      createdAt: '2026-01-01T00:00:00.000Z',
      expertReviewedAt: null,
      aiRiskScore: 85,
      riskAssessed: false,
      riskLevel: 'low',
    } as const;
    assert.equal(isCriticalSlaBreached(criticalCard, now), true);
    assert.equal(isCriticalSlaBreached({ ...criticalCard, expertReviewedAt: now.toString() }, now), false);
    assert.equal(isCriticalSlaBreached({ ...criticalCard, column: 'onay-uzman' }, now), false);

    assert.throws(() => database.prepare(
      'UPDATE report_status_events SET note = ? WHERE report_id = ?',
    ).run('tampered', forwarded.id), /immutable/);
    assert.throws(() => database.prepare(
      'DELETE FROM report_status_events WHERE report_id = ?',
    ).run(forwarded.id), /immutable/);
  } finally {
    closeDatabase?.();
    Module.prototype.require = originalRequire;
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
  console.log('Incident workflow, public tracking, SLA, and immutable audit checks passed.');
});
