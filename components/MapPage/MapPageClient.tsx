'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { KanbanCard } from '@/lib/kanban-types';
import { filterIncidentMapMarkers, toIncidentMapMarker } from '@/lib/incident-map';
import type { IncidentMapMarker } from '@/lib/incident-map';
import type { WaterIncidentCategory } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import IncidentMapFilters from './IncidentMapFilters';
import styles from './MapPage.module.css';
import { trackEvent } from '@/lib/mixpanel';
import OpenDataExportMenu from '@/components/OpenData/OpenDataExportMenu';
import EmbedMapDialog from './EmbedMapDialog';

const WaterMap = dynamic(() => import('@/components/Dashboard/WaterMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div>,
});

const statusLabels: Record<IncidentMapMarker['status'], string> = {
  yeni_ihbar: 'Yeni ihbar',
  uzman_incelemesinde: 'Uzman incelemesinde',
  dogrulandi: 'Doğrulandı',
  yonetici_onayinda: 'Yönetici onayında',
  yayinda: 'Yayında',
  reddedildi: 'Reddedildi',
  gecersiz_ihbar: 'Geçersiz ihbar',
  kapatildi: 'Kapatıldı',
};

export default function MapPageClient() {
  const { user } = useAuth();
  const [reportMarkers, setReportMarkers] = useState<IncidentMapMarker[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [filter, setFilter]               = useState<'all' | 'low' | 'medium' | 'high' | 'critical' | 'unassessed'>('all');
  const [category, setCategory] = useState<WaterIncidentCategory | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);

  /* The API returns all workflow states to staff and published events to citizens. */
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/reports', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Raporlar yüklenemedi.');
        if (active) setLoadError(null);
        const markers = (data.cards as KanbanCard[]).flatMap(card => {
          const marker = toIncidentMapMarker(card);
          return marker ? [marker] : [];
        });
        if (active) setReportMarkers(markers);
      } catch (error) {
        console.error('Yerel raporlar yüklenemedi:', error);
        if (active) setLoadError(error instanceof Error ? error.message : 'Raporlar yüklenemedi.');
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
  }, []);

  const markers = filterIncidentMapMarkers(reportMarkers, {
    category,
    dateFrom,
    dateTo,
    publishedOnly: publishedOnly || user?.role === 'halk',
  });
  const filtered = filter === 'all' ? markers : markers.filter(marker => marker.riskLevel === filter);

  const counts = {
    all:      markers.length,
    low:      markers.filter(m => m.riskLevel === 'low').length,
    medium:   markers.filter(m => m.riskLevel === 'medium').length,
    high:     markers.filter(m => m.riskLevel === 'high').length,
    critical: markers.filter(m => m.riskLevel === 'critical').length,
    unassessed: markers.filter(m => m.riskLevel === 'unassessed').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            İnteraktif Su Kalitesi Haritası
          </h1>
          <p className={styles.pageSubtitle}>
            Haritada {markers.length} filtreyle eşleşen konumlu olay
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.embedButton} onClick={() => setEmbedDialogOpen(true)}>
            🌐 Sitenize Ekleyin (Embed)
          </button>
          <OpenDataExportMenu allowAllRecords={user?.role !== 'halk'} />
        </div>
        <div className={styles.filterBar}>
          {(['all', 'low', 'medium', 'high', 'critical', 'unassessed'] as const).map(f => {
            const labels: Record<string, string> = {
              all: 'Tümü', low: '🔵 Düşük', medium: '🟡 Orta', high: '🟠 Yüksek', critical: '🔴 Kritik', unassessed: 'Değerlendirilmemiş',
            };
            return (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                aria-pressed={filter === f}
                onClick={() => { setFilter(f); trackEvent('Map_Filter_Used', { filterLevel: f }); }}
              >
                {labels[f]}
                <span className={styles.filterCount}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.advancedFilters}>
          <IncidentMapFilters
            category={category}
            onCategoryChange={setCategory}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            publishedOnly={publishedOnly}
            onPublishedOnlyChange={setPublishedOnly}
            allowAllStatuses={user?.role !== 'halk'}
          />
        </div>
      </div>

      <div className={styles.mapContainer}>
        {loading && reportMarkers.length === 0 ? (
          <div className={styles.mapLoading}>🗺️ Harita yükleniyor…</div>
        ) : loadError ? (
          <div className={styles.mapLoading} role="alert">{loadError}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.mapLoading}>Seçili filtrelerle haritada gösterilecek olay yok.</div>
        ) : (
          <WaterMap markers={filtered} height="100%" zoom={6.5} />
        )}
      </div>
      <EmbedMapDialog open={embedDialogOpen} onClose={() => setEmbedDialogOpen(false)} />

      {/* Side panel */}
      <div className={styles.sidePanel}>
        {filtered.length === 0 && !loading && !loadError
          ? <div className={styles.mapLoading} role="status">Bu risk filtresinde gösterilecek rapor yok.</div>
          : filtered.map(m => (
          <div key={m.id} className={styles.markerCard}>
            <div className={styles.markerTop}>
              <span className={styles.markerLoc}>
                📍 {m.location}
              </span>
              <span
                className={styles.markerScore}
                style={{ color: m.riskColor, borderColor: `${m.riskColor}44`, background: `${m.riskColor}12` }}
              >
                {m.riskScore === null ? 'Değerlendirilmedi' : m.riskScore}
              </span>
            </div>
            {m.title && (
              <div style={{ fontSize: '11px', color: '#8892a8', marginBottom: '6px', fontStyle: 'italic' }}>
                📋 {m.title}
              </div>
            )}
            <span className={styles.markerDate}>{m.category} · {statusLabels[m.status]}</span>
            {m.params
              ? <div className={styles.markerParams}>
                  <span>🧪 pH: {m.params.ph ?? '—'}</span>
                  <span>💨 O₂: {m.params.dissolvedO2 ?? '—'} mg/L</span>
                  <span>🌫️ {m.params.turbidity ?? '—'} NTU</span>
                  <span>🌡️ {m.params.temperature ?? '—'}°C</span>
                </div>
              : <div className={styles.markerParams}>Ölçüm verisi eklenmemiş.</div>}
            <span className={styles.markerDate}>📅 Rapor tarihi: {m.reportedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
