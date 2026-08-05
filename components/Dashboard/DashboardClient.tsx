'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import styles from './Dashboard.module.css';

/* Dynamic import for Leaflet (no SSR) */
const WaterMap = dynamic(() => import('./WaterMap'), { ssr: false, loading: () => <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div> });

/* ── Types ── */
interface MapMarker {
  id: string; location: string; lat: number; lng: number;
  riskScore: number; riskLevel: string; riskColor: string;
  lastMeasurement: string;
  params: { ph: number; turbidity: number; dissolvedO2: number; temperature: number };
}
interface MonthlyTrend { month: string; risk: number; reports: number; }
interface RegionData { region: string; count: number; color: string; }
interface StatusData { name: string; value: number; color: string; }
interface DashboardData {
  stats: { totalReports: number; pendingApproval: number; avgRiskScore: number; publishedThisMonth: number; totalReportsTrend: number; publishedTrend: number; };
  markers: MapMarker[];
  monthlyTrend: MonthlyTrend[];
  regionData: RegionData[];
  statusData: StatusData[];
  recentActivity: { id: string; text: string; highlight: string; time: string; color: string; }[];
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Dashboard yükleniyor…</p>
      </div>
    );
  }

  const riskColor = data.stats.avgRiskScore <= 30 ? '#00ff88' : data.stats.avgRiskScore <= 60 ? '#f59e0b' : '#ff4444';

  return (
    <div className={styles.dashboard}>
      {/* ── Stats Row ── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statAccent}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(0,212,255,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
            <div className={styles.statTrend}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              <span className={styles.trendUp}>+{data.stats.totalReportsTrend}%</span>
            </div>
          </div>
          <div className={styles.statValue}>{data.stats.totalReports}</div>
          <div className={styles.statLabel}>Toplam Rapor</div>
          <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: '78%', background: 'linear-gradient(90deg,#00b4d8,#00d4ff)' }} /></div>
        </div>

        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(245,158,11,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <span className={styles.badgeWarning}>Bekliyor</span>
          </div>
          <div className={styles.statValue}>{data.stats.pendingApproval}</div>
          <div className={styles.statLabel}>Bekleyen Onay</div>
          <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: '35%', background: 'linear-gradient(90deg,#cc8800,#f59e0b)' }} /></div>
        </div>

        <div className={`${styles.statCard} ${styles.statRisk}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: `${riskColor}18` }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={riskColor} strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <span className={styles.badgeSuccess} style={{ color: riskColor, background: `${riskColor}15`, borderColor: `${riskColor}33` }}>
              {data.stats.avgRiskScore <= 30 ? 'Düşük' : data.stats.avgRiskScore <= 60 ? 'Orta' : 'Yüksek'}
            </span>
          </div>
          <div className={styles.statValue} style={{ color: riskColor }}>{data.stats.avgRiskScore}</div>
          <div className={styles.statLabel}>Ortalama Risk Skoru</div>
          <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: `${data.stats.avgRiskScore}%`, background: `linear-gradient(90deg,${riskColor}88,${riskColor})` }} /></div>
        </div>

        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{ background: 'rgba(110,142,251,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <div className={styles.statTrend}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              <span className={styles.trendUp}>+{data.stats.publishedTrend}%</span>
            </div>
          </div>
          <div className={styles.statValue}>{data.stats.publishedThisMonth}</div>
          <div className={styles.statLabel}>Bu Ay Yayınlanan</div>
          <div className={styles.statBar}><div className={styles.statBarFill} style={{ width: '62%', background: 'linear-gradient(90deg,#5570d0,#6e8efb)' }} /></div>
        </div>
      </div>

      {/* ── Map Section ── */}
      <div className={styles.mapSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
              Su Kalitesi Haritası
            </h2>
            <span className={styles.sectionBadge}>{data.markers.length} izleme noktası</span>
          </div>
          <Link href="/harita" className={styles.viewAllBtn}>
            Tam Ekran →
          </Link>
        </div>
        <WaterMap markers={data.markers} />
        {/* Map legend */}
        <div className={styles.mapLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#00ff88' }} /> Düşük (0-30)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Orta (31-60)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ff6b35' }} /> Yüksek (61-80)</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ff4444' }} /> Kritik (81+)</span>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className={styles.chartsGrid}>
        {/* Line chart — Monthly risk trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              Aylık Risk Trendi
            </h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="risk" stroke="#00d4ff" strokeWidth={2.5} fill="url(#riskGrad)" name="Risk Skoru" />
                <Line type="monotone" dataKey="reports" stroke="#6e8efb" strokeWidth={2} dot={{ fill: '#6e8efb', r: 3 }} name="Rapor Sayısı" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart — Region breakdown */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="12" rx="1" /><rect x="17" y="4" width="4" height="16" rx="1" /></svg>
              Bölge Bazlı Raporlar
            </h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.regionData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="region" tick={{ fill: '#8892a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Rapor" radius={[6, 6, 0, 0]}>
                  {data.regionData.map((entry, i) => (
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
                  data={data.statusData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {data.statusData.map((s, i) => (
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
          {data.recentActivity.map(a => (
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
