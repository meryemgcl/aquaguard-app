'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmbedMapIncident } from '@/lib/open-data';
import styles from './EmbedMapPage.module.css';

const PublicMap = dynamic(() => import('./PublicMap'), {
  ssr: false,
  loading: () => <div className={styles.state}>Harita yükleniyor…</div>,
});

function isEmbedIncident(value: unknown): value is EmbedMapIncident {
  if (!value || typeof value !== 'object') return false;
  const incident = value as Partial<EmbedMapIncident>;
  return typeof incident.trackingCode === 'string' &&
    typeof incident.title === 'string' &&
    typeof incident.category === 'string' &&
    typeof incident.riskLevel === 'string' &&
    typeof incident.latitude === 'number' &&
    typeof incident.longitude === 'number' &&
    typeof incident.reportedAt === 'string' &&
    (incident.status === 'yayinda' || incident.status === 'cozuldu') &&
    (incident.photo === null || typeof incident.photo === 'string');
}

export default function EmbedMapPage() {
  const [incidents, setIncidents] = useState<EmbedMapIncident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/embed/harita', { cache: 'no-store' });
        const result: unknown = await response.json();
        if (!response.ok || typeof result !== 'object' || result === null ||
            !('incidents' in result) || !Array.isArray(result.incidents)) {
          throw new Error('Yayımlanmış harita verileri alınamadı.');
        }
        const items: unknown[] = result.incidents;
        if (!items.every(isEmbedIncident)) throw new Error('Harita verilerinin biçimi geçersiz.');
        if (active) {
          setIncidents(items);
          setError(null);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Harita verileri alınamadı.');
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className={styles.embed}>
      {error ? <div className={styles.state} role="alert">{error}</div> : <PublicMap incidents={incidents} />}
      <div className={styles.badge}>AquaGuard Şeffaf Su İzleme Ağı</div>
    </main>
  );
}
