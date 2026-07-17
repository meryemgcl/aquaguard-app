'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { KanbanCard, KanbanColumn, COLUMNS } from '@/lib/kanban';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import KanbanColumnComponent from './KanbanColumn';
import KanbanCardComponent from './KanbanCard';
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
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [movingCard, setMovingCard] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  /* ── Toast helper ── */
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Fetch cards ── */
  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/kanban');
      const data = await res.json();
      if (data.success) setCards(data.cards);
    } catch {
      showToast('Kartlar yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find(c => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const targetColumn = COLUMNS.find(c => c.id === overId)?.id
      ?? cards.find(c => c.id === overId)?.column;
    if (!targetColumn) return;
    setCards(prev => prev.map(c =>
      c.id === activeId ? { ...c, column: targetColumn as KanbanColumn } : c
    ));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;
    const cardId = active.id as string;
    const overId = over.id as string;
    const targetColumn = COLUMNS.find(c => c.id === overId)?.id
      ?? cards.find(c => c.id === overId)?.column;
    if (!targetColumn) return;
    const originalCard = cards.find(c => c.id === cardId);
    if (!originalCard || originalCard.column === targetColumn) return;

    setMovingCard(cardId);
    try {
      const res = await fetch('/api/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, column: targetColumn }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
    } catch {
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, column: originalCard.column } : c
      ));
      showToast('Taşıma başarısız.', 'error');
    } finally {
      setMovingCard(null);
    }
  };

  /* ── Approval handlers ── */
  const handleApproveConfirm = async () => {
    if (!modal || modal.type !== 'approve' || !user) return;
    const { card } = modal;
    setModal(null);

    const res = await fetch('/api/kanban/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: card.id,
        actorName: user.name,
        actorInitials: user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        actorColor: '#00d4ff',
        role: user.role,
      }),
    });
    const data = await res.json();

    if (data.success) {
      setCards(prev => prev.map(c => c.id === card.id ? data.card : c));
      showToast('✓ Rapor onaylandı. Bildirim maili gönderildi.');
    } else {
      showToast(data.message || 'Onay başarısız.', 'error');
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!modal || modal.type !== 'reject' || !user) return;
    const { card } = modal;
    setModal(null);

    const res = await fetch('/api/kanban/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: card.id,
        actorName: user.name,
        actorInitials: user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        actorColor: '#ff4444',
        role: user.role,
        reason,
      }),
    });
    const data = await res.json();

    if (data.success) {
      setCards(prev => prev.map(c => c.id === card.id ? data.card : c));
      showToast('✗ Rapor reddedildi. Düzeltme daveti maili gönderildi.', 'error');
    } else {
      showToast(data.message || 'Red işlemi başarısız.', 'error');
    }
  };

  /* ── Group cards by column ── */
  const cardsByColumn = COLUMNS.reduce<Record<string, KanbanCard[]>>((acc, col) => {
    acc[col.id] = cards.filter(c => c.column === col.id);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Raporlar yükleniyor…</p>
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
              Raporları sürükleyerek taşıyın · Yetkili rolünüzle onay verebilirsiniz
            </p>
          </div>
          <div className={styles.boardStats}>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#8892a8' }} />
              {cards.length} Toplam
            </div>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#ff4444' }} />
              {cards.filter(c => c.riskLevel === 'critical').length} Kritik
            </div>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#00d4ff' }} />
              {cards.filter(c => c.column === 'onay-uzman' || c.column === 'onay-yonetici').length} Bekleyen
            </div>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: '#00ff88' }} />
              {cards.filter(c => c.column === 'yayinlandi').length} Yayında
            </div>
          </div>
        </div>

        {/* Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.board}>
            {COLUMNS.map(col => (
              <KanbanColumnComponent
                key={col.id}
                column={col}
                cards={cardsByColumn[col.id] ?? []}
                movingCard={movingCard}
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

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeCard && <KanbanCardComponent card={activeCard} isDragging isOverlay />}
          </DragOverlay>
        </DndContext>
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
          card={modal.card}
          onClose={() => setModal(null)}
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
