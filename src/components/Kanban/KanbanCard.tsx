'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard, RISK_CONFIG, APPROVAL_ROLES } from '@/lib/kanban';
import { UserRole } from '@/lib/types';
import styles from './Kanban.module.css';

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

  return (
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

      {/* Top row — risk badge + score */}
      <div className={styles.cardTop}>
        <span className={styles.riskBadge}
          style={{ color: risk.color, background: risk.bg, borderColor: `${risk.color}33` }}>
          <span className={styles.riskDot}
            style={{ background: risk.color, boxShadow: `0 0 6px ${risk.color}` }} />
          {risk.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
  );
}
