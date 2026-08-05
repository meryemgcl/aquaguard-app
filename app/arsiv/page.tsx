'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { KanbanCard } from '@/lib/kanban';
import styles from './page.module.css';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allTasks, setAllTasks] = useState<KanbanCard[]>([]);
  const [tasks, setTasks] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/kanban/archive')
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setAllTasks(d.tasks);
            setTasks(d.tasks);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  // Apply filters
  useEffect(() => {
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

    setTasks(filtered);
  }, [searchQuery, statusFilter, allTasks]);

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
        <div className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--accent)' }} />
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
        {tasks.length === 0 ? (
          <div className={styles.emptyState}>
            Kriterlerinize uygun arşiv kaydı bulunamadı.
          </div>
        ) : (
          <table className={styles.table}>
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
                      color: t.riskScore >= 70 ? '#ef4444' : t.riskScore >= 40 ? '#f59e0b' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {t.riskScore} / 100
                    </span>
                  </td>
                  <td>{getStatusBadge(t.column)}</td>
                  <td>
                    <button 
                      className={styles.detailsBtn}
                      onClick={() => alert(`Rapor Detayı:\n\n${t.description}\n\nBu raporun detayları daha sonraki sürümlerde geliştirilmiş bir Modal üzerinden gösterilecektir.`)}
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
    </div>
  );
}
