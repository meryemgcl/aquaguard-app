import type { KanbanCard } from './kanban-types';

export type PublicIncidentStatus = 'yayinda' | 'cozuldu';
export type ExportIncidentStatus = PublicIncidentStatus | string;

export interface OpenDataIncident {
  trackingCode: string;
  title: string;
  category: string;
  riskLevel: string;
  province: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  reportedAt: string;
  status: ExportIncidentStatus;
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    trackingCode: string;
    title: string;
    category: string;
    riskLevel: string;
    province: string | null;
    district: string | null;
    reportedAt: string;
    status: ExportIncidentStatus;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface EmbedMapIncident extends Omit<OpenDataIncident, 'latitude' | 'longitude'> {
  latitude: number;
  longitude: number;
  photo: string | null;
}

const riskLabels: Record<KanbanCard['riskLevel'], string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export function isPubliclyVisibleIncident(card: Pick<KanbanCard, 'column' | 'resolution'>): boolean {
  return card.column === 'yayinlandi' ||
    (card.column === 'reddedildi' && card.resolution === 'kapatildi');
}

export function toOpenDataIncident(card: KanbanCard): OpenDataIncident {
  const status = card.column === 'yayinlandi'
    ? 'yayinda'
    : card.column === 'reddedildi' && card.resolution === 'kapatildi'
      ? 'cozuldu'
      : card.column === 'yeni'
        ? 'yeni_ihbar'
        : card.column === 'ai-analiz' || card.column === 'onay-uzman'
          ? 'uzman_incelemesinde'
          : card.column === 'onay-yonetici'
            ? 'yonetici_onayinda'
            : card.resolution ?? 'reddedildi';
  return {
    trackingCode: card.trackingCode ?? '',
    title: card.title,
    category: card.incidentCategory,
    riskLevel: card.riskAssessed ? riskLabels[card.riskLevel] : 'Değerlendirilmedi',
    province: card.province,
    district: card.district,
    latitude: card.coordinates?.lat ?? null,
    longitude: card.coordinates?.lng ?? null,
    reportedAt: card.createdAt,
    status,
  };
}

export function toGeoJsonFeatureCollection(
  incidents: readonly OpenDataIncident[],
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: incidents.flatMap(incident => {
      if (incident.latitude === null || incident.longitude === null ||
          !Number.isFinite(incident.latitude) || !Number.isFinite(incident.longitude) ||
          incident.latitude < -90 || incident.latitude > 90 ||
          incident.longitude < -180 || incident.longitude > 180) return [];
      return [{
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [incident.longitude, incident.latitude] as [number, number],
        },
        properties: {
          trackingCode: incident.trackingCode,
          title: incident.title,
          category: incident.category,
          riskLevel: incident.riskLevel,
          province: incident.province,
          district: incident.district,
          reportedAt: incident.reportedAt,
          status: incident.status,
        },
      }];
    }),
  };
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toIncidentCsv(incidents: readonly OpenDataIncident[]): string {
  const rows = [
    ['Takip Kodu', 'Başlık', 'Kategori', 'Risk Seviyesi', 'İl', 'İlçe', 'Enlem', 'Boylam', 'Bildirim Tarihi', 'Durum'],
    ...incidents.map(incident => [
      incident.trackingCode,
      incident.title,
      incident.category,
      incident.riskLevel,
      incident.province,
      incident.district,
      incident.latitude,
      incident.longitude,
      incident.reportedAt,
      incident.status,
    ]),
  ];
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

export function getExportIncidents(
  cards: readonly KanbanCard[],
  includeAll: boolean,
): OpenDataIncident[] {
  return cards
    .filter(card => includeAll || isPubliclyVisibleIncident(card))
    .map(toOpenDataIncident);
}
