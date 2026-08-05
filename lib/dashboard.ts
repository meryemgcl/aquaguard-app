/* ============================================================
   AquaGuard — Dashboard Data Store
   Stats, map markers, chart data
   ============================================================ */

export interface MapMarker {
  id: string;
  location: string;
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskColor: string;
  lastMeasurement: string;
  params: {
    ph: number;
    turbidity: number;
    dissolvedO2: number;
    temperature: number;
  };
}

export interface MonthlyTrend {
  month: string;
  risk: number;
  reports: number;
}

export interface RegionData {
  region: string;
  count: number;
  color: string;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  stats: {
    totalReports: number;
    pendingApproval: number;
    avgRiskScore: number;
    publishedThisMonth: number;
    totalReportsTrend: number;
    publishedTrend: number;
  };
  markers: MapMarker[];
  monthlyTrend: MonthlyTrend[];
  regionData: RegionData[];
  statusData: StatusData[];
  recentActivity: {
    id: string;
    text: string;
    highlight: string;
    time: string;
    color: string;
  }[];
}

/* ── Map marker data (real Turkish water bodies) ── */
const markers: MapMarker[] = [
  {
    id: 'm1', location: 'Ergene Nehri, Tekirdağ',
    lat: 41.28, lng: 27.51, riskScore: 78, riskLevel: 'high', riskColor: '#ff6b35',
    lastMeasurement: '2026-07-17', params: { ph: 4.2, turbidity: 12, dissolvedO2: 4.8, temperature: 22 },
  },
  {
    id: 'm2', location: 'Sapanca Gölü, Sakarya',
    lat: 40.69, lng: 30.28, riskScore: 85, riskLevel: 'critical', riskColor: '#ff4444',
    lastMeasurement: '2026-07-16', params: { ph: 7.1, turbidity: 3, dissolvedO2: 1.8, temperature: 19 },
  },
  {
    id: 'm3', location: 'Melen Çayı, Düzce',
    lat: 40.84, lng: 31.17, riskScore: 18, riskLevel: 'low', riskColor: '#00ff88',
    lastMeasurement: '2026-07-15', params: { ph: 7.4, turbidity: 2, dissolvedO2: 8.5, temperature: 16 },
  },
  {
    id: 'm4', location: 'Gediz Havzası, İzmir',
    lat: 38.72, lng: 27.18, riskScore: 58, riskLevel: 'medium', riskColor: '#f59e0b',
    lastMeasurement: '2026-07-14', params: { ph: 6.8, turbidity: 8, dissolvedO2: 5.2, temperature: 24 },
  },
  {
    id: 'm5', location: 'Kızılırmak, Kırıkkale',
    lat: 39.85, lng: 33.52, riskScore: 22, riskLevel: 'low', riskColor: '#00ff88',
    lastMeasurement: '2026-07-17', params: { ph: 7.8, turbidity: 4, dissolvedO2: 7.2, temperature: 18 },
  },
  {
    id: 'm6', location: 'Büyük Menderes, Aydın',
    lat: 37.85, lng: 27.84, riskScore: 65, riskLevel: 'high', riskColor: '#ff6b35',
    lastMeasurement: '2026-07-13', params: { ph: 5.9, turbidity: 15, dissolvedO2: 4.1, temperature: 26 },
  },
  {
    id: 'm7', location: 'Terkos Gölü, İstanbul',
    lat: 41.35, lng: 28.62, riskScore: 42, riskLevel: 'medium', riskColor: '#f59e0b',
    lastMeasurement: '2026-07-16', params: { ph: 7.2, turbidity: 6, dissolvedO2: 6.1, temperature: 21 },
  },
  {
    id: 'm8', location: 'Burdur Gölü, Burdur',
    lat: 37.72, lng: 30.18, riskScore: 91, riskLevel: 'critical', riskColor: '#ff4444',
    lastMeasurement: '2026-07-12', params: { ph: 9.1, turbidity: 18, dissolvedO2: 2.3, temperature: 28 },
  },
  {
    id: 'm9', location: 'Çoruh Nehri, Artvin',
    lat: 41.18, lng: 41.82, riskScore: 15, riskLevel: 'low', riskColor: '#00ff88',
    lastMeasurement: '2026-07-17', params: { ph: 7.6, turbidity: 1.5, dissolvedO2: 9.2, temperature: 14 },
  },
  {
    id: 'm10', location: 'Seyhan Barajı, Adana',
    lat: 37.05, lng: 35.35, riskScore: 35, riskLevel: 'medium', riskColor: '#f59e0b',
    lastMeasurement: '2026-07-15', params: { ph: 7.0, turbidity: 5, dissolvedO2: 6.8, temperature: 23 },
  },
];

/* ── Monthly trend data ── */
const monthlyTrend: MonthlyTrend[] = [
  { month: 'Oca', risk: 28, reports: 18 },
  { month: 'Şub', risk: 32, reports: 22 },
  { month: 'Mar', risk: 25, reports: 28 },
  { month: 'Nis', risk: 38, reports: 35 },
  { month: 'May', risk: 42, reports: 31 },
  { month: 'Haz', risk: 55, reports: 40 },
  { month: 'Tem', risk: 48, reports: 38 },
];

/* ── Region breakdown ── */
const regionData: RegionData[] = [
  { region: 'Marmara', count: 68, color: '#00d4ff' },
  { region: 'Ege', count: 45, color: '#6e8efb' },
  { region: 'İç Anadolu', count: 38, color: '#00ff88' },
  { region: 'Karadeniz', count: 32, color: '#f59e0b' },
  { region: 'Akdeniz', count: 28, color: '#a777e3' },
  { region: 'Doğu', count: 22, color: '#ff6b6b' },
  { region: 'G.Doğu', count: 14, color: '#ff9f43' },
];

/* ── Status distribution ── */
const statusData: StatusData[] = [
  { name: 'Yayınlandı', value: 142, color: '#00ff88' },
  { name: 'Onay Bekliyor', value: 38, color: '#f59e0b' },
  { name: 'AI Analiz', value: 24, color: '#6e8efb' },
  { name: 'Reddedildi', value: 18, color: '#ff4444' },
  { name: 'Yeni', value: 25, color: '#00d4ff' },
];

/* ── Recent activity ── */
const recentActivity = [
  { id: 'a1', text: 'Burdur Gölü raporu', highlight: 'kritik seviye — acil inceleme', time: '12 dk önce', color: '#ff4444' },
  { id: 'a2', text: 'Sapanca Gölü raporu', highlight: 'yönetici onayı bekleniyor', time: '1 saat önce', color: '#f59e0b' },
  { id: 'a3', text: 'Melen Çayı raporu', highlight: 'yayınlandı', time: '2 saat önce', color: '#00ff88' },
  { id: 'a4', text: 'Ergene Nehri raporu', highlight: 'reddedildi — düzeltme maili gönderildi', time: '4 saat önce', color: '#ff4444' },
  { id: 'a5', text: 'AI analiz:', highlight: 'Çoruh Nehri tüm parametreler normal', time: '5 saat önce', color: '#00d4ff' },
  { id: 'a6', text: '3 yeni kullanıcı', highlight: 'sisteme kaydoldu', time: '1 gün önce', color: '#6e8efb' },
];

/* ── Export ── */
export function getDashboardData(): DashboardData {
  const avgRisk = Math.round(markers.reduce((s, m) => s + m.riskScore, 0) / markers.length);

  return {
    stats: {
      totalReports: 247,
      pendingApproval: 12,
      avgRiskScore: avgRisk,
      publishedThisMonth: 38,
      totalReportsTrend: 12,
      publishedTrend: 8,
    },
    markers,
    monthlyTrend,
    regionData,
    statusData,
    recentActivity,
  };
}
