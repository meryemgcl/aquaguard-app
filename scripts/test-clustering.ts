import assert from 'node:assert/strict';
import {
  detectIncidentClusters,
  haversineDistanceMeters,
  type IncidentClusterMember,
} from '../lib/clustering';

const start = Date.parse('2026-05-01T00:00:00.000Z');

function incident(
  id: string,
  options: Partial<IncidentClusterMember> = {},
): IncidentClusterMember {
  return {
    id,
    trackingCode: `AG-2026-${id}`,
    title: `Test ${id}`,
    category: 'endüstriyel atık',
    location: 'Test konumu',
    province: 'İzmir',
    district: 'Aliağa',
    coordinates: { lat: 38.9, lng: 26.9 },
    reportedAt: new Date(start + Number(id) * 60 * 60 * 1000).toISOString(),
    riskLevel: 'low',
    riskAssessed: false,
    ...options,
  };
}

function cluster(...members: IncidentClusterMember[]) {
  return detectIncidentClusters(members);
}

const three = [incident('1'), incident('2'), incident('3')];
const basic = cluster(...three);
assert.equal(basic.length, 1, 'three correlated reports should create one active cluster');
assert.equal(basic[0].risk, 'high', 'a 3-report cluster should be high risk');
assert.equal(basic[0].incidentCount, 3);
assert.deepEqual(cluster(...three).map(item => item.id), cluster(...[...three].reverse()).map(item => item.id),
  'output should be deterministic regardless of input order');

assert.equal(cluster(incident('1'), incident('2')).length, 0, 'two reports must not trigger an anomaly');
assert.equal(cluster(
  incident('1'),
  incident('2'),
  incident('3', { category: 'evsel atık' }),
).length, 0, 'different categories should not correlate');

const five = [1, 2, 3, 4, 5].map(id => incident(String(id)));
assert.equal(cluster(...five)[0].risk, 'critical', 'five reports should trigger a critical basin alarm');
assert.equal(cluster(...five.slice(0, 4))[0].risk, 'high', 'four reports should remain high risk');
const confirmedCritical = [incident('1', {
  riskLevel: 'critical',
  riskAssessed: true,
}), incident('2'), incident('3')];
assert.equal(cluster(...confirmedCritical)[0].risk, 'critical',
  'one expert-confirmed critical incident should elevate a cluster');
const unconfirmedCritical = [incident('1', {
  riskLevel: 'critical',
  riskAssessed: false,
}), incident('2'), incident('3')];
assert.equal(cluster(...unconfirmedCritical)[0].risk, 'high',
  'unconfirmed critical risk must not elevate a cluster');

assert.equal(cluster(
  incident('1', { reportedAt: new Date(start).toISOString() }),
  incident('2', { reportedAt: new Date(start + 24 * 60 * 60 * 1000).toISOString() }),
  incident('3', { reportedAt: new Date(start + 48 * 60 * 60 * 1000).toISOString() }),
).length, 1, 'reports exactly 48 hours apart should be included');
assert.equal(cluster(
  incident('1', { reportedAt: new Date(start).toISOString() }),
  incident('2', { reportedAt: new Date(start + 24 * 60 * 60 * 1000).toISOString() }),
  incident('3', { reportedAt: new Date(start + 48 * 60 * 60 * 1000 + 1).toISOString() }),
).length, 0, 'a cluster spanning more than 48 hours should be excluded');

const fifteenKmLongitude = 15_000 / 6_371_000 * 180 / Math.PI;
assert.ok(haversineDistanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: fifteenKmLongitude }) <= 15_000);
assert.equal(cluster(
  incident('1', { coordinates: { lat: 0, lng: 0 } }),
  incident('2', { coordinates: { lat: 0, lng: 0.1 } }),
  incident('3', { coordinates: { lat: 0, lng: 0.2 } }),
).length, 0, 'complete-link clustering must reject chaining beyond the 15 km boundary');
assert.equal(cluster(
  incident('1', { coordinates: { lat: 0, lng: 0 } }),
  incident('2', { coordinates: { lat: 0, lng: fifteenKmLongitude } }),
  incident('3', { coordinates: { lat: 0, lng: 0 } }),
).length, 1, 'reports on the 15 km spatial boundary should be included');

assert.equal(cluster(
  incident('1', { coordinates: { lat: 91, lng: 0 } }),
  incident('2'),
  incident('3'),
).length, 0, 'invalid coordinates must not participate in clustering');
assert.throws(() => detectIncidentClusters([], { minimumIncidents: 1 }), RangeError);
assert.throws(() => detectIncidentClusters([], { spatialThresholdMeters: 0 }), RangeError);

console.log('Clustering algorithm tests passed.');
