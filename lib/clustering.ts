import type { KanbanCard } from './kanban-types';
import type { WaterIncidentCategory } from './types';

export const SPATIAL_THRESHOLD_METERS = 15_000;
export const TEMPORAL_THRESHOLD_MS = 48 * 60 * 60 * 1000;
export const MIN_CLUSTER_INCIDENTS = 3;

export interface IncidentClusterMember {
  id: string;
  trackingCode: string | null;
  title: string;
  category: WaterIncidentCategory;
  location: string;
  province: string | null;
  district: string | null;
  coordinates: { lat: number; lng: number };
  reportedAt: string;
  riskLevel: KanbanCard['riskLevel'];
  riskAssessed: boolean;
}

export interface IncidentCluster {
  id: string;
  category: WaterIncidentCategory;
  center: { lat: number; lng: number };
  radiusMeters: number;
  startedAt: string;
  latestAt: string;
  incidentCount: number;
  risk: 'high' | 'critical';
  label: 'Yüksek Riskli Kümelenme' | 'Kritik Havza Alarmı / Olası Kaynak Deşarjı';
  color: string;
  regionLabel: string;
  probableSource: string;
  recommendation: string;
  incidents: IncidentClusterMember[];
}

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) *
    Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
}

function isValidIncident(incident: IncidentClusterMember): boolean {
  const timestamp = Date.parse(incident.reportedAt);
  return Number.isFinite(timestamp) &&
    Number.isFinite(incident.coordinates.lat) &&
    Number.isFinite(incident.coordinates.lng) &&
    incident.coordinates.lat >= -90 && incident.coordinates.lat <= 90 &&
    incident.coordinates.lng >= -180 && incident.coordinates.lng <= 180;
}

function getRegionLabel(incidents: IncidentClusterMember[]): string {
  const locations = [...new Set(incidents.flatMap(incident =>
    incident.province ? [incident.district ? `${incident.district}, ${incident.province}` : incident.province] : [],
  ))].sort((a, b) => a.localeCompare(b, 'tr'));
  return locations.length ? locations.join(' · ') : 'Bölge bilgisi ihbarlarda belirtilmemiş';
}

function getSourceGuidance(category: WaterIncidentCategory): { source: string; recommendation: string } {
  switch (category) {
    case 'endüstriyel atık':
      return {
        source: 'Sanayi Bölgesi Deşarj Şüphesi',
        recommendation: 'Bu bölgedeki sanayi tesisleri ve atık su arıtma çıkışlarının denetlenmesi, saha ekibinin bölgeye sevk edilmesi önerilir.',
      };
    case 'evsel atık':
      return {
        source: 'Kentsel Atık Su / Kanalizasyon Kaynaklı Olay Şüphesi',
        recommendation: 'Yakın kanalizasyon hatları ve atık su terfi/arıtma noktalarının incelenmesi, saha ekibinin numune alması önerilir.',
      };
    case 'balık ölümü':
      return {
        source: 'Su Ekosistemi Üzerinde Yaygın Etki Şüphesi',
        recommendation: 'Balık ölümü görülen kesitte acil saha incelemesi yapılması, su ve canlı numunesi alınması önerilir.',
      };
    case 'renk/koku değişimi':
      return {
        source: 'Kimyasal / Koku Kaynaklı Deşarj Şüphesi',
        recommendation: 'Akıntı yönü boyunca olası deşarj noktalarının ve yakın tesislerin incelenmesi, saha ekibinin numune alması önerilir.',
      };
  }
}

function toCluster(incidents: IncidentClusterMember[]): IncidentCluster {
  const sorted = [...incidents].sort((a, b) =>
    Date.parse(a.reportedAt) - Date.parse(b.reportedAt) || a.id.localeCompare(b.id),
  );
  const center = {
    lat: sorted.reduce((sum, incident) => sum + incident.coordinates.lat, 0) / sorted.length,
    lng: sorted.reduce((sum, incident) => sum + incident.coordinates.lng, 0) / sorted.length,
  };
  const critical = sorted.some(incident => incident.riskAssessed && incident.riskLevel === 'critical');
  const severe = sorted.length >= 5 || critical;
  const guidance = getSourceGuidance(sorted[0].category);
  return {
    id: `cluster-${sorted.map(incident => incident.id).sort().join('-')}`,
    category: sorted[0].category,
    center,
    radiusMeters: Math.max(...sorted.map(incident => haversineDistanceMeters(center, incident.coordinates))),
    startedAt: sorted[0].reportedAt,
    latestAt: sorted[sorted.length - 1].reportedAt,
    incidentCount: sorted.length,
    risk: severe ? 'critical' : 'high',
    label: severe ? 'Kritik Havza Alarmı / Olası Kaynak Deşarjı' : 'Yüksek Riskli Kümelenme',
    color: severe ? '#dc2626' : '#f97316',
    regionLabel: getRegionLabel(sorted),
    probableSource: guidance.source,
    recommendation: guidance.recommendation,
    incidents: sorted,
  };
}

/**
 * Greedy complete-link clustering. Each accepted incident must be within both
 * thresholds of every cluster member, preventing single-link chaining from
 * connecting geographically or temporally distant reports.
 */
export function detectIncidentClusters(
  input: readonly IncidentClusterMember[],
  options: {
    spatialThresholdMeters?: number;
    temporalThresholdMs?: number;
    minimumIncidents?: number;
  } = {},
): IncidentCluster[] {
  const spatialThreshold = options.spatialThresholdMeters ?? SPATIAL_THRESHOLD_METERS;
  const temporalThreshold = options.temporalThresholdMs ?? TEMPORAL_THRESHOLD_MS;
  const minimumIncidents = options.minimumIncidents ?? MIN_CLUSTER_INCIDENTS;
  if (!Number.isFinite(spatialThreshold) || spatialThreshold <= 0 ||
      !Number.isFinite(temporalThreshold) || temporalThreshold <= 0 ||
      !Number.isInteger(minimumIncidents) || minimumIncidents < 2) {
    throw new RangeError('Kümelenme eşikleri pozitif, olay sayısı ise en az iki olmalıdır.');
  }

  const sorted = input.filter(isValidIncident).slice().sort((a, b) =>
    Date.parse(a.reportedAt) - Date.parse(b.reportedAt) || a.id.localeCompare(b.id),
  );
  const claimedIncidentIds = new Set<string>();
  const clusters: IncidentCluster[] = [];

  for (const seed of sorted) {
    if (claimedIncidentIds.has(seed.id)) continue;
    const seedTime = Date.parse(seed.reportedAt);
    const members = [seed];
    for (const candidate of sorted) {
      if (candidate.id === seed.id || claimedIncidentIds.has(candidate.id) ||
          candidate.category !== seed.category) continue;
      const candidateTime = Date.parse(candidate.reportedAt);
      if (candidateTime < seedTime || candidateTime - seedTime > temporalThreshold) continue;
      if (members.every(member =>
        haversineDistanceMeters(member.coordinates, candidate.coordinates) <= spatialThreshold &&
        Math.abs(Date.parse(member.reportedAt) - candidateTime) <= temporalThreshold,
      )) {
        members.push(candidate);
      }
    }

    if (members.length < minimumIncidents) continue;
    const cluster = toCluster(members);
    clusters.push(cluster);
    for (const member of members) claimedIncidentIds.add(member.id);
  }

  return clusters.sort((a, b) => b.incidentCount - a.incidentCount ||
    Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id));
}

export function detectCardIncidentClusters(cards: readonly KanbanCard[]): IncidentCluster[] {
  return detectIncidentClusters(cards.flatMap(card => card.coordinates ? [{
    id: card.id,
    trackingCode: card.trackingCode,
    title: card.title,
    category: card.incidentCategory,
    location: card.location,
    province: card.province,
    district: card.district,
    coordinates: card.coordinates,
    reportedAt: card.createdAt,
    riskLevel: card.riskLevel,
    riskAssessed: card.riskAssessed,
  }] : []));
}
