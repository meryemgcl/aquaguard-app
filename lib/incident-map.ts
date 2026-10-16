import type { KanbanCard, KanbanColumn, RiskLevel } from './kanban-types';
import type { WaterIncidentStatus } from './types';
import { riskLevelToColor } from './risk-colors';

export interface IncidentMapMarker {
  id: string;
  title: string;
  location: string;
  province: string | null;
  district: string | null;
  lat: number;
  lng: number;
  riskScore: number | null;
  riskLevel: RiskLevel | 'unassessed';
  riskColor: string;
  reportedAt: string;
  category: KanbanCard['incidentCategory'];
  status: WaterIncidentStatus;
  params?: KanbanCard['measurements'];
}

const statusByColumn: Record<KanbanColumn, WaterIncidentStatus> = {
  yeni: 'yeni_ihbar',
  'ai-analiz': 'uzman_incelemesinde',
  'onay-uzman': 'uzman_incelemesinde',
  'onay-yonetici': 'yonetici_onayinda',
  yayinlandi: 'yayinda',
  reddedildi: 'reddedildi',
};

export function toIncidentMapMarker(card: KanbanCard): IncidentMapMarker | null {
  if (!card.coordinates) return null;
  const riskLevel = card.riskAssessed ? card.riskLevel : 'unassessed';
  const riskColor = card.riskAssessed ? riskLevelToColor(card.riskLevel) : '#8892a8';

  return {
    id: `report-${card.id}`,
    title: card.title,
    location: card.location,
    province: card.province,
    district: card.district,
    lat: card.coordinates.lat,
    lng: card.coordinates.lng,
    riskScore: card.riskAssessed ? card.riskScore : null,
    riskLevel,
    riskColor,
    reportedAt: card.createdAt.slice(0, 10),
    category: card.incidentCategory,
    status: card.column === 'reddedildi' && card.resolution
      ? card.resolution
      : statusByColumn[card.column],
    params: card.measurements,
  };
}

export function filterIncidentMapMarkers(
  markers: IncidentMapMarker[],
  filters: {
    category: KanbanCard['incidentCategory'] | 'all';
    dateFrom: string;
    dateTo: string;
    publishedOnly: boolean;
  },
): IncidentMapMarker[] {
  return markers.filter(marker =>
    (filters.category === 'all' || marker.category === filters.category) &&
    (!filters.dateFrom || marker.reportedAt >= filters.dateFrom) &&
    (!filters.dateTo || marker.reportedAt <= filters.dateTo) &&
    (!filters.publishedOnly || marker.status === 'yayinda'),
  );
}
