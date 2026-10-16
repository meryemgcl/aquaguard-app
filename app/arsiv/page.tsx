'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { KanbanCard } from '@/lib/kanban-types';
import ReportModal from '@/components/ReportModal/ReportModal';
import styles from './page.module.css';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allTasks, setAllTasks] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedReport, setSelectedReport] = useState<KanbanCard | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      let active = true;
      fetch('/api/kanban/archive', { cache: 'no-store' })
        .then(async response => {
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'Arşiv yüklenemedi.');
          if (active) {
            setAllTasks(data.tasks);
            setLoadError(null);
          }
        })
        .catch(error => {
          if (active) setLoadError(error instanceof Error ? error.message : 'Arşiv yüklenemedi.');
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
  }, [user, reloadKey]);

  const tasks = useMemo(() => {
    let filtered = allTasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.column === statusFilter);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allTasks, searchQuery, statusFilter]);

  const getStatusBadge = (column: string) => {
    if (column === 'yayinlandi') {
      return <span className={`${styles.statusBadge} ${styles.statusYayinlandi}`}>✅ Yayınlandı</span>;
    }
    if (column === 'reddedildi') {
      return <span className={`${styles.statusBadge} ${styles.statusReddedildi}`}>❌ Reddedildi</span>;
    }
    return <span className={styles.statusBadge}>{column}</span>;
  };

  if (authLoading || loading || !user) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--accent)' }} role="status" aria-label="Arşiv yükleniyor" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rapor Arşivi</h1>
        <p className={styles.subtitle}>
          Tamamlanmış veya reddedilmiş tüm çevre raporlarının geçmişi.
          {user.role === 'halk' && ' Sadece sizin oluşturduğunuz kayıtlar listelenmektedir.'}
        </p>
      </div>

      <div className={styles.filters}>
        <input 
          type="text" 
          placeholder="Başlık veya Konum ara..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select 
          className={styles.selectInput}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="yayinlandi">Sadece Onaylananlar (Yayınlandı)</option>
          <option value="reddedildi">Sadece Reddedilenler</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loadError ? (
          <div className={styles.emptyState} role="alert">
            <p>{loadError}</p>
            <button type="button" className={styles.detailsBtn} onClick={() => { setLoading(true); setReloadKey(key => key + 1); }}>Yeniden dene</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className={styles.emptyState}>
            {allTasks.length === 0 ? 'Henüz tamamlanmış veya reddedilmiş rapor yok.' : 'Filtrelerinize uygun arşiv kaydı bulunamadı.'}
          </div>
        ) : (
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>Tamamlanmış raporlar</caption>
            <thead>
              <tr>
                <th>Rapor Başlığı</th>
                <th>Konum</th>
                <th>Tarih</th>
                <th>Risk Skoru</th>
                <th>Nihai Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.title}</td>
                  <td>📍 {t.location}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <span style={{ 
                      color: t.riskAssessed ? (t.riskScore >= 70 ? '#ef4444' : t.riskScore >= 40 ? '#f59e0b' : '#10b981') : 'var(--text-secondary)',
                      fontWeight: 'bold'
                    }}>
                      {t.riskAssessed ? `${t.riskScore} / 100` : 'Değerlendirilmedi'}
                    </span>
                  </td>
                  <td>{getStatusBadge(t.column)}</td>
                  <td>
                    <button 
                      className={styles.detailsBtn}
                      onClick={() => setSelectedReport(t)}
                    >
                      Özeti Gör
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Render Modal if a report is selected */}
      <ReportModal 
        isOpen={selectedReport !== null} 
        onClose={() => setSelectedReport(null)} 
        report={selectedReport} 
      />
    </div>
  );
}
