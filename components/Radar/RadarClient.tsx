'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { IncidentCluster } from '@/lib/clustering';
import styles from './Radar.module.css';

const RadarMap = dynamic(() => import('./RadarMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Kümelenme haritası yükleniyor…</div>,
});

function isIncidentCluster(value: unknown): value is IncidentCluster {
  if (!value || typeof value !== 'object') return false;
  const cluster = value as Partial<IncidentCluster>;
  return typeof cluster.id === 'string' &&
    (cluster.risk === 'critical' || cluster.risk === 'high') &&
    typeof cluster.incidentCount === 'number' &&
    typeof cluster.category === 'string' &&
    Array.isArray(cluster.incidents) &&
    cluster.center !== undefined &&
    typeof cluster.center.lat === 'number' &&
    typeof cluster.center.lng === 'number';
}

export default function RadarClient() {
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/radar', { cache: 'no-store' });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = typeof result === 'object' && result !== null && 'error' in result &&
            typeof result.error === 'string' ? result.error : 'Radar verileri yüklenemedi.';
          throw new Error(message);
        }
        if (typeof result !== 'object' || result === null || !('clusters' in result) ||
            !Array.isArray(result.clusters)) {
          throw new Error('Radar servisinden geçersiz veri alındı.');
        }
        const clusterData: unknown[] = result.clusters;
        if (!clusterData.every(isIncidentCluster)) {
          throw new Error('Radar servisinden geçersiz veri alındı.');
        }
        if (active) {
          setClusters(clusterData);
          setSelectedId(current => current && clusterData.some(cluster => cluster.id === current)
            ? current
            : clusterData[0]?.id ?? null);
          setError(null);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Radar verileri yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const selected = useMemo(
    () => clusters.find(cluster => cluster.id === selectedId) ?? null,
    [clusters, selectedId],
  );
  const criticalCount = clusters.filter(cluster => cluster.risk === 'critical').length;
  const regions = [...new Set(clusters.map(cluster => cluster.regionLabel))];

  if (loading && clusters.length === 0) {
    return <div className={styles.state} role="status">Yerel ihbarlar analiz ediliyor…</div>;
  }

  return (
    <main className={styles.radar}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>YEREL VERİ · MEKÂNSAL ERKEN UYARI</p>
          <h1>Öngörücü Kirlilik Radarı</h1>
          <p>Gerçek ihbar kayıtlarındaki konum, zaman ve kategori ilişkileriyle tespit edilen kümeler.</p>
        </div>
        <Link href="/kanban" className={styles.secondaryLink}>Operasyon panosuna dön</Link>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.metrics} aria-label="Radar özeti">
        <article className={`${styles.metric} ${styles.metricPrimary}`}>
          <span>Aktif kümelenme</span>
          <strong>{clusters.length}</strong>
          <small>En az üç ilişkili ihbar</small>
        </article>
        <article className={styles.metric}>
          <span>Kritik havza alarmı</span>
          <strong>{criticalCount}</strong>
          <small>5+ ihbar veya uzman onaylı kritik risk</small>
        </article>
        <article className={styles.metric}>
          <span>Risk altındaki bölgeler</span>
          <strong>{regions.length}</strong>
          <small>İl/ilçe bilgisi yalnızca ihbarda varsa gösterilir</small>
        </article>
      </section>

      {clusters.length === 0 ? (
        <section className={styles.empty}>
          <span aria-hidden="true">◉</span>
          <h2>Şu anda aktif kümelenme yok</h2>
          <p>Radar, en az üç aynı kategorideki ihbarın 15 km ve 48 saat koşullarını birlikte sağlamasıyla uyarı oluşturur.</p>
          {loading && <small>Veriler arka planda yenileniyor.</small>}
        </section>
      ) : (
        <div className={styles.workspace}>
          <section className={styles.mapCard} aria-label="Aktif kirlilik kümeleri haritası">
            <div className={styles.cardHeading}>
              <div><h2>Aktif kirlilik kümeleri</h2><p>Bir kümeyi seçerek bağlı ihbarları inceleyin.</p></div>
              <span className={styles.liveBadge}>● Yerel SQLite</span>
            </div>
            <RadarMap clusters={clusters} selectedId={selectedId} onSelect={setSelectedId} />
            <div className={styles.legend}>
              <span><i className={styles.highDot} /> Yüksek risk</span>
              <span><i className={styles.criticalDot} /> Kritik alarm</span>
            </div>
          </section>

          <aside className={styles.detail} aria-live="polite">
            {selected ? (
              <>
                <p className={styles.eyebrow}>KÜME DETAYI</p>
                <span className={`${styles.riskBadge} ${selected.risk === 'critical' ? styles.critical : styles.high}`}>
                  {selected.label}
                </span>
                <h2>{selected.category}</h2>
                <p className={styles.region}>{selected.regionLabel}</p>
                <div className={styles.detailStats}>
                  <div><strong>{selected.incidentCount}</strong><span>ilişkili ihbar</span></div>
                  <div><strong>{(selected.radiusMeters / 1000).toFixed(1)} km</strong><span>küme yarıçapı</span></div>
                </div>
                <p className={styles.source}><strong>Tahmini kaynak tipi</strong>{selected.probableSource}</p>
                <div className={styles.recommendation}>
                  <strong>🚨 Acil müdahale tavsiyesi</strong>
                  <p>{selected.recommendation}</p>
                  <small>Algoritmik uyarıdır; tek başına doğrulanmış kirlilik kanıtı değildir.</small>
                </div>
                <h3>Kümedeki ihbarlar</h3>
                <ul className={styles.incidents}>
                  {selected.incidents.map(incident => (
                    <li key={incident.id}>
                      <div>
                        <strong>{incident.trackingCode || incident.title}</strong>
                        <span>{new Date(incident.reportedAt).toLocaleString('tr-TR')}</span>
                      </div>
                      <span className={styles.incidentRisk}>{incident.riskAssessed ? incident.riskLevel : 'Değerlendirilmedi'}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/kanban?incidentIds=${encodeURIComponent(selected.incidents.map(incident => incident.id).join(','))}`}
                  className={styles.primaryLink}
                >
                  Tüm Küme İhbarlarını İncele
                </Link>
              </>
            ) : (
              <p className={styles.selectHint}>Detaylarını görmek için haritadan bir küme seçin.</p>
            )}
          </aside>
        </div>
      )}
      <p className={styles.disclaimer}>Kümelenme, yalnızca gözlemsel ihbar kayıtlarının mekânsal ve zamansal benzerliğini gösterir; resmi analiz veya doğrulanmış kaynak tespiti değildir.</p>
    </main>
  );
}
