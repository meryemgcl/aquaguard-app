import type { IncidentMapMarker } from './incident-map';
import type { WaterIncidentCategory } from './types';

export interface DashboardData {
  stats: {
    totalReports: number;
    pendingApproval: number;
    avgRiskScore: number | null;
    publishedThisMonth: number;
    activeAlerts: number;
    dataFreshness: string;
    criticalPending: number;
    averageResponseHours: number | null;
  };
  markers: IncidentMapMarker[];
  monthlyTrend: { month: string; reports: number }[];
  locationData: { location: string; count: number; color: string }[];
  categoryDistribution: { category: WaterIncidentCategory; count: number; color: string }[];
  regionData: { province: string; district: string; count: number }[];
  unclassifiedRegionCount: number;
  statusData: { name: string; value: number; color: string }[];
  recentActivity: { id: string; text: string; highlight: string; time: string; color: string }[];
  alerts: {
    id: string;
    title: string;
    location: string;
    severity: 'critical' | 'high' | 'medium';
    metric: string;
    value: string;
    delta: string;
    action: string;
    eta: string;
  }[];
  exportRows: {
    location: string;
    riskLevel: string;
    reportedAt: string;
    ph: number | null;
    turbidity: number | null;
    dissolvedO2: number | null;
    temperature: number | null;
  }[];
  stationCount: number;
}
