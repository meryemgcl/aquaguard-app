'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import IncidentMapFilters from '@/components/MapPage/IncidentMapFilters';
import { filterIncidentMapMarkers } from '@/lib/incident-map';
import type { DashboardData } from '@/lib/dashboard-types';
import type { WaterIncidentCategory } from '@/lib/types';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from './Dashboard.module.css';
import OpenDataExportMenu from '@/components/OpenData/OpenDataExportMenu';

/* Dynamic import for Leaflet (no SSR) */
const WaterMap = dynamic(() => import('./WaterMap'), { ssr: false, loading: () => <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div> });

/* ── Types ── */
interface StationAlert {
  id: string;
  stationId: string;
  stationName: string;
  parameter: string;
  comparator: 'above' | 'below';
  thresholdValue: number;
  unit: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  lastSeenAt: string;
  lastValue: number;
  measurementCount: number;
}

/* Custom chart tooltip */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════ */
export default function DashboardClient() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [stationAlerts, setStationAlerts] = useState<StationAlert[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [criticalRadar, setCriticalRadar] = useState<{ count: number; regions: string[] } | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [mapCategory, setMapCategory] = useState<WaterIncidentCategory | 'all'>('all');
  const [mapDateFrom, setMapDateFrom] = useState('');
  const [mapDateTo, setMapDateTo] = useState('');
  const [publishedOnly, setPublishedOnly] = useState(false);

  /* ── Load persistent local data from the API ── */
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Pano verileri yüklenemedi.');
        if (active) {
          setData(result.data as DashboardData);
          setLoadError(null);
        }
      } catch (error) {
        console.error('/api/dashboard hatası:', error);
        if (active) setLoadError(error instanceof Error ? error.message : 'Pano verileri yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [retryKey]);

  useEffect(() => {
    if (!user || user.role === 'halk') return;
    let active = true;
    const loadAlerts = async () => {
      try {
        const response = await fetch('/api/station-alerts?status=open', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'İstasyon uyarıları yüklenemedi.');
        if (active) {
          setStationAlerts(result.alerts as StationAlert[]);
          setAlertError(null);
        }
      } catch (error) {
        if (active) setAlertError(error instanceof Error ? error.message : 'İstasyon uyarıları yüklenemedi.');
      }
    };
    void loadAlerts();
    const interval = window.setInterval(loadAlerts, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'halk') return;
    let active = true;
    const loadRadar = async () => {
      try {
        const response = await fetch('/api/radar', { cache: 'no-store' });
        const result: unknown = await response.json();
        if (!response.ok) throw new Error('Erken uyarı radarı yüklenemedi.');
        if (typeof result !== 'object' || result === null || !('clusters' in result) ||
            !Array.isArray(result.clusters)) {
          throw new Error('Erken uyarı radarı geçersiz yanıt verdi.');
        }
        const critical = result.clusters.filter((cluster): cluster is { risk: string; regionLabel: string } =>
          typeof cluster === 'object' && cluster !== null && 'risk' in cluster &&
          cluster.risk === 'critical' && 'regionLabel' in cluster && typeof cluster.regionLabel === 'string',
        );
        if (active) {
          setCriticalRadar({
            count: critical.length,
            regions: [...new Set(critical.map(cluster => cluster.regionLabel))],
          });
          setRadarError(null);
        }
      } catch (error) {
        if (active) setRadarError(error instanceof Error ? error.message : 'Erken uyarı radarı yüklenemedi.');
      }
    };
    void loadRadar();
    const interval = window.setInterval(loadRadar, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/station-alerts/${encodeURIComponent(alertId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Uyarı onaylanamadı.');
      setStationAlerts(current => current.filter(alert => alert.id !== alertId));
    } catch (error) {
      setAlertError(error instanceof Error ? error.message : 'Uyarı onaylanamadı.');
    }
  };

  if (loading && !data) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Dashboard yükleniyor…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.loadingState} role="alert">
        <p>{loadError || 'Pano verileri yüklenemedi.'}</p>
        <button type="button" onClick={() => { setLoading(true); setRetryKey(key => key + 1); }}>
          Yeniden dene
        </button>
      </div>
    );
  }

  const dashboardData = data;

  const averageRisk = dashboardData.stats.avgRiskScore;
  const riskColor = averageRisk === null
    ? '#8892a8'
    : averageRisk < 30 ? '#2f80ed' : averageRisk < 60 ? '#f2c94c' : averageRisk < 80 ? '#ff6b35' : '#eb5757';
  const mapMarkers = filterIncidentMapMarkers(dashboardData.markers, {
    category: mapCategory,
    dateFrom: mapDateFrom,
    dateTo: mapDateTo,
    publishedOnly: publishedOnly || user?.role === 'halk',
  });

  return (
    <div className={styles.dashboard} aria-busy={loading}>
      <div className={styles.contextBar} role="status">
        <span>{user?.role === 'halk'
          ? 'AquaGuard, su kirliliği ve kalite sorunlarını bildirip takip etmenizi sağlar.'
          : 'Açık raporları inceleyin, yetkili olduğunuz iş akışı adımlarını tamamlayın.'}</span>
        <span>
          Son rapor güncellemesi: {dashboardData.stats.dataFreshness === 'Henüz veri yok'
            ? 'Henüz kayıt yok'
            : new Date(dashboardData.stats.dataFreshness).toLocaleString('tr-TR')}
        </span>
      </div>
      {user?.role !== 'halk' && criticalRadar && criticalRadar.count > 0 && (
        <section className={styles.radarAlarm} role="alert" aria-labelledby="radar-alarm-title">
          <div>
            <strong id="radar-alarm-title">Erken Uyarı &amp; Radar Alarmı</strong>
            <p>{criticalRadar.count} kritik kümelenme tespit edildi.
              {criticalRadar.regions.length > 0 ? ` Risk altındaki bölgeler: ${criticalRadar.regions.join(' · ')}` : ''}
            </p>
          </div>
          <Link href="/radar">Radar kümelerini incele →</Link>
        </section>
      )}
      {user?.role !== 'halk' && radarError && (
        <p className={styles.radarError} role="status">{radarError}</p>
      )}
      <section className={styles.roleActions} aria-label="Hızlı erişim">
        {user?.role === 'halk' ? (
          <>
            <div><h2>Bir su sorunu mu fark ettiniz?</h2><p>Konumu ve gözleminizi ekleyin; gönderdiğiniz bildirimlerin durumunu takip edin.</p></div>
            <Link href="/ihbar" className="btn btn-primary">İhbar Bildir</Link>
            <Link href="/raporlarim" className="btn">İhbar Takip</Link>
          </>
        ) : (
          <>
            <div><h2>Operasyon kuyruğu</h2><p>İnceleme ve onay için bekleyen raporları açın.</p></div>
            <Link href="/kanban" className="btn btn-primary">Rapor inceleme panosuna git</Link>
          </>
        )}
      </section>
      <div className={styles.dashboardExport}>
        <OpenDataExportMenu allowAllRecords={user?.role !== 'halk'} />
      </div>
      {user?.role !== 'halk' && (
        <section className={styles.stationAlerts} aria-labelledby="station-alerts-title">
          <div className={styles.stationAlertsHeader}>
            <div>
              <h2 id="station-alerts-title">İstasyon uyarıları</h2>
              <p>Su kalitesi eşiklerine ve ölçümlere dayalı açık uyarılar.</p>
            </div>
            <a className={styles.exportLink} href="/api/measurements/export">Ölçümleri CSV indir</a>
          </div>
          {alertError ? (
            <p className={styles.alertState} role="alert">{alertError}</p>
          ) : stationAlerts.length === 0 ? (
            <p className={styles.alertState}>Açık istasyon uyarısı yok. Ölçüm/eşik kaydı yoksa bu durum kalite göstergesi sayılmaz.</p>
          ) : (
            <ul className={styles.stationAlertList}>
              {stationAlerts.map(alert => (
                <li key={alert.id} className={styles.stationAlert}>
                  <div>
                    <strong>{alert.stationName} · {alert.parameter}</strong>
                    <span>
                      {alert.lastValue} {alert.unit} ({alert.comparator === 'above' ? '>' : '<'} {alert.thresholdValue} {alert.unit}) · {alert.measurementCount} ölçüm · son veri {new Date(alert.lastSeenAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className={styles.alertActions}>
                    <span className={`${styles.severityBadge} ${styles[`severity_${alert.severity}`]}`}>{alert.severity}</span>
                    <button type="button" onClick={() => void acknowledgeAlert(alert.id)}>Ele alındı</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {/* ── Stats Row ── */}
      <div className={`${styles.statsGrid} ${user?.role === 'halk' ? styles.citizenStatsGrid : ''}`}>
        <div className={`${styles.statCard} ${styles.statAccent}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(0,212,255,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
          </div>
          <div className={styles.statValue}>{dashboardData.stats.totalReports}</div>
          <div className={styles.statLabel}>{user?.role === 'halk' ? 'Yayınlanmış Rapor' : 'Toplam Rapor'}</div>
        </div>

        {user?.role !== 'halk' && (
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(245,158,11,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <span className={styles.badgeWarning}>Bekliyor</span>
          </div>
          <div className={styles.statValue}>{dashboardData.stats.pendingApproval}</div>
          <div className={styles.statLabel}>Bekleyen Onay</div>
        </div>
        )}

        {user?.role !== 'halk' && (
          <div className={`${styles.statCard} ${styles.statRisk}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIcon} style={{ background: `${riskColor}18` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={riskColor} strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <span className={styles.badgeSuccess} style={{ color: riskColor, background: `${riskColor}15`, borderColor: `${riskColor}33` }}>
                {averageRisk === null ? 'Veri yok' : averageRisk < 30 ? 'Düşük' : averageRisk < 60 ? 'Orta' : averageRisk < 80 ? 'Yüksek' : 'Kritik'}
              </span>
            </div>
            <div className={styles.statValue} style={{ color: riskColor }}>{averageRisk ?? '—'}</div>
            <div className={styles.statLabel}>Ortalama Risk Skoru</div>
            {averageRisk !== null && <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${averageRisk}%`, background: `linear-gradient(90deg,${riskColor}88,${riskColor})` }} /></div>}
          </div>
        )}

        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(110,142,251,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
          </div>
          <div className={styles.statValue}>{dashboardData.stats.publishedThisMonth}</div>
          <div className={styles.statLabel}>Bu Ay Yayınlanan</div>
        </div>
      </div>
      {user?.role !== 'halk' && (
        <section className={styles.operationalMetrics} aria-label="Operasyonel göstergeler">
          <article className={styles.operationalMetric}>
            <span>Bekleyen Kritik Olay Sayısı</span>
            <strong>{dashboardData.stats.criticalPending}</strong>
            <small>Uzman tarafından kritik sınıflandırılmış, açık olaylar</small>
          </article>
          <article className={styles.operationalMetric}>
            <span>Ortalama Müdahale Süresi</span>
            <strong>{dashboardData.stats.averageResponseHours === null
              ? '—'
              : `${dashboardData.stats.averageResponseHours.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat`}</strong>
            <small>İhbar alımından ilk uzman incelemesine; yalnızca incelenen olaylar</small>
          </article>
        </section>
      )}
      <section className={styles.operationalBreakdown} aria-label="İhbar dağılımı">
        <div className={styles.operationalPanel}>
          <h2>Kategori Dağılımı</h2>
          {dashboardData.categoryDistribution.every(item => item.count === 0)
            ? <p className={styles.operationalEmpty}>Gösterilecek ihbar kaydı yok.</p>
            : dashboardData.categoryDistribution.map(item => (
              <div className={styles.breakdownRow} key={item.category}>
                <span><i style={{ background: item.color }} />{item.category}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
        </div>
        <div className={styles.operationalPanel}>
          <h2>En Çok İhbar Alan İl / İlçeler</h2>
          {dashboardData.regionData.length === 0
            ? <p className={styles.operationalEmpty}>İl ve ilçe bilgisi bulunan ihbar yok.</p>
            : dashboardData.regionData.map(region => (
              <div className={styles.breakdownRow} key={`${region.province}-${region.district}`}>
                <span>{region.district}, {region.province}</span>
                <strong>{region.count}</strong>
              </div>
            ))}
          {dashboardData.unclassifiedRegionCount > 0 && (
            <p className={styles.operationalEmpty}>{dashboardData.unclassifiedRegionCount} eski kayıtta il/ilçe bilgisi yok.</p>
          )}
        </div>
      </section>
      {/* ── Map Section ── */}
      <div className={styles.mapSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
              Su Kalitesi Haritası
            </h2>
            <span className={styles.sectionBadge}>{mapMarkers.length} konumlu olay</span>
          </div>
          <Link href="/harita" className={styles.viewAllBtn}>
            Tam Ekran →
          </Link>
        </div>
        <IncidentMapFilters
          category={mapCategory}
          onCategoryChange={setMapCategory}
          dateFrom={mapDateFrom}
          onDateFromChange={setMapDateFrom}
          dateTo={mapDateTo}
          onDateToChange={setMapDateTo}
          publishedOnly={publishedOnly}
          onPublishedOnlyChange={setPublishedOnly}
          allowAllStatuses={user?.role !== 'halk'}
        />
        {mapMarkers.length > 0
          ? <WaterMap markers={mapMarkers} />
          : <div className={styles.mapEmptyState}>Seçili filtrelerle gösterilecek konumlu olay yok.</div>}
        {/* Map legend */}
        <div className={styles.mapLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#2f80ed' }} /> Düşük (0-29)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f2c94c' }} /> Orta (30-59)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ff6b35' }} /> Yüksek (60-79)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#eb5757' }} /> Kritik (80+)</span>
          {mapMarkers.some(marker => marker.riskScore === null) && (
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#8892a8' }} /> Değerlendirilmedi</span>
          )}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className={styles.chartsGrid}>
        {/* Line chart — Monthly risk trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              Aylık Yeni Raporlar
            </h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboardData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="reports" name="Yeni rapor" fill="#00d4ff" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart — Location breakdown */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="12" rx="1" /><rect x="17" y="4" width="4" height="16" rx="1" /></svg>
              Konuma Göre Raporlar
            </h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboardData.locationData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="location" tick={{ fill: '#8892a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Rapor" radius={[6, 6, 0, 0]}>
                  {dashboardData.locationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart — Status distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
              Rapor Durumu Dağılımı
            </h3>
          </div>
          <div className={styles.chartBody} style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={dashboardData.statusData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {dashboardData.statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {dashboardData.statusData.map((s, i) => (
                <div key={i} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: s.color }} />
                  <span className={styles.pieLegendLabel}>{s.name}</span>
                  <span className={styles.pieLegendValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className={styles.activitySection}>
        <h2 className={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          Son Aktiviteler
        </h2>
        <div className={styles.activityList}>
          {dashboardData.recentActivity.map(a => (
            <div key={a.id} className={styles.activityItem}>
              <div className={styles.activityDot} style={{ background: a.color, boxShadow: `0 0 8px ${a.color}88` }} />
              <div className={styles.activityContent}>
                <span className={styles.activityText}>{a.text} <strong style={{ color: a.color }}>{a.highlight}</strong></span>
                <span className={styles.activityTime}>{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
