'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { KanbanCard, RISK_CONFIG, COLUMNS } from '@/lib/kanban-types';
import type { RiskLevel } from '@/lib/kanban-types';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import styles from './ApprovalModal.module.css';

const IncidentLocationPreview = dynamic(() => import('./IncidentLocationPreview'), {
  ssr: false,
  loading: () => <div style={{ height: 180, display: 'grid', placeItems: 'center' }}>Konum haritası yükleniyor…</div>,
});

interface Props {
  card: KanbanCard;
  onClose: () => void;
  onWorkflowUpdated: () => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const COL_LABELS: Record<string, string> = {
  yeni_ihbar: 'Yeni ihbar',
  uzman_incelemesinde: 'Uzman değerlendirmesinde',
  yonetici_onayinda: 'Yönetici onayında',
  yayinda: 'Kamuya açık',
  gecersiz_ihbar: 'Geçersiz ihbar',
  kapatildi: 'Kapatıldı',
  reddedildi: 'Reddedildi',
};

const riskScoreByLevel: Record<RiskLevel, number> = {
  low: 15,
  medium: 45,
  high: 70,
  critical: 90,
};

export default function CardDetailModal({ card, onClose, onWorkflowUpdated }: Props) {
  const { user } = useAuth();
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(card.riskAssessed ? card.riskLevel : 'medium');
  const [riskScore, setRiskScore] = useState(card.riskScore || card.aiRiskScore || 45);
  const [acceptAiSuggestion, setAcceptAiSuggestion] = useState(false);
  const [measurements, setMeasurements] = useState<Partial<NonNullable<KanbanCard['measurements']>>>(card.measurements ?? {});
  const [expertNote, setExpertNote] = useState(card.expertNotes ?? '');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const canPerformExpertReview = user?.role === 'uzman' || user?.role === 'admin' || user?.role === 'super_admin';
  const managerDecision = [...card.auditTrail].reverse().find(event =>
    event.role === 'yonetici' && ['yayinda', 'kapatildi', 'reddedildi'].includes(event.newStatus),
  );
  const risk = card.riskAssessed
    ? RISK_CONFIG[card.riskLevel]
    : { label: 'Değerlendirilmedi', color: '#8892a8', bg: 'rgba(136,146,168,0.12)' };
  const colMeta = COLUMNS.find(c => c.id === card.column);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvidence = async () => {
      try {
        const response = await fetch(`/api/kanban/${encodeURIComponent(card.id)}/evidence`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Kanıt fotoğrafları yüklenemedi.';
          throw new Error(message);
        }
        if (typeof body !== 'object' || body === null || !('photos' in body) ||
            !Array.isArray(body.photos) || !body.photos.every(photo => typeof photo === 'string')) {
          throw new Error('Kanıt fotoğrafları geçersiz biçimde döndü.');
        }
        setPhotos(body.photos);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setEvidenceError(error instanceof Error ? error.message : 'Kanıt fotoğrafları yüklenemedi.');
      } finally {
        setEvidenceLoading(false);
      }
    };
    void loadEvidence();
    return () => controller.abort();
  }, [card.id]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const submitWorkflow = async (action: 'start' | 'save' | 'forward' | 'invalid') => {
    setReviewBusy(true);
    setReviewError('');
    try {
      const response = await fetch('/api/kanban/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'start'
          ? { action, cardId: card.id }
          : {
              action,
              cardId: card.id,
              riskScore,
              riskLevel,
              acceptedAiSuggestion: acceptAiSuggestion,
              measurements,
              note: expertNote,
            }),
      });
      const body: unknown = await response.json();
      const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Uzman iş akışı güncellenemedi.';
      if (!response.ok) throw new Error(message);
      onWorkflowUpdated();
      onClose();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Uzman iş akışı güncellenemedi.');
    } finally {
      setReviewBusy(false);
    }
  };

  const setMeasurement = (key: keyof NonNullable<KanbanCard['measurements']>, value: string) => {
    setMeasurements(current => {
      if (!value) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: Number(value) };
    });
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop} role="dialog" aria-modal>
      <div className={styles.detailModal}>
        {/* Header */}
        <div className={styles.detailHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: colMeta?.color, background: `${colMeta?.color}15`, border: `1px solid ${colMeta?.color}30`, padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                {colMeta?.icon} {colMeta?.label}
              </span>
              <span style={{ fontSize: '0.7rem', color: risk.color, background: risk.bg, border: `1px solid ${risk.color}33`, padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
                {card.riskAssessed ? `Uzman risk değerlendirmesi: ${card.riskScore}/100 — ${risk.label}` : 'Uzman risk değerlendirmesi bekleniyor'}
              </span>
            </div>
            <h2 className={styles.detailTitle}>{card.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="no-print"
              onClick={() => window.print()}
              disabled={evidenceLoading}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center'
              }}
            >
              📄 {evidenceLoading ? 'Kanıt yükleniyor…' : 'Resmi Tutanak Yazdır / PDF İndir'}
            </button>
            <button className={`${styles.closeBtn} no-print`} onClick={onClose} aria-label="Kapat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className={styles.detailScroll}>
          {/* Meta grid */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>📍 Konum</div>
              <div className={styles.metaValue}>{card.location}</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Olay türü</div>
              <div className={styles.metaValue}>{card.incidentCategory}</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>📅 Oluşturulma</div>
              <div className={styles.metaValue}>{formatDate(card.createdAt)}</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>👤 Sorumlu</div>
              <div className={styles.metaValue} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: `linear-gradient(135deg,${card.assignee.color},#0a0f1e)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff' }}>
                  {card.assignee.initials}
                </span>
                {card.assignee.name}
              </div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>🔄 Son Güncelleme</div>
              <div className={styles.metaValue}>{formatDate(card.updatedAt)}</div>
            </div>
          </div>

          {/* Tags */}
          {card.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {card.tags.map(t => (
                <span key={t} style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'rgba(110,142,251,0.08)', border: '1px solid rgba(110,142,251,0.18)', borderRadius: '6px', color: '#6e8efb', fontWeight: 500 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className={styles.descSection}>{card.description}</div>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-primary)' }}>Kanıt ve konum</h3>
            {evidenceError ? <p role="alert" style={{ color: 'var(--danger)' }}>{evidenceError}</p> : photos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
                {photos.map((photo, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${card.id}-photo-${index}`} src={photo} alt={`İhbar fotoğrafı ${index + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)' }}>Fotoğraf kanıtı eklenmemiş.</p>}
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {card.coordinates
                ? `Koordinat: ${card.coordinates.lat.toFixed(6)}, ${card.coordinates.lng.toFixed(6)}`
                : 'Koordinat bilgisi bulunmuyor.'}
            </p>
            {card.coordinates && <IncidentLocationPreview coordinates={card.coordinates} />}
          </section>

          {canPerformExpertReview && card.column === 'yeni' && (
            <section style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
              <h3 style={{ marginTop: 0 }}>Uzman incelemesi</h3>
              <p>İncelemeyi başlattığınızda ihbar uzman değerlendirme kuyruğuna alınır.</p>
              {reviewError && <p role="alert" style={{ color: 'var(--danger)' }}>{reviewError}</p>}
              <button type="button" className="btn btn-primary" disabled={reviewBusy} onClick={() => void submitWorkflow('start')}>
                {reviewBusy ? 'Kaydediliyor…' : 'İncelemeyi Başlat'}
              </button>
            </section>
          )}

          {canPerformExpertReview && card.column === 'onay-uzman' && (
            <section style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
              <h3 style={{ marginTop: 0 }}>Uzman değerlendirmesi</h3>
              <div style={{ padding: 12, marginBottom: 12, borderRadius: 8, background: 'var(--bg-input)' }}>
                <strong>Yerel AI risk önerisi (kural tabanlı): </strong>
                {card.aiRiskScore === null ? 'Öneri yok' : `${card.aiRiskScore}/100 — ${RISK_CONFIG[card.aiRiskScore < 30 ? 'low' : card.aiRiskScore < 60 ? 'medium' : card.aiRiskScore < 80 ? 'high' : 'critical'].label}`}
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Karar desteğidir; yayımlama ve risk sınıflandırması uzman/yönetici onayına bağlıdır.</p>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input type="checkbox" checked={acceptAiSuggestion} onChange={event => setAcceptAiSuggestion(event.target.checked)} disabled={card.aiRiskScore === null} />
                Yerel AI önerisini kabul et
              </label>
              {!acceptAiSuggestion && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <label>Uzman risk düzeyi
                    <select value={riskLevel} onChange={event => {
                      const selected = event.target.value as RiskLevel;
                      setRiskLevel(selected);
                      setRiskScore(riskScoreByLevel[selected]);
                    }}>
                      {Object.entries(RISK_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                    </select>
                  </label>
                  <label>Uzman risk skoru (0–100)
                    <input type="number" min="0" max="100" value={riskScore} onChange={event => {
                      const value = Number(event.target.value);
                      setRiskScore(value);
                      setRiskLevel(value < 30 ? 'low' : value < 60 ? 'medium' : value < 80 ? 'high' : 'critical');
                    }} />
                  </label>
                </div>
              )}
              <h4>Su ölçümleri (isteğe bağlı)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
                <label>pH
                  <input type="number" min="0" max="14" step="0.1" value={measurements.ph ?? ''} onChange={event => setMeasurement('ph', event.target.value)} />
                </label>
                <label>Bulanıklık (NTU)
                  <input type="number" min="0" step="0.1" value={measurements.turbidity ?? ''} onChange={event => setMeasurement('turbidity', event.target.value)} />
                </label>
                <label>Çözünmüş O₂ (mg/L)
                  <input type="number" min="0" max="100" step="0.1" value={measurements.dissolvedO2 ?? ''} onChange={event => setMeasurement('dissolvedO2', event.target.value)} />
                </label>
                <label>Sıcaklık (°C)
                  <input type="number" min="-5" max="100" step="0.1" value={measurements.temperature ?? ''} onChange={event => setMeasurement('temperature', event.target.value)} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>Teknik not
                <textarea value={expertNote} maxLength={2000} rows={4} onChange={event => setExpertNote(event.target.value)} />
              </label>
              {reviewError && <p role="alert" style={{ color: 'var(--danger)' }}>{reviewError}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button type="button" disabled={reviewBusy} onClick={() => void submitWorkflow('save')}>Değerlendirmeyi Kaydet</button>
                <button type="button" className="btn btn-primary" disabled={reviewBusy} onClick={() => void submitWorkflow('forward')}>Yönetici Onayına İlet</button>
                <button type="button" disabled={reviewBusy || expertNote.trim().length < 10} onClick={() => void submitWorkflow('invalid')}>Geçersiz İhbar Olarak Kapat</button>
              </div>
            </section>
          )}

          {/* Measurements and Educational Tooltips */}
          {card.measurements && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                Kaydedilmiş ölçüm değerleri
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PH DEĞERİ</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>{card.measurements.ph}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>İdeal:</strong> 6.5 - 8.5 <br/>Sınır aşımı asiditeyi artırır, canlıları tehdit eder.
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BULANIKLIK</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>{card.measurements.turbidity} NTU</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>İdeal:</strong> &lt; 5 NTU <br/>Berraklık düşerse bitki fotosentezi durur.
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ÇÖZÜNMÜŞ O₂</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>{card.measurements.dissolvedO2} mg/L</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>İdeal:</strong> &gt; 5 mg/L <br/>Oksijen eksikliği toplu balık ölümlerine yol açar.
                  </div>
                </div>
                      </div>
            </div>
          )}
          {!card.measurements && (
            <p style={{ color: 'var(--text-muted)' }}>Bu raporda doğrulanmış ölçüm verisi bulunmuyor.</p>
          )}

          {/* Approval Timeline */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineHeader}>
              Değiştirilemez denetim izi
            </div>

            {card.auditTrail.length === 0 ? (
              <div className={styles.timelineEmpty}>
                Henüz durum değişikliği kaydedilmemiş.
              </div>
            ) : (
              <div className={styles.timeline}>
                {card.auditTrail.map(event => (
                  <div key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineLeft}>
                      <div
                        className={styles.timelineAvatar}
                        style={{ background: `linear-gradient(135deg,${event.role === 'uzman' ? '#00d4ff' : event.role === 'yonetici' ? '#f59e0b' : '#8892a8'},#0a0f1e)` }}
                      >
                        {event.user.slice(0, 2).toUpperCase()}
                        <span className={styles.timelineIcon} style={{ background: event.action === 'STATU_DEGISTI' ? '#00d4ff' : '#6e8efb' }}>↻</span>
                      </div>
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTopRow}>
                        <span className={styles.timelineActor}>{event.user} · {event.role}</span>
                        <span className={styles.timelineTime}>{formatDateTime(event.timestamp)}</span>
                      </div>
                      <div className={styles.timelineAction}>
                        {event.previousStatus ? `${COL_LABELS[event.previousStatus] ?? event.previousStatus} → ` : ''}
                        <strong style={{ color: event.newStatus === 'gecersiz_ihbar' || event.newStatus === 'kapatildi' || event.newStatus === 'reddedildi' ? '#ff4444' : '#00d4ff' }}>
                          {COL_LABELS[event.newStatus] ?? event.newStatus}
                        </strong>
                      </div>
                      <div className={styles.timelineReason}>{event.note || event.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <article className={styles.printDocument}>
          <header className={styles.printHeader}>
            <h1>T.C. Çevre Müdahale ve Olay Tespit Tutanağı</h1>
            <p>Su kirliliği ihbarı ve doğrulama kayıt özeti</p>
          </header>
          <section className={styles.printSection}>
            <h2>Olay Kimliği</h2>
            <dl className={styles.printGrid}>
              <div><dt>Takip numarası</dt><dd>{card.trackingCode ?? '—'}</dd></div>
              <div><dt>İhbar tarihi / saati</dt><dd>{formatDateTime(card.createdAt)}</dd></div>
              <div><dt>Olay türü</dt><dd>{card.incidentCategory}</dd></div>
              <div><dt>Mevcut durum</dt><dd>{colMeta?.label ?? card.column}</dd></div>
              <div><dt>İl / İlçe</dt><dd>{[card.district, card.province].filter(Boolean).join(', ') || 'Belirtilmemiş'}</dd></div>
              <div><dt>Adres / yer tarifi</dt><dd>{card.location}</dd></div>
              <div className={styles.printCoordinates}>
                <dt>GPS koordinatları</dt>
                <dd>{card.coordinates
                  ? `${card.coordinates.lat.toFixed(6)}, ${card.coordinates.lng.toFixed(6)}`
                  : 'Koordinat kaydedilmemiştir.'}</dd>
              </div>
            </dl>
          </section>
          <section className={styles.printSection}>
            <h2>Olay Açıklaması</h2>
            <p className={styles.printBody}>{card.description}</p>
          </section>
          <section className={styles.printSection}>
            <h2>İhbar Fotoğrafı / Kanıt</h2>
            {photos[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className={styles.printPhoto} src={photos[0]} alt="İhbar kanıtı" />
              : <p>Bu ihbar için fotoğraf kaydı bulunmamaktadır.</p>}
          </section>
          <section className={styles.printSection}>
            <h2>Saha Ölçümleri</h2>
            {card.measurements && Object.keys(card.measurements).length > 0 ? (
              <table className={styles.printMeasurements}>
                <thead>
                  <tr><th>Parametre</th><th>Ölçüm</th><th>Birim</th></tr>
                </thead>
                <tbody>
                  {[
                    { key: 'ph', label: 'pH Değeri', unit: 'pH' },
                    { key: 'dissolvedO2', label: 'Çözünmüş Oksijen', unit: 'mg/L' },
                    { key: 'temperature', label: 'Su Sıcaklığı', unit: '°C' },
                    { key: 'conductivity', label: 'İletkenlik', unit: 'µS/cm' },
                    { key: 'turbidity', label: 'Bulanıklık', unit: 'NTU' },
                  ].flatMap(({ key, label, unit }) => {
                    const value = card.measurements?.[key as keyof NonNullable<typeof card.measurements>];
                    return typeof value === 'number'
                      ? [<tr key={key}><td>{label}</td><td>{value}</td><td>{unit}</td></tr>]
                      : [];
                  })}
                </tbody>
              </table>
            ) : (
              <p>Saha ölçümü kaydedilmemiştir.</p>
            )}
          </section>
          <section className={styles.printSection}>
            <h2>Uzman İnceleme Notu</h2>
            <p className={styles.printBody}>{card.expertNotes || 'Uzman inceleme notu henüz girilmemiştir.'}</p>
            <p>Risk değerlendirmesi: {card.riskAssessed
              ? `${RISK_CONFIG[card.riskLevel].label} (${card.riskScore}/100)`
              : 'Henüz değerlendirilmemiştir.'}</p>
          </section>
          <section className={styles.printSection}>
            <h2>Yönetici Onayı / Kararı</h2>
            <p className={styles.printBody}>{managerDecision?.note ?? card.managerNotes ?? 'Yönetici kararı henüz kaydedilmemiştir.'}</p>
            {managerDecision && <p>Karar: {managerDecision.user} · {formatDateTime(managerDecision.timestamp)}</p>}
          </section>
          <footer className={styles.printSignatures}>
            <div><strong>İnceleyen Uzman</strong><span>Ad Soyad / İmza</span><i /></div>
            <div><strong>Yetkili Yönetici</strong><span>Ad Soyad / İmza / Kaşe</span><i /></div>
          </footer>
          <small className={styles.printFooter}>Belge yerel AquaGuard kayıtlarından oluşturulmuştur; içerik yazdırma anındaki kayıt durumunu gösterir.</small>
        </article>
      </div>
    </div>
  );
}
