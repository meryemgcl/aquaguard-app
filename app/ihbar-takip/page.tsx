'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  publicIncidentTrackingSchema,
  trackingCodeSchema,
} from '@/lib/incident-validation';
import type { PublicIncidentTrackingData } from '@/lib/incident-validation';
import styles from './page.module.css';

export default function PublicIncidentTrackingPage() {
  const [trackingCode, setTrackingCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const code = params.get('kod') ?? params.get('code');
    return code ? code.toUpperCase() : '';
  });
  const [incident, setIncident] = useState<PublicIncidentTrackingData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const findIncident = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIncident(null);

    const parsedCode = trackingCodeSchema.safeParse(trackingCode);
    if (!parsedCode.success) {
      setError(parsedCode.error.issues[0]?.message ?? 'Takip kodunu kontrol edin.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/public/incidents/${encodeURIComponent(parsedCode.data)}`, {
        cache: 'no-store',
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'İhbar bilgisi alınamadı.';
        throw new Error(message);
      }
      const payload = typeof body === 'object' && body !== null && 'incident' in body
        ? publicIncidentTrackingSchema.safeParse(body.incident)
        : null;
      if (!payload?.success) throw new Error('İhbar bilgisi beklenen biçimde alınamadı.');
      setIncident(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İhbar sorgulanamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>AquaGuard · İhbar durumu</p>
        <h1>İhbarınızı takip edin</h1>
        <p>İhbar gönderirken aldığınız takip kodunu girerek son durumu görüntüleyin.</p>
      </header>

      <form className={styles.lookupForm} onSubmit={findIncident}>
        <label htmlFor="tracking-code">Takip kodu</label>
        <div className={styles.inputRow}>
          <input
            id="tracking-code"
            value={trackingCode}
            onChange={event => setTrackingCode(event.target.value.toUpperCase())}
            placeholder="AG-2026-ABCDE"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={13}
            aria-describedby={error ? 'tracking-error' : 'tracking-help'}
            aria-invalid={!!error}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sorgulanıyor…' : 'İhbarı Bul'}
          </button>
        </div>
        <span id={error ? 'tracking-error' : 'tracking-help'} className={error ? styles.error : styles.help} role={error ? 'alert' : undefined}>
          {error || 'Örnek: AG-2026-ABCDE'}
        </span>
      </form>

      {incident && (
        <section className={styles.result} aria-labelledby="incident-result-title" aria-live="polite">
          <div className={styles.resultHeader}>
            <div>
              <p className={styles.code}>{incident.trackingCode}</p>
              <h2 id="incident-result-title">{incident.title}</h2>
              <p>{incident.category} · {incident.addressText}</p>
            </div>
            <span className={`${styles.status} ${['reddedildi', 'gecersiz_ihbar', 'kapatildi'].includes(incident.status) ? styles.rejected : ''}`}>
              {incident.statusLabel}
            </span>
          </div>

          <p className={styles.dates}>
            Bildirim: {new Date(incident.reportedAt).toLocaleString('tr-TR')}
            {' · '}Son güncelleme: {new Date(incident.updatedAt).toLocaleString('tr-TR')}
          </p>

          <ol className={styles.timeline} aria-label="İhbar işlem adımları">
            {incident.timeline.map((step, index) => (
              <li className={`${styles.timelineStep} ${step.completed ? styles.stepComplete : ''}`} key={`${index}-${step.label}`}>
                <span className={styles.stepMarker} aria-hidden="true">{step.completed ? '✓' : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  {step.timestamp && <time dateTime={step.timestamp}>{new Date(step.timestamp).toLocaleString('tr-TR')}</time>}
                </div>
              </li>
            ))}
          </ol>

          {incident.officialNote && (
            <aside className={`${styles.officialNote} ${['reddedildi', 'gecersiz_ihbar', 'kapatildi'].includes(incident.status) ? styles.rejectedNote : ''}`}>
              <h3>{['reddedildi', 'gecersiz_ihbar', 'kapatildi'].includes(incident.status) ? 'İnceleme sonucu ve gerekçe' : 'Yetkili yanıtı'}</h3>
              <p>{incident.officialNote}</p>
            </aside>
          )}
        </section>
      )}

      <footer className={styles.footer}>
        <Link href="/ihbar">Yeni bir ihbar bildir</Link>
        <span>Takip kodu kişisel bir anahtardır; başkalarıyla paylaşmayın.</span>
      </footer>
    </main>
  );
}
