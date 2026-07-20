'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from './MapPage.module.css';

const WaterMap = dynamic(() => import('@/components/Dashboard/WaterMap'), { ssr: false, loading: () => <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div> });

interface MapMarker {
  id: string; location: string; lat: number; lng: number;
  riskScore: number; riskLevel: string; riskColor: string;
  lastMeasurement: string;
  params: { ph: number; turbidity: number; dissolvedO2: number; temperature: number };
}

export default function MapPageClient() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setMarkers(d.data.markers); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? markers : markers.filter(m => m.riskLevel === filter);

  const counts = {
    all: markers.length,
    low: markers.filter(m => m.riskLevel === 'low').length,
    medium: markers.filter(m => m.riskLevel === 'medium').length,
    high: markers.filter(m => m.riskLevel === 'high').length,
    critical: markers.filter(m => m.riskLevel === 'critical').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
            İnteraktif Su Kalitesi Haritası
          </h1>
          <p className={styles.pageSubtitle}>Türkiye genelindeki {markers.length} izleme noktası</p>
        </div>
        <div className={styles.filterBar}>
          {(['all', 'low', 'medium', 'high', 'critical'] as const).map(f => {
            const labels: Record<string, string> = { all: 'Tümü', low: '🟢 Düşük', medium: '🟡 Orta', high: '🟠 Yüksek', critical: '🔴 Kritik' };
            return (
              <button key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                onClick={() => setFilter(f)}>
                {labels[f]}
                <span className={styles.filterCount}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.mapContainer}>
        {loading ? (
          <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div>
        ) : (
          <WaterMap markers={filtered} height="100%" zoom={6.5} />
        )}
      </div>

      {/* Side panel */}
      <div className={styles.sidePanel}>
        {filtered.map(m => (
          <div key={m.id} className={styles.markerCard}>
            <div className={styles.markerTop}>
              <span className={styles.markerLoc}>📍 {m.location}</span>
              <span className={styles.markerScore} style={{ color: m.riskColor, borderColor: `${m.riskColor}44`, background: `${m.riskColor}12` }}>
                {m.riskScore}
              </span>
            </div>
            <div className={styles.markerParams}>
              <span>🧪 pH: {m.params.ph}</span>
              <span>💨 O₂: {m.params.dissolvedO2}</span>
              <span>🌫️ {m.params.turbidity} NTU</span>
              <span>🌡️ {m.params.temperature}°C</span>
            </div>
            <span className={styles.markerDate}>📅 {m.lastMeasurement}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
