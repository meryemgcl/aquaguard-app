'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KanbanCard } from '@/lib/kanban-types';
import {
  cacheFieldIncident,
  enqueueFieldInspection,
  getCachedFieldIncidents,
  getOfflineInspectionQueue,
  synchronizeFieldQueue,
  type CachedFieldIncident,
  type QueuedFieldInspection,
} from '@/lib/offline-sync';
import type { FieldInspectionPayload } from '@/lib/field-inspection';
import { incidentPhotoSchema } from '@/lib/incident-validation';
import styles from './FieldClient.module.css';

type MeasurementField = 'ph' | 'dissolvedO2' | 'temperature' | 'conductivity' | 'turbidity';
type MeasurementValues = Partial<Record<MeasurementField, number>>;

const measurementInputs: Array<{
  key: MeasurementField;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: string;
}> = [
  { key: 'ph', label: 'pH Değeri', unit: 'pH', min: 0, max: 14, step: '0.1' },
  { key: 'dissolvedO2', label: 'Çözünmüş Oksijen', unit: 'mg/L', min: 0, max: 100, step: '0.1' },
  { key: 'temperature', label: 'Su Sıcaklığı', unit: '°C', min: -5, max: 100, step: '0.1' },
  { key: 'conductivity', label: 'İletkenlik', unit: 'µS/cm', min: 0, max: 1_000_000, step: '1' },
  { key: 'turbidity', label: 'Bulanıklık', unit: 'NTU', min: 0, max: 100_000, step: '0.1' },
];

function isCard(value: unknown): value is KanbanCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<KanbanCard>;
  return typeof card.id === 'string' &&
    typeof card.title === 'string' &&
    typeof card.description === 'string' &&
    typeof card.column === 'string' &&
    typeof card.createdAt === 'string' &&
    Array.isArray(card.photos);
}

function asCachedIncident(card: KanbanCard): Omit<CachedFieldIncident, 'cachedAt'> {
  return {
    id: card.id,
    trackingCode: card.trackingCode,
    title: card.title,
    description: card.description,
    coordinates: card.coordinates,
    location: card.location,
    province: card.province,
    district: card.district,
    category: card.incidentCategory,
    column: card.column,
    photos: card.photos,
    createdAt: card.createdAt,
  };
}

function validatePhotoDataUrl(value: string): void {
  const parsed = incidentPhotoSchema.safeParse(value);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Saha fotoğrafı geçersiz.');
}

function isQueuedItem(value: unknown): value is QueuedFieldInspection {
  if (!value || typeof value !== 'object') return false;
  return 'queueId' in value && typeof value.queueId === 'string' &&
    'incidentId' in value && typeof value.incidentId === 'string' &&
    'syncStatus' in value && value.syncStatus === 'Senkronizasyon Bekliyor';
}

export default function FieldClient() {
  const [incidents, setIncidents] = useState<KanbanCard[]>([]);
  const [cachedIncidents, setCachedIncidents] = useState<CachedFieldIncident[]>([]);
  const [queue, setQueue] = useState<QueuedFieldInspection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementValues>({});
  const [verdict, setVerdict] = useState<FieldInspectionPayload['verdict']>('confirmed');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const refreshBrowserStorage = useCallback(() => {
    setCachedIncidents(getCachedFieldIncidents());
    const storedQueue: unknown[] = getOfflineInspectionQueue();
    if (!storedQueue.every(isQueuedItem)) throw new Error('Bekleyen saha kayıtlarının biçimi geçersiz.');
    setQueue(storedQueue);
  }, [setCachedIncidents, setQueue]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    const initializeStorage = () => {
      try {
        refreshBrowserStorage();
      } catch (storageError) {
        setError(storageError instanceof Error ? storageError.message : 'Cihazdaki saha verileri okunamadı.');
      }
    };

    const scheduled = window.setTimeout(initializeStorage, 0);
    return () => {
      window.clearTimeout(scheduled);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [refreshBrowserStorage]);

  const loadQueue = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/saha/queue', { cache: 'no-store' });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof body === 'object' && body !== null && 'error' in body &&
          typeof body.error === 'string' ? body.error : 'Saha görevleri yüklenemedi.';
        throw new Error(detail);
      }
      if (typeof body !== 'object' || body === null || !('incidents' in body) ||
          !Array.isArray(body.incidents)) throw new Error('Saha görev yanıtının biçimi geçersiz.');
      const items: unknown[] = body.incidents;
      if (!items.every(isCard)) throw new Error('Saha görevleri beklenen biçimde değil.');
      setIncidents(items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Saha görevleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshQueue = () => {
      void loadQueue();
    };

    const startupTimer = window.setTimeout(refreshQueue, 0);
    const interval = window.setInterval(refreshQueue, 20000);
    return () => {
      window.clearTimeout(startupTimer);
      window.clearInterval(interval);
    };
  }, [loadQueue]);

  const allIncidents = useMemo(() => {
    const merged = new Map<string, KanbanCard | CachedFieldIncident>();
    for (const incident of incidents) merged.set(incident.id, incident);
    for (const cached of cachedIncidents) {
      if (!merged.has(cached.id)) merged.set(cached.id, cached);
    }
    for (const queued of queue) {
      if (!merged.has(queued.incidentId)) {
        const cached = cachedIncidents.find(item => item.id === queued.incidentId);
        if (cached) merged.set(cached.id, cached);
      }
    }
    return [...merged.values()];
  }, [cachedIncidents, incidents, queue]);

  const selected = allIncidents.find(incident => incident.id === selectedId) ?? null;
  const selectedIsFullCard = selected !== null && 'riskLevel' in selected;
  const selectedPhotos = selected?.photos ?? [];
  const queuedIds = new Set(queue.map(item => item.incidentId));

  const prepareOffline = (incident: KanbanCard | CachedFieldIncident) => {
    try {
      cacheFieldIncident(asCachedIncident(incident as KanbanCard));
      refreshBrowserStorage();
      setMessage(`${incident.trackingCode ?? incident.title} cihazda çevrimdışı kullanıma hazır.`);
      setError(null);
    } catch (storageError) {
      setError(storageError instanceof Error ? storageError.message : 'İhbar cihaza kaydedilemedi.');
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    try {
      if (photos.length + files.length > 4) throw new Error('En fazla 4 saha fotoğrafı ekleyebilirsiniz.');
      const added = await Promise.all(Array.from(files).map(file => new Promise<string>((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error('Sadece görüntü dosyaları eklenebilir.'));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Saha fotoğrafı okunamadı.'));
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Saha fotoğrafı base64 biçimine dönüştürülemedi.'));
            return;
          }
          try {
            validatePhotoDataUrl(reader.result);
            resolve(reader.result);
          } catch (photoError) {
            reject(photoError);
          }
        };
        reader.readAsDataURL(file);
      })));
      setPhotos(current => [...current, ...added]);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Saha fotoğrafları eklenemedi.');
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const syncNow = async () => {
    if (!online || !queue.length || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const result = await synchronizeFieldQueue();
      refreshBrowserStorage();
      await loadQueue();
      setMessage(`${result.synced} saha kaydı yerel SQLite ile senkronize edildi.`);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Saha kayıtları senkronize edilemedi.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!online) return;
    const syncQueued = async () => {
      const pending = getOfflineInspectionQueue();
      if (pending.length === 0) return;
      setSyncing(true);
      try {
        const result = await synchronizeFieldQueue();
        refreshBrowserStorage();
        await loadQueue();
        setMessage(`${result.synced} saha kaydı yerel SQLite ile senkronize edildi.`);
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : 'Saha kayıtları senkronize edilemedi.');
      } finally {
        setSyncing(false);
      }
    };
    void syncQueued();
  }, [online, loadQueue, refreshBrowserStorage]);

  const submitInspection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || submitting || queuedIds.has(selected.id)) return;
    const cleanNote = note.trim();
    if (cleanNote.length < 10) {
      setError('Saha gözlemi en az 10 karakter olmalıdır.');
      return;
    }
    const payload: FieldInspectionPayload = {
      incidentId: selected.id,
      verdict,
      note: cleanNote,
      measurements,
      photos,
      submittedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    setError(null);
    try {
      if (!navigator.onLine) {
        enqueueFieldInspection(payload);
        refreshBrowserStorage();
        setMessage('Saha kaydı cihazda güvenle saklandı. Bağlantı sağlandığında eşitlenecek.');
      } else {
        const response = await fetch('/api/saha/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspections: [payload] }),
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          const detail = typeof result === 'object' && result !== null && 'error' in result &&
            typeof result.error === 'string' ? result.error : 'Saha kaydı kaydedilemedi.';
          throw new Error(detail);
        }
        setMessage('Saha ölçümü ve inceleme SQLite kaydına eklendi.');
      }
      setSelectedId(null);
      setMeasurements({});
      setVerdict('confirmed');
      setNote('');
      setPhotos([]);
      await loadQueue();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Saha kaydı gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.field}>
      <div className={`${styles.connectionBanner} ${online ? styles.online : styles.offline}`} role="status">
        <strong>{online ? '🟢 Çevrimiçi (Sistem Bağlantısı Aktif)' : '🔴 Çevrimdışı Saha Modu (Ölçümler cihazınızda güvenle saklanıyor)'}</strong>
        <div className={styles.queueControls}>
          {queue.length > 0 && <span className={styles.queueBadge}>Bekleyen {queue.length} Saha Kaydı</span>}
          {queue.length > 0 && (
            <button type="button" onClick={() => void syncNow()} disabled={!online || syncing}>
              {syncing ? 'Senkronize ediliyor…' : '🔄 Şimdi Senkronize Et'}
            </button>
          )}
        </div>
      </div>

      <header className={styles.header}>
        <div><p className={styles.eyebrow}>TABLET / SAHA MODU</p><h1>Aktif Saha Görevleri</h1>
          <p>Görevleri önceden cihaza indirin; ölçüm ve gözlemlerinizi bağlantı olmadan da kaydedin.</p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => void loadQueue()} disabled={!online}>
          Görevleri Yenile
        </button>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <div className={styles.layout}>
        <section className={styles.queuePanel} aria-label="Saha görevleri">
          <h2>Görev kuyruğu <span>{allIncidents.length}</span></h2>
          {loading && allIncidents.length === 0 ? <p className={styles.empty}>Görevler yükleniyor…</p>
            : allIncidents.length === 0 ? <p className={styles.empty}>Şu anda sahada incelenecek ihbar bulunmuyor.</p>
              : allIncidents.map(incident => {
                const cached = cachedIncidents.some(item => item.id === incident.id);
                const pending = queuedIds.has(incident.id);
                return (
                  <article className={`${styles.taskCard} ${selectedId === incident.id ? styles.selectedTask : ''}`} key={incident.id}>
                    <button className={styles.taskSelect} type="button" onClick={() => {
                      setSelectedId(incident.id);
                      setMeasurements({});
                      setNote('');
                      setPhotos([]);
                      setMessage(null);
                    }}>
                      <strong>{incident.trackingCode ?? 'Takip kodu yok'}</strong>
                      <span className={styles.taskTitle}>{incident.title}</span>
                      <span>{incident.district || incident.province || incident.location}</span>
                      <span className={styles.taskStatus}>{incident.column === 'yeni' ? 'Yeni ihbar' : 'Uzman incelemesinde'}</span>
                    </button>
                    <button type="button" className={styles.downloadButton} onClick={() => prepareOffline(incident)} disabled={cached}>
                      {cached ? '✓ Cihaza indirildi' : 'Cihaza İndir / Çevrimdışı Hazırla'}
                    </button>
                    {pending && <span className={styles.pendingLabel}>Senkronizasyon Bekliyor</span>}
                  </article>
                );
              })}
        </section>

        <section className={styles.formPanel} aria-label="Saha inceleme formu">
          {!selected ? (
            <div className={styles.formEmpty}><span aria-hidden="true">⌖</span><h2>Bir görev seçin</h2><p>İnceleme ve saha ölçümü formunu açmak için görev kartına dokunun.</p></div>
          ) : queuedIds.has(selected.id) ? (
            <div className={styles.formEmpty}><span aria-hidden="true">✓</span><h2>Senkronizasyon bekliyor</h2><p>Bu ihbarın saha kaydı cihazda güvenle saklanıyor.</p></div>
          ) : (
            <>
              <header className={styles.formHeader}>
                <div><p>SAHA İNCELEMESİ</p><h2>{selected.title}</h2>
                  <span>{selected.trackingCode ?? selected.id} · {selected.district || selected.province || selected.location}</span>
                </div>
                {selectedIsFullCard && (
                  <button type="button" className={styles.smallDownload} onClick={() => prepareOffline(selected)}>
                    Cihaza İndir
                  </button>
                )}
              </header>
              {selected.coordinates && (
                <p className={styles.coordinates}>GPS: {selected.coordinates.lat.toFixed(6)}, {selected.coordinates.lng.toFixed(6)}</p>
              )}
              <p className={styles.description}>{selected.description}</p>
              {selectedPhotos.length > 0 && (
                <section className={styles.citizenEvidence}>
                  <h3>Vatandaş kanıt fotoğrafları</h3>
                  <div className={styles.photoGrid}>
                    {selectedPhotos.map((photo, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${selected.id}-evidence-${index}`} src={photo} alt={`Vatandaş kanıtı ${index + 1}`} />
                    ))}
                  </div>
                </section>
              )}
              <form onSubmit={submitInspection}>
                <fieldset className={styles.measurements}>
                  <legend>Saha ölçümleri <span>(isteğe bağlı)</span></legend>
                  {measurementInputs.map(input => (
                    <label key={input.key}>
                      <span>{input.label}<small>{input.unit}</small></span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        value={measurements[input.key] ?? ''}
                        onChange={event => setMeasurements(current => {
                          const next = { ...current };
                          if (event.target.value === '') delete next[input.key];
                          else next[input.key] = Number(event.target.value);
                          return next;
                        })}
                        aria-label={`${input.label} (${input.unit})`}
                      />
                    </label>
                  ))}
                </fieldset>

                <section className={styles.photoSection}>
                  <h3>Saha fotoğrafları <span>(en fazla 4)</span></h3>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={event => void addPhotos(event.target.files)} />
                  {photos.length > 0 && (
                    <div className={styles.photoGrid}>
                      {photos.map((photo, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`field-photo-${index}`} src={photo} alt={`Saha fotoğrafı ${index + 1}`} />
                      ))}
                    </div>
                  )}
                </section>

                <fieldset className={styles.verdicts}>
                  <legend>Uzman saha kararı</legend>
                  <label className={verdict === 'confirmed' ? styles.verdictSelected : ''}>
                    <input type="radio" name="verdict" value="confirmed" checked={verdict === 'confirmed'} onChange={() => setVerdict('confirmed')} />
                    <span>⚠️ Kirlilik doğrulandı — acil müdahale gerekli</span>
                  </label>
                  <label className={verdict === 'not_confirmed' ? styles.verdictSelected : ''}>
                    <input type="radio" name="verdict" value="not_confirmed" checked={verdict === 'not_confirmed'} onChange={() => setVerdict('not_confirmed')} />
                    <span>✓ Doğal tortu — kirlilik doğrulanmadı</span>
                  </label>
                </fieldset>

                <label className={styles.noteLabel} htmlFor="field-note">Ayrıntılı saha gözlemi</label>
                <textarea id="field-note" minLength={10} maxLength={3000} required value={note} onChange={event => setNote(event.target.value)} placeholder="Gözlem, numune koşulları ve alınan saha aksiyonlarını yazın…" rows={5} />
                <p className={styles.characterCount}>{note.trim().length}/3000 karakter · en az 10</p>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Kaydediliyor…' : online ? 'Saha İncelemesini Kaydet' : 'Cihaza Kaydet · Sonra Senkronize Et'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
