'use client';

import { useEffect } from 'react';
import { KanbanCard, RISK_CONFIG, COLUMNS } from '@/lib/kanban';
import styles from './ApprovalModal.module.css';

interface Props {
  card: KanbanCard;
  onClose: () => void;
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
  'yeni': 'Yeni Rapor', 'ai-analiz': 'AI Analiz',
  'onay-uzman': '1. Onay (Uzman)', 'onay-yonetici': '2. Onay (Yönetici)',
  'yayinlandi': 'Yayınlandı', 'reddedildi': 'Reddedildi',
};

export default function CardDetailModal({ card, onClose }: Props) {
  const risk = RISK_CONFIG[card.riskLevel];
  const colMeta = COLUMNS.find(c => c.id === card.column);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
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
                Risk: {card.riskScore} — {risk.label}
              </span>
            </div>
            <h2 className={styles.detailTitle}>{card.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="no-print"
              onClick={() => window.print()}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center'
              }}
            >
              📄 PDF
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

          {/* Measurements and Educational Tooltips */}
          {card.measurements && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                Ölçüm Değerleri (AI ve Sensör)
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

          {/* Approval Timeline */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineHeader}>
              Onay Geçmişi
            </div>

            {card.approvals.length === 0 ? (
              <div className={styles.timelineEmpty}>
                Henüz onay/red işlemi yapılmamış.
              </div>
            ) : (
              <div className={styles.timeline}>
                {/* Creation event */}
                <div className={styles.timelineItem}>
                  <div className={styles.timelineLeft}>
                    <div className={styles.timelineAvatar} style={{ background: `linear-gradient(135deg,${card.assignee.color},#0a0f1e)` }}>
                      {card.assignee.initials}
                      <span className={styles.timelineIcon} style={{ background: '#8892a8' }}>📋</span>
                    </div>
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTopRow}>
                      <span className={styles.timelineActor}>{card.assignee.name}</span>
                      <span className={styles.timelineTime}>{formatDateTime(card.createdAt)}</span>
                    </div>
                    <div className={styles.timelineAction}>Raporu oluşturdu → <strong>Yeni Rapor</strong></div>
                  </div>
                </div>

                {/* Approval records */}
                {card.approvals.map(appr => (
                  <div key={appr.id} className={styles.timelineItem}>
                    <div className={styles.timelineLeft}>
                      <div
                        className={styles.timelineAvatar}
                        style={{ background: `linear-gradient(135deg,${appr.actorColor},#0a0f1e)` }}
                      >
                        {appr.actorInitials}
                        <span className={styles.timelineIcon} style={{ background: appr.action === 'approved' ? '#00ff88' : '#ff4444' }}>
                          {appr.action === 'approved' ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTopRow}>
                        <span className={styles.timelineActor}>{appr.actorName}</span>
                        <span className={styles.timelineTime}>{formatDateTime(appr.timestamp)}</span>
                      </div>
                      <div className={styles.timelineAction}>
                        {COL_LABELS[appr.columnFrom]} →{' '}
                        <strong style={{ color: appr.action === 'approved' ? '#00ff88' : '#ff4444' }}>
                          {COL_LABELS[appr.columnTo]}
                        </strong>
                      </div>
                      <div>
                        {appr.action === 'approved' ? (
                          <span className={styles.timelineBadgeApproved}>✓ Onaylandı</span>
                        ) : (
                          <span className={styles.timelineBadgeRejected}>✗ Reddedildi</span>
                        )}
                      </div>
                      {appr.reason && (
                        <div className={styles.timelineReason}>
                          <span style={{ fontSize: '0.68rem', color: '#ff6b6b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Red Sebebi: </span>
                          {appr.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
