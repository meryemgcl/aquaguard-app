'use client';

import type { WaterIncidentCategory } from '@/lib/types';
import styles from './IncidentMapFilters.module.css';

const categories: WaterIncidentCategory[] = [
  'endüstriyel atık',
  'evsel atık',
  'balık ölümü',
  'renk/koku değişimi',
];

interface Props {
  category: WaterIncidentCategory | 'all';
  onCategoryChange: (category: WaterIncidentCategory | 'all') => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  publishedOnly: boolean;
  onPublishedOnlyChange: (publishedOnly: boolean) => void;
  allowAllStatuses: boolean;
}

export default function IncidentMapFilters({
  category,
  onCategoryChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  publishedOnly,
  onPublishedOnlyChange,
  allowAllStatuses,
}: Props) {
  return (
    <div className={styles.filters} aria-label="Harita filtreleri">
      <label>
        <span>Olay türü</span>
        <select value={category} onChange={event => {
          const selected = categories.find(value => value === event.target.value);
          onCategoryChange(selected ?? 'all');
        }}>
          <option value="all">Tüm türler</option>
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        <span>Başlangıç</span>
        <input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => onDateFromChange(event.target.value)} />
      </label>
      <label>
        <span>Bitiş</span>
        <input type="date" value={dateTo} min={dateFrom || undefined} onChange={event => onDateToChange(event.target.value)} />
      </label>
      <label>
        <span>Durum</span>
        <select
          value={!allowAllStatuses || publishedOnly ? 'published' : 'all'}
          onChange={event => onPublishedOnlyChange(event.target.value === 'published')}
          disabled={!allowAllStatuses}
        >
          <option value="published">Sadece Yayında Olanlar</option>
          <option value="all" disabled={!allowAllStatuses}>Tüm Olaylar</option>
        </select>
      </label>
      {!allowAllStatuses && <p className={styles.note}>Vatandaş görünümünde yalnızca yayımlanmış olaylar gösterilir.</p>}
    </div>
  );
}
