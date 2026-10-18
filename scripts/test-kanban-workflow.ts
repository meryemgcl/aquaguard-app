import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function run(): Promise<void> {
  const databasePath = path.join(os.tmpdir(), `aquaguard-workflow-${process.pid}.db`);
  process.env.AQUAGUARD_DB_PATH = databasePath;
  process.env.AQUAGUARD_UPLOAD_DIR = path.join(os.tmpdir(), `aquaguard-workflow-uploads-${process.pid}`);
  process.env.JWT_SECRET = 'workflow-test-secret-that-is-long-enough-123456';

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
    const { applyFieldInspection } = await import('@/lib/kanban');
    const { applyFieldSyncResults } = await import('@/lib/offline-sync');
    const { fieldInspectionSchema } = await import('@/lib/field-inspection');
    const { createToken } = await import('@/lib/auth');
    const { NextRequest } = await import('next/server');
    const { POST: syncPost } = await import('@/app/api/saha/sync/route');

    const createIncident = (description: string, privacyLevel: 'acik' | 'anonim' = 'acik') => addCard({
      ...incidentSubmissionSchema.parse({
        privacyLevel,
        ...(privacyLevel === 'anonim' ? {} : {
          reporterName: 'Test citizen',
          contact: 'citizen@example.test',
        }),
        category: 'endüstriyel atık',
        description,
        addressText: 'Test nehri, kuzey kıyısı',
        province: 'İzmir',
        district: 'Foça',
        coordinates: { lat: 39, lng: 32 },
        photos: ['data:image/png;base64,iVBORw0KGgo='],
      }),
      creatorEmail: privacyLevel === 'anonim' ? null : 'citizen@example.test',
      submittedBy: privacyLevel === 'anonim' ? 'Anonim Vatandaş' : 'Test citizen',
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
    assert.match(forwarded.photos[0], /^\/api\/media\/inc-/);
    const storedReport = database.prepare(`
      SELECT media_metadata_json FROM reports WHERE id = ?
    `).get(forwarded.id) as { media_metadata_json: string } | undefined;
    assert.ok(storedReport);
    assert.equal(JSON.parse(storedReport.media_metadata_json).length, 1);
    assert.ok(!(database.prepare('PRAGMA table_info(reports)').all() as { name: string }[])
      .some(column => column.name === 'photos_json'), 'new databases do not create the legacy base64 column');

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

    const anonymous = createIncident('Kıyıdaki su yüzeyinde yağ tabakası görüldü.', 'anonim');
    const anonymousStorage = database.prepare(`
      SELECT privacy_level, reporter_name, reporter_email, reporter_phone,
        reporter_contact_encrypted, creator_email
      FROM reports WHERE id = ?
    `).get(anonymous.id) as {
      privacy_level: string;
      reporter_name: string;
      reporter_email: string | null;
      reporter_phone: string | null;
      reporter_contact_encrypted: string | null;
      creator_email: string;
    };
    assert.equal(anonymousStorage.privacy_level, 'anonim');
    assert.equal(anonymousStorage.reporter_name, 'Gizli İhbarcı');
    assert.equal(anonymousStorage.reporter_email, null);
    assert.equal(anonymousStorage.reporter_phone, null);
    assert.equal(anonymousStorage.reporter_contact_encrypted, null);
    assert.equal(anonymousStorage.creator_email, '');
    assert.equal(anonymous.creatorEmail, '');
    assert.equal(anonymous.auditTrail[0].user, 'Anonim Vatandaş');
    assert.equal(anonymous.auditTrail[0].role, 'halk');
    assert.equal(anonymous.auditTrail[0].user, 'Anonim Vatandaş');

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

    const fieldPayload = (incidentId: string, baseVersion: number, clientMutationId: string, overrides = {}) => ({
      clientMutationId,
      incidentId,
      baseVersion,
      verdict: 'confirmed' as const,
      notes: 'Sahada gözle görülür kirlilik ve yüzey tabakası tespit edildi.',
      measurements: { ph: 6.4, dissolvedO2: 4.2 },
      fieldPhotos: [],
      timestamp: new Date().toISOString(),
      ...overrides,
    });
    const fieldActor = { name: 'Test expert', role: 'uzman' as const };
    const syncSuccessIncident = createIncident('Saha sync başarılı kayıt için test bildirimi.');
    const successfulMutation = fieldPayload(syncSuccessIncident.id, syncSuccessIncident.version, crypto.randomUUID(), {
      fieldPhotos: ['data:image/png;base64,iVBORw0KGgo='],
    });
    assert.equal(fieldInspectionSchema.safeParse(successfulMutation).success, true);
    assert.equal(fieldInspectionSchema.safeParse({
      ...successfulMutation,
      measurements: { ph: 15 },
    }).success, false, 'payload validation rejects out-of-range field measurements');
    const successfulSync = applyFieldInspection(successfulMutation, fieldActor);
    assert.equal(successfulSync.status, 'SUCCESS');
    assert.equal(getCardById(syncSuccessIncident.id)?.version, syncSuccessIncident.version + 1);
    const syncedMedia = database.prepare(
      'SELECT media_metadata_json FROM reports WHERE id = ?',
    ).get(syncSuccessIncident.id) as { media_metadata_json: string };
    assert.equal(JSON.parse(syncedMedia.media_metadata_json).length, 2, 'field photos are persisted as local media metadata');
    assert.equal(applyFieldInspection(successfulMutation, fieldActor).status, 'ALREADY_PROCESSED');
    assert.equal(applyFieldInspection({
      ...successfulMutation,
      notes: `${successfulMutation.notes} changed`,
    }, fieldActor).status, 'REJECTED', 'a mutation ID cannot be reused for a different payload');
    const mutationCount = database.prepare(
      'SELECT COUNT(*) AS count FROM sync_mutations WHERE client_mutation_id = ?',
    ).get(successfulMutation.clientMutationId) as { count: number };
    assert.equal(mutationCount.count, 1);

    const mismatchIncident = createIncident('Uzman incelemesi sürerken sürüm uyuşmazlığı testi.');
    startExpertReview(mismatchIncident.id, fieldActor);
    const mismatchPayload = fieldPayload(mismatchIncident.id, mismatchIncident.version, crypto.randomUUID());
    const mismatch = applyFieldInspection(mismatchPayload, fieldActor);
    assert.equal(mismatch.status, 'CONFLICT');
    assert.equal(mismatch.serverIncident?.version, mismatchIncident.version + 1);
    const forceResolved = applyFieldInspection(
      fieldPayload(mismatchIncident.id, mismatch.serverIncident!.version, crypto.randomUUID(), {
        resolution: 'FORCE_OVERWRITE',
      }),
      fieldActor,
    );
    assert.equal(forceResolved.status, 'SUCCESS');
    assert.equal(getCardById(mismatchIncident.id)?.auditTrail.at(-1)?.resolution, 'FORCE_OVERWRITE');

    const managerClosedIncident = createIncident('Yönetici kararı sonrası çakışma denetimi.');
    const reviewing = startExpertReview(managerClosedIncident.id, fieldActor);
    assert.ok(reviewing);
    const forwardedForClosure = updateExpertReview(managerClosedIncident.id, {
      action: 'forward',
      riskScore: 60,
      riskLevel: 'high',
      acceptedAiSuggestion: false,
      measurements: {},
      note: 'Yönetici kararı için saha değerlendirmesi tamamlandı.',
    }, fieldActor);
    assert.ok(forwardedForClosure);
    const managerRejected = recordApproval(managerClosedIncident.id, 'onay-yonetici', {
      action: 'rejected',
      role: 'yonetici',
      actorName: 'Test manager',
      actorInitials: 'TM',
      actorColor: '#123456',
      reason: 'İhbar kapatıldı ve saha müdahalesi tamamlandı.',
      columnFrom: 'onay-yonetici',
      columnTo: 'reddedildi',
      resolution: 'kapatildi',
    });
    assert.ok(managerRejected);
    const terminalConflict = applyFieldInspection(
      fieldPayload(managerClosedIncident.id, reviewing.version, crypto.randomUUID()),
      fieldActor,
    );
    assert.equal(terminalConflict.status, 'CONFLICT');
    assert.equal(terminalConflict.serverIncident?.status, 'kapatildi');
    const refusedForce = applyFieldInspection(
      fieldPayload(managerClosedIncident.id, managerRejected.version, crypto.randomUUID(), {
        resolution: 'FORCE_OVERWRITE',
      }),
      fieldActor,
    );
    assert.equal(refusedForce.status, 'CONFLICT', 'force overwrite cannot change a terminal manager decision');
    const discarded = applyFieldInspection(
      fieldPayload(managerClosedIncident.id, managerRejected.version, crypto.randomUUID(), {
        resolution: 'DISCARDED',
      }),
      fieldActor,
    );
    assert.equal(discarded.status, 'SUCCESS');
    const conflictAudit = getCardById(managerClosedIncident.id)?.auditTrail.at(-1);
    assert.equal(conflictAudit?.action, 'CATISMA_COZULDU');
    assert.equal(conflictAudit?.resolution, 'DISCARDED');

    const queueTemplate = {
      queueId: successfulMutation.clientMutationId,
      ...successfulMutation,
      syncStatus: 'Senkronizasyon Bekliyor' as const,
    };
    const retainedQueue = applyFieldSyncResults([
      queueTemplate,
      {
        ...mismatchPayload,
        queueId: mismatchPayload.clientMutationId,
        syncStatus: 'Senkronizasyon Bekliyor' as const,
      },
    ], [
      { ...successfulSync, status: 'SUCCESS' },
      mismatch,
    ]);
    assert.equal(retainedQueue.length, 1, 'successful acknowledged items are removed from the local queue');
    assert.equal(retainedQueue[0]?.syncStatus, 'Çakışma İncelemesi Gerekli');

    const apiSuccessIncident = createIncident('API toplu senkronizasyon başarılı kayıt testi.');
    const apiConflictIncident = createIncident('API toplu senkronizasyon çakışma testi.');
    startExpertReview(apiConflictIncident.id, fieldActor);
    const apiSuccessItem = fieldPayload(apiSuccessIncident.id, apiSuccessIncident.version, crypto.randomUUID());
    const apiConflictItem = fieldPayload(apiConflictIncident.id, apiConflictIncident.version, crypto.randomUUID());
    const staffId = crypto.randomUUID();
    const staffEmail = `sync-${staffId}@example.test`;
    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, account_status, created_at, two_factor_enabled)
      VALUES (?, ?, ?, ?, 'uzman', 'active', ?, 0)
    `).run(staffId, 'Sync Expert', staffEmail, 'test-hash', new Date().toISOString());
    const staffToken = await createToken({
      userId: staffId,
      email: staffEmail,
      role: 'uzman',
      name: 'Sync Expert',
    });
    const postSyncBatch = async () => syncPost(new NextRequest('http://localhost/api/saha/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${staffToken}`,
      },
      body: JSON.stringify({ items: [apiSuccessItem, apiConflictItem] }),
    }));
    const apiBatchResponse = await postSyncBatch();
    assert.equal(apiBatchResponse.status, 200);
    const apiBatchBody = await apiBatchResponse.json() as {
      results: Array<{ clientMutationId: string; status: string }>;
    };
    assert.deepEqual(apiBatchBody.results.map(result => result.status), ['SUCCESS', 'CONFLICT']);
    assert.equal(getCardById(apiSuccessIncident.id)?.version, apiSuccessIncident.version + 1);
    assert.equal(getCardById(apiConflictIncident.id)?.version, apiConflictIncident.version + 1);
    const replayResponse = await postSyncBatch();
    const replayBody = await replayResponse.json() as {
      results: Array<{ status: string }>;
    };
    assert.deepEqual(replayBody.results.map(result => result.status), ['ALREADY_PROCESSED', 'CONFLICT']);

    assert.throws(() => database.prepare(
      'UPDATE report_status_events SET note = ? WHERE report_id = ?',
    ).run('tampered', forwarded.id), /immutable/);
    assert.throws(() => database.prepare(
      'DELETE FROM report_status_events WHERE report_id = ?',
    ).run(forwarded.id), /immutable/);
  } finally {
    closeDatabase?.();
    fs.rmSync(process.env.AQUAGUARD_UPLOAD_DIR!, { recursive: true, force: true });
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
