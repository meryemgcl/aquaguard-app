import assert from 'node:assert/strict';
import type { KanbanCard } from '../lib/kanban-types';
import {
  getExportIncidents,
  isPubliclyVisibleIncident,
  toGeoJsonFeatureCollection,
  toIncidentCsv,
} from '../lib/open-data';

function card(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: 'report-1',
    title: 'Endüstriyel atık, "test"',
    description: 'Internal description should not export.',
    location: 'Kıyı',
    province: 'İzmir',
    district: 'Aliağa',
    coordinates: { lat: 38.8, lng: 26.9 },
    category: 'discharge',
    incidentCategory: 'endüstriyel atık',
    column: 'yayinlandi',
    riskScore: 90,
    riskLevel: 'critical',
    riskAssessed: true,
    aiRiskScore: 95,
    photos: ['data:image/jpeg;base64,Zm9v'],
    trackingCode: 'AG-2026-ABCDE',
    resolution: null,
    expertReviewedAt: '2026-05-01T01:00:00.000Z',
    expertNotes: 'Internal expert note.',
    managerNotes: 'Private manager note.',
    auditTrail: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T01:00:00.000Z',
    creatorEmail: 'private@example.test',
    assignee: { name: 'Internal staff', role: 'uzman', initials: 'IS', color: '#000' },
    tags: [],
    measurements: undefined,
    approvals: [],
    ...overrides,
  };
}

const published = card();
const resolved = card({
  id: 'report-2',
  trackingCode: 'AG-2026-RESOL',
  column: 'reddedildi',
  resolution: 'kapatildi',
});
const rejected = card({
  id: 'report-3',
  trackingCode: 'AG-2026-REJEC',
  column: 'reddedildi',
  resolution: 'reddedildi',
});
const pending = card({
  id: 'report-4',
  trackingCode: 'AG-2026-PENDG',
  column: 'yeni',
});

assert.equal(isPubliclyVisibleIncident(published), true);
assert.equal(isPubliclyVisibleIncident(resolved), true);
assert.equal(isPubliclyVisibleIncident(rejected), false);
assert.equal(isPubliclyVisibleIncident(pending), false);

const publicIncidents = getExportIncidents([published, resolved, rejected, pending], false);
assert.deepEqual(publicIncidents.map(item => item.status), ['yayinda', 'cozuldu']);
assert.equal(getExportIncidents([published, resolved, rejected, pending], true).length, 4);
const serializedPublicData = JSON.stringify(publicIncidents);
for (const privateField of ['reporterEmail', 'reporterPhone', 'managerNotes', 'creatorEmail', 'expertNotes']) {
  assert.equal(serializedPublicData.includes(privateField), false, `${privateField} must not appear in exports`);
}
assert.equal(serializedPublicData.includes('private@example.test'), false);
assert.equal(serializedPublicData.includes('Private manager note.'), false);

const featureCollection = toGeoJsonFeatureCollection(publicIncidents);
assert.equal(featureCollection.type, 'FeatureCollection');
assert.equal(featureCollection.features.length, 2);
assert.deepEqual(featureCollection.features[0].geometry, {
  type: 'Point',
  coordinates: [26.9, 38.8],
});
assert.deepEqual(Object.keys(featureCollection.features[0].properties).sort(), [
  'category', 'district', 'province', 'reportedAt', 'riskLevel', 'status', 'title', 'trackingCode',
].sort());
assert.equal(featureCollection.features[0].properties.riskLevel, 'Kritik');
assert.equal(toGeoJsonFeatureCollection([
  { ...publicIncidents[0], latitude: 95 },
]).features.length, 0, 'invalid coordinates must not be emitted');
assert.equal(toGeoJsonFeatureCollection([
  { ...publicIncidents[0], latitude: null, longitude: null },
]).features.length, 0, 'records without coordinates must not be emitted as features');

const csv = toIncidentCsv(publicIncidents);
assert.equal(csv.charCodeAt(0), 0xFEFF, 'CSV must start with UTF-8 BOM');
assert.ok(csv.includes('"Takip Kodu";"Başlık";"Kategori";"Risk Seviyesi";"İl";"İlçe";"Enlem";"Boylam";"Bildirim Tarihi";"Durum"'));
assert.ok(csv.includes('"Endüstriyel atık, ""test"""'), 'CSV fields must escape quotes and delimiters');
assert.ok(csv.includes('"İzmir";"Aliağa"'));
assert.ok(!csv.includes('private@example.test'));
assert.ok(!csv.includes('Private manager note.'));

console.log('Open data export structure, CSV encoding, status filters, and privacy tests passed.');
