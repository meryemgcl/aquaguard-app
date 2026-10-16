'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { KanbanCard, COLUMNS, isCriticalSlaBreached } from '@/lib/kanban-types';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import KanbanColumnComponent from './KanbanColumn';
import ApprovalModal from './ApprovalModal';
import CardDetailModal from './CardDetailModal';
import styles from './Kanban.module.css';

type ModalState =
  | { type: 'approve'; card: KanbanCard }
  | { type: 'reject';  card: KanbanCard }
  | { type: 'detail';  card: KanbanCard }
  | null;

export default function KanbanBoard() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  /* ── Toast helper ── */
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Load local reports from the authenticated API ── */
  useEffect(() => {
    let active = true;
    const loadCards = async () => {
      try {
        const response = await fetch('/api/kanban', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Kartlar yüklenemedi.');
        if (active) {
          setCards(data.cards as KanbanCard[]);
          setLoadError(null);
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Kartlar yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadCards();
    const interval = window.setInterval(loadCards, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [showToast, reloadKey]);

  /* ── Approval handlers ── */
  const handleApproveConfirm = async (note?: string) => {
    if (!modal || modal.type !== 'approve') return;
    const { card } = modal;

    const res = await fetch('/api/kanban/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id, note }),
    });
    const data: unknown = await res.json();

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Yayımlama başarısız.';
      throw new Error(message);
    }
    if (typeof data !== 'object' || data === null || !('success' in data) || data.success !== true) {
      throw new Error('Sunucudan geçersiz yanıt alındı.');
    }
    setModal(null);
    setReloadKey(key => key + 1);
    showToast('İhbar kamuya açık olarak yayımlandı.');
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!modal || modal.type !== 'reject') return;
    const { card } = modal;

    const res = await fetch('/api/kanban/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id, reason }),
    });
    const data: unknown = await res.json();

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'İhbar kapatılamadı.';
      throw new Error(message);
    }
    if (typeof data !== 'object' || data === null || !('success' in data) || data.success !== true) {
      throw new Error('Sunucudan geçersiz yanıt alındı.');
    }
    setModal(null);
    setReloadKey(key => key + 1);
    showToast('İhbar gerekçesiyle birlikte kapatıldı.');
  };

  /* ── Group cards by column ── */
  const incidentIdsParam = searchParams.get('incidentIds');
  const incidentIds = incidentIdsParam
    ? new Set(incidentIdsParam.split(',').filter(Boolean))
    : null;
  const visibleCards = incidentIds ? cards.filter(card => incidentIds.has(card.id)) : cards;
  const cardsByColumn = COLUMNS.reduce<Record<string, KanbanCard[]>>((acc, col) => {
    acc[col.id] = visibleCards.filter(c => c.column === col.id);
    return acc;
  }, {});

  if (loading && cards.length === 0) {
    return (
      <div className={styles.loadingState} role="status" aria-live="polite">
        <div className={styles.loadingSpinner} aria-hidden="true" />
        <p>Rapor inceleme kuyruğu yükleniyor…</p>
      </div>
    );
  }

  if (loadError && cards.length === 0) {
    return (
      <div className={styles.loadError} role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={() => { setLoading(true); setReloadKey(key => key + 1); }}>Yeniden dene</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.boardWrapper}>
        {/* Header */}
        <div className={styles.boardHeader}>
          <div className={styles.boardTitleGroup}>
            <h2 className={styles.boardTitle}>Rapor Yönetim Panosu</h2>
            <p className={styles.boardSubtitle}>
              {incidentIds
                ? `${visibleCards.length} kümelenme ihbarı gösteriliyor · `
                : 'İnceleme kuyruğu · '}
              Yalnızca yetkili olduğunuz adımlarda işlem yapabilirsiniz
            </p>
          </div>
          {loadError && <p className={styles.refreshWarning} role="status">Güncel veriler yenilenemedi: {loadError}</p>}
          {incidentIds && <a className={styles.refreshWarning} href="/kanban">Küme filtresini temizle</a>}
          {visibleCards.length === 0 && (incidentIds || cards.length > 0) && (
            <p className={styles.emptyBoard} role="status">
              {incidentIds ? 'Bu kümeye ait ihbar bulunamadı veya erişilebilir değil.' : 'Henüz rapor yok. Yeni bildirim geldiğinde inceleme kuyruğunda görünecek.'}
            </p>
          )}
          <div className={styles.boardStats}>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#8892a8' }} />
              {visibleCards.length} Toplam
            </div>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#ff4444' }} />
              {visibleCards.filter(c => c.riskAssessed && c.riskLevel === 'critical').length} Kritik
            </div>
            {visibleCards.some(isCriticalSlaBreached) && (
              <div className={styles.statPill} role="alert" style={{ color: '#ff7777', borderColor: '#a21d24' }}>
                {visibleCards.filter(isCriticalSlaBreached).length} Gecikme Uyarısı
              </div>
            )}
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#00d4ff' }} />
              {visibleCards.filter(c => c.column === 'onay-uzman' || c.column === 'onay-yonetici').length} Bekleyen
            </div>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#00ff88' }} />
              {visibleCards.filter(c => c.column === 'yayinlandi').length} Yayında
            </div>
          </div>
        </div>

        <div className={styles.board}>
          {COLUMNS.map(col => (
            <KanbanColumnComponent
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] ?? []}
              movingCard={null}
              userRole={user?.role}
              onApprove={cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) setModal({ type: 'approve', card });
              }}
              onReject={cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) setModal({ type: 'reject', card });
              }}
              onDetail={card => setModal({ type: 'detail', card })}
            />
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal && modal.type === 'approve' && (
        <ApprovalModal
          cardId={modal.card.id}
          cardTitle={modal.card.title}
          action="approve"
          onConfirm={handleApproveConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && modal.type === 'reject' && (
        <ApprovalModal
          cardId={modal.card.id}
          cardTitle={modal.card.title}
          action="reject"
          onConfirm={handleRejectConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && modal.type === 'detail' && (
        <CardDetailModal
          key={modal.card.id}
          card={modal.card}
          onClose={() => setModal(null)}
          onWorkflowUpdated={() => setReloadKey(key => key + 1)}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'success'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          }
          {toast.msg}
        </div>
      )}
    </>
  );
}
