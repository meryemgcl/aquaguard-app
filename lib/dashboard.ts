import { getCards } from '@/lib/kanban';
import type { DashboardData } from '@/lib/dashboard-types';
import { toIncidentMapMarker } from '@/lib/incident-map';
import type { WaterIncidentCategory } from '@/lib/types';
import database from '@/lib/local-db';

const incidentCategories: WaterIncidentCategory[] = [
  'endüstriyel atık',
  'evsel atık',
  'balık ölümü',
  'renk/koku değişimi',
];

const categoryColors = ['#eb5757', '#2f80ed', '#f2c94c', '#ff6b35'];

export function getDashboardData(includeWorkflowDetails = true): DashboardData {
  const allCards = getCards();
  const cards = includeWorkflowDetails ? allCards : allCards.filter(card => card.column === 'yayinlandi');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const publishedThisMonth = cards.filter(card => card.column === 'yayinlandi' && card.updatedAt >= monthStart).length;
  const pendingApproval = cards.filter(card => ['onay-uzman', 'onay-yonetici'].includes(card.column)).length;
  const assessedCards = cards.filter(card => card.riskAssessed);
  const avgRiskScore = assessedCards.length
    ? Math.round(assessedCards.reduce((sum, card) => sum + card.riskScore, 0) / assessedCards.length)
    : null;
  const criticalPending = cards.filter(card =>
    card.riskAssessed && card.riskLevel === 'critical' &&
    ['yeni', 'ai-analiz', 'onay-uzman', 'onay-yonetici'].includes(card.column),
  ).length;
  const responseDurations = cards.flatMap(card => {
    const firstExpertAction = card.auditTrail.find(event =>
      event.role === 'uzman' &&
      event.previousStatus === 'yeni_ihbar' &&
      event.newStatus === 'uzman_incelemesinde',
    );
    if (!firstExpertAction) return [];
    const startedAt = Date.parse(card.createdAt);
    const reviewedAt = Date.parse(firstExpertAction.timestamp);
    return Number.isFinite(startedAt) && Number.isFinite(reviewedAt) && reviewedAt >= startedAt
      ? [(reviewedAt - startedAt) / (60 * 60 * 1000)]
      : [];
  });
  const averageResponseHours = responseDurations.length
    ? Math.round(responseDurations.reduce((sum, hours) => sum + hours, 0) / responseDurations.length * 10) / 10
    : null;

  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);
    const start = date.toISOString();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString();
    const reports = cards.filter(card => card.createdAt >= start && card.createdAt < end);
    return {
      month: date.toLocaleDateString('tr-TR', { month: 'short' }),
      reports: reports.length,
    };
  });

  const statusColors: Record<string, string> = {
    yeni: '#00d4ff',
    'ai-analiz': '#6e8efb',
    'onay-uzman': '#f59e0b',
    'onay-yonetici': '#f59e0b',
    yayinlandi: '#00ff88',
    reddedildi: '#ff4444',
  };
  const statusNames: Record<string, string> = {
    yeni: 'Yeni',
    'ai-analiz': 'AI Analiz',
    'onay-uzman': 'Uzman Onayı',
    'onay-yonetici': 'Yönetici Onayı',
    yayinlandi: 'Yayınlandı',
    reddedildi: 'Reddedildi',
  };
  const statusData = Object.entries(statusNames).map(([column, name]) => ({
    name,
    value: cards.filter(card => card.column === column).length,
    color: statusColors[column],
  }));

  const dataFreshness = cards.reduce<string | null>((latest, card) =>
    latest === null || card.updatedAt > latest ? card.updatedAt : latest, null);

  const categoryDistribution = incidentCategories.map((category, index) => ({
    category,
    count: cards.filter(card => card.incidentCategory === category).length,
    color: categoryColors[index],
  }));

  const regionCounts = new Map<string, { province: string; district: string; count: number }>();
  let unclassifiedRegionCount = 0;
  for (const card of cards) {
    const province = card.province?.trim();
    const district = card.district?.trim();
    if (!province || !district) {
      unclassifiedRegionCount += 1;
      continue;
    }
    const key = `${province.toLocaleLowerCase('tr-TR')}|${district.toLocaleLowerCase('tr-TR')}`;
    const existing = regionCounts.get(key);
    if (existing) existing.count += 1;
    else regionCounts.set(key, { province, district, count: 1 });
  }
  const regionData = [...regionCounts.values()]
    .sort((a, b) => b.count - a.count || a.province.localeCompare(b.province, 'tr') || a.district.localeCompare(b.district, 'tr'))
    .slice(0, 5);
  const palette = ['#2f80ed', '#6e8efb', '#00ff88', '#f2c94c', '#a777e3'];
  const locationData = regionData.map((region, index) => ({
    location: `${region.district}, ${region.province}`,
    count: region.count,
    color: palette[index % palette.length],
  }));

  const markers = cards.flatMap(card => {
    const marker = toIncidentMapMarker(card);
    return marker ? [marker] : [];
  });

  const stationCount = (database.prepare('SELECT COUNT(*) AS count FROM stations').get() as { count: number }).count;
  const alerts = cards
    .filter(card => card.riskAssessed && (card.riskLevel === 'critical' || card.riskLevel === 'high'))
    .slice(0, 5)
    .map(card => ({
      id: `alert-${card.id}`,
      title: card.riskLevel === 'critical' ? 'Kritik riskli rapor' : 'Yüksek riskli rapor',
      location: card.location,
      severity: card.riskLevel as 'critical' | 'high',
      metric: 'Risk skoru',
      value: `${card.riskScore}/100`,
      delta: 'İnceleme gerekli',
      action: 'Raporu incele',
      eta: 'Açık',
    }));

  return {
    stats: {
      totalReports: cards.length,
      pendingApproval,
      avgRiskScore,
      publishedThisMonth,
      activeAlerts: alerts.length,
      dataFreshness: dataFreshness ?? 'Henüz veri yok',
      criticalPending,
      averageResponseHours,
    },
    markers,
    monthlyTrend: months,
    locationData,
    categoryDistribution,
    regionData,
    unclassifiedRegionCount,
    statusData,
    recentActivity: cards.slice(0, 6).map(card => ({
      id: card.id,
      text: card.title,
      highlight: statusNames[card.column],
      time: new Date(card.updatedAt).toLocaleString('tr-TR'),
      color: statusColors[card.column],
    })),
    alerts,
    exportRows: cards.map(card => ({
      location: card.location,
      riskLevel: card.riskLevel,
      reportedAt: card.createdAt,
      ph: card.measurements?.ph ?? null,
      turbidity: card.measurements?.turbidity ?? null,
      dissolvedO2: card.measurements?.dissolvedO2 ?? null,
      temperature: card.measurements?.temperature ?? null,
    })),
    stationCount,
  };
}
