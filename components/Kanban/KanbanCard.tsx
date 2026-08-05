'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard, RISK_CONFIG, APPROVAL_ROLES } from '@/lib/kanban';
import { UserRole } from '@/lib/types';
import { toast } from 'sonner';
import styles from './Kanban.module.css';

interface AIResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  suggestedAction: string;
  draftEmail: string;
  error?: string;
}

interface Props {
  card: KanbanCard;
  isDragging?: boolean;
  isOverlay?: boolean;
  isMoving?: boolean;
  userRole?: UserRole;
  onApprove?: (cardId: string) => void;
  onReject?: (cardId: string) => void;
  onDetail?: (card: KanbanCard) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function RiskBar({ score }: { score: number }) {
  const color =
    score < 30 ? '#00ff88' :
    score < 60 ? '#f59e0b' :
    score < 80 ? '#ff6b35' :
    '#ff4444';
  return (
    <div className={styles.riskBarWrapper}>
      <div className={styles.riskBar}
        style={{ width: `${score}%`, background: `linear-gradient(90deg,${color}88,${color})` }}
      />
    </div>
  );
}

export default function KanbanCardComponent({
  card, isDragging, isOverlay, isMoving,
  userRole, onApprove, onReject, onDetail,
}: Props) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const [approvalLoading, setApprovalLoading] = useState<'approve' | 'reject' | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const risk = RISK_CONFIG[card.riskLevel];

  /* Check if current user can approve/reject this card */
  const allowedRoles = APPROVAL_ROLES[card.column];
  const canApprove = !!(userRole && allowedRoles && allowedRoles.includes(userRole as 'uzman' | 'yonetici' | 'admin'));

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging && !isOverlay ? 0.35 : 1,
    cursor: isDragging || isOverlay ? 'grabbing' : 'grab',
  };

  /* Stop propagation so button clicks don't trigger drag */
  const stopDrag = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovalLoading('approve');
    onApprove?.(card.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovalLoading('reject');
    onReject?.(card.id);
  };

  const handleDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetail?.(card);
  };

  /* ── AI Analysis ── */
  const handleAiAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAiModalOpen(true);
    setAiResult(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${card.title} — ${card.description} (Konum: ${card.location}, Risk Skoru: ${card.riskScore}/100)`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data);
      } else {
        setAiResult({ ...data, error: data.error || 'Hata oluştu' } as any);
      }
    } catch {
      setAiResult({ error: 'Sunucuya bağlanılamadı' } as any);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMail = async () => {
    if (!aiResult?.draftEmail) return;
    const toastId = toast.loading('E-posta gönderiliyor...');
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: card.creatorEmail,
          subject: `AI Analiz Raporu: ${card.title}`,
          body: aiResult.draftEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('E-posta gönderildi!', {
          id: toastId,
          description: data.simulated ? 'RESEND_API_KEY olmadığı için simüle edildi.' : 'Başarıyla iletildi.',
        });
      } else {
        toast.error('Hata', { id: toastId, description: data.error });
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı', { id: toastId });
    }
  };

  const riskColors: Record<string, string> = {
    low: '#00ff88', medium: '#f59e0b', high: '#ff6b35', critical: '#ff4444',
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          ${styles.card}
          ${isDragging || isOverlay ? styles.cardDragging : ''}
          ${isMoving ? styles.cardMoving : ''}
          ${canApprove ? styles.cardActionable : ''}
        `}
      >
        {isMoving && <div className={styles.movingPulse} />}

        {/* Top row — risk badge + score + AI button */}
        <div className={styles.cardTop}>
          <span className={styles.riskBadge}
            style={{ color: risk.color, background: risk.bg, borderColor: `${risk.color}33` }}>
            <span className={styles.riskDot}
              style={{ background: risk.color, boxShadow: `0 0 6px ${risk.color}` }} />
            {risk.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* AI Analyze Button */}
            <button
              className={styles.detailBtn}
              onClick={handleAiAnalyze}
              onPointerDown={stopDrag}
              title="AI ile Analiz Et"
              aria-label="AI analiz"
              style={{ color: '#6e8efb' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
              </svg>
            </button>
            <span className={styles.riskScore} style={{ color: risk.color }}>{card.riskScore}</span>
            {/* Detail button */}
            {onDetail && (
              <button
                className={styles.detailBtn}
                onClick={handleDetail}
                onPointerDown={stopDrag}
                title="Detay & Onay Geçmişi"
                aria-label="Kart detayı"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <RiskBar score={card.riskScore} />

        {/* Title */}
        <h4 className={styles.cardTitle}>{card.title}</h4>

        {/* Location */}
        <div className={styles.cardLocation}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {card.location}
        </div>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className={styles.cardTags}>
            {card.tags.slice(0, 3).map(tag => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Approval history indicator */}
        {card.approvals.length > 0 && (
          <div className={styles.approvalIndicator}>
            {card.approvals.map(a => (
              <span
                key={a.id}
                className={a.action === 'approved' ? styles.approvalDotGreen : styles.approvalDotRed}
                title={`${a.actorName}: ${a.action === 'approved' ? 'Onayladı' : 'Reddetti'}`}
              />
            ))}
            <span className={styles.approvalCount}>{card.approvals.length} işlem</span>
          </div>
        )}

        {/* Bottom row — date + assignee */}
        <div className={styles.cardFooter}>
          <div className={styles.cardDate}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(card.createdAt)}
          </div>
          <div className={styles.assigneeAvatar} title={card.assignee.name}
            style={{ background: `linear-gradient(135deg,${card.assignee.color},#0a0f1e)`, boxShadow: `0 0 10px ${card.assignee.color}44` }}>
            {card.assignee.initials}
          </div>
        </div>

        {/* ── Approval Action Buttons ── */}
        {canApprove && !isOverlay && (
          <div className={styles.approvalActions} onPointerDown={stopDrag}>
            <button
              className={styles.rejectBtn}
              onClick={handleReject}
              disabled={approvalLoading !== null}
              title="Reddet"
            >
              {approvalLoading === 'reject' ? (
                <span className={styles.miniSpinner} />
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Reddet
                </>
              )}
            </button>
            <button
              className={styles.approveBtn}
              onClick={handleApprove}
              disabled={approvalLoading !== null}
              title="Onayla"
            >
              {approvalLoading === 'approve' ? (
                <span className={styles.miniSpinner} style={{ borderTopColor: '#0a0f1e' }} />
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Onayla
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── AI Analysis Modal ── */}
      {aiModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
          onPointerDown={() => setAiModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)', maxWidth: '560px', width: '100%',
              maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
              background: 'rgba(110,142,251,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
                </svg>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  AI Analiz — {card.title}
                </span>
              </div>
              <button onClick={() => setAiModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {aiLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem', color: 'var(--text-muted)' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '3px solid var(--border)', borderTopColor: '#6e8efb',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <p>Gemini AI raporu inceliyor...</p>
                </div>
              ) : aiResult?.error ? (
                <div style={{ padding: '1rem', background: 'var(--danger-glow)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', border: '1px solid rgba(255,68,68,0.2)' }}>
                  {aiResult.error}
                </div>
              ) : aiResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Risk Level */}
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>AI Risk Değerlendirmesi</p>
                    <span style={{
                      padding: '0.3rem 0.9rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem', fontWeight: 700, border: '1px solid',
                      color: riskColors[aiResult.riskLevel] || '#f59e0b',
                      background: `${riskColors[aiResult.riskLevel] || '#f59e0b'}18`,
                      borderColor: `${riskColors[aiResult.riskLevel] || '#f59e0b'}33`,
                    }}>
                      {aiResult.riskLevel?.toUpperCase()}
                    </span>
                  </div>
                  {/* Explanation */}
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Gerekçe</p>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiResult.explanation}</p>
                  </div>
                  {/* Action */}
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>İlk Aksiyon</p>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiResult.suggestedAction}</p>
                  </div>
                  {/* Draft Email */}
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Resmi Dilekçe Taslağı</p>
                    <div style={{
                      padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace',
                      color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                    }}>
                      {aiResult.draftEmail}
                    </div>
                  </div>
                  {/* Send Mail Button */}
                  <button
                    onClick={handleSendMail}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#00b4d8,#00d4ff)',
                      color: '#0a0f1e', fontWeight: 700, borderRadius: 'var(--radius-md)',
                      border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                      boxShadow: '0 0 15px rgba(0,212,255,0.25)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" />
                    </svg>
                    Dilekçeyi E-Posta Olarak Gönder
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
