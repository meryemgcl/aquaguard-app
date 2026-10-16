import { KanbanCard } from '@/lib/kanban-types';
import { UserRole } from '@/lib/types';
import KanbanCardComponent from './KanbanCard';
import styles from './Kanban.module.css';

interface Props {
  column: { id: string; label: string; color: string; glow: string; icon: string; };
  cards: KanbanCard[];
  movingCard: string | null;
  userRole?: UserRole;
  onApprove?: (cardId: string) => void;
  onReject?: (cardId: string) => void;
  onDetail?: (card: KanbanCard) => void;
}

export default function KanbanColumn({
  column, cards, movingCard,
  userRole, onApprove, onReject, onDetail,
}: Props) {
  return (
    <div
      className={styles.column}
      style={{ '--col-color': column.color, '--col-glow': column.glow } as React.CSSProperties}
    >
      <div className={styles.columnAccent}
        style={{ background: `linear-gradient(90deg,${column.color},transparent)` }}
      />
      <div className={styles.columnHeader}>
        <div className={styles.columnHeaderLeft}>
          <span className={styles.columnIcon}>{column.icon}</span>
          <h3 className={styles.columnTitle}>{column.label}</h3>
        </div>
        <span className={styles.columnCount}
          style={{ background: column.glow, color: column.color, borderColor: `${column.color}33` }}>
          {cards.length}
        </span>
      </div>

        <div className={styles.cardList}>
          {cards.length === 0 ? (
            <div className={styles.emptyCol}>
              <span className={styles.emptyIcon} style={{ color: column.color }}>{column.icon}</span>
              <p>Kart yok</p>
              <p className={styles.emptyHint}>İşlem için ihbarı açın</p>
            </div>
          ) : (
            cards.map(card => (
              <KanbanCardComponent
                key={card.id}
                card={card}
                isMoving={movingCard === card.id}
                userRole={userRole}
                onApprove={onApprove}
                onReject={onReject}
                onDetail={onDetail}
              />
            ))
          )}
        </div>
    </div>
  );
}
