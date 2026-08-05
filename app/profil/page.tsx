'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/types';
import { KanbanCard, COLUMNS } from '@/lib/kanban';
import styles from './page.module.css';

/* ── Common Components ── */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function TaskItem({ card }: { card: KanbanCard }) {
  const router = useRouter();
  const col = COLUMNS.find(c => c.id === card.column);
  
  return (
    <div className={styles.taskCard}>
      <div className={styles.taskInfo}>
        <h3>{card.title}</h3>
        <div className={styles.taskMeta}>
          <span>📍 {card.location}</span>
          <span>•</span>
          <span>📅 {new Date(card.createdAt).toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className={styles.taskStatus} style={{ color: col?.color, border: `1px solid ${col?.color}44`, background: col?.glow }}>
          {col?.icon} {col?.label}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => router.push('/kanban')}>
          İncele
        </button>
      </div>
    </div>
  );
}

/* ── Role Dashboards ── */

function HalkDashboard({ tasks }: { tasks: KanbanCard[] }) {
  const router = useRouter();
  const activeCount = tasks.filter(t => t.column !== 'yayinlandi' && t.column !== 'reddedildi').length;
  const resolvedCount = tasks.filter(t => t.column === 'yayinlandi').length;

  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.mainColumn}>
        <h2 className={styles.sectionTitle}>🌍 Benim Raporlarım</h2>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Henüz rapor göndermediniz.
            <br />
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => router.push('/kanban')}>Yeni Rapor Gönder</button>
          </div>
        ) : (
          <div className={styles.taskList}>
            {tasks.map(t => <TaskItem key={t.id} card={t} />)}
          </div>
        )}
      </div>
      <div className={styles.sideColumn}>
        <h2 className={styles.sectionTitle}>🏆 Çevre Profilim</h2>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#00ff88' }}>🌱</div>
          <div>
            <div className={styles.statValue}>{tasks.length}</div>
            <div className={styles.statLabel}>Toplam Bildirim</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#00d4ff' }}>🔄</div>
          <div>
            <div className={styles.statValue}>{activeCount}</div>
            <div className={styles.statLabel}>İncelenenler</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b' }}>✅</div>
          <div>
            <div className={styles.statValue}>{resolvedCount}</div>
            <div className={styles.statLabel}>Çözülenler</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UzmanDashboard({ tasks }: { tasks: KanbanCard[] }) {
  const router = useRouter();
  const pendingCount = tasks.filter(t => t.column === 'onay-uzman' || t.column === 'yeni' || t.column === 'ai-analiz').length;
  
  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.mainColumn}>
        <h2 className={styles.sectionTitle}>🔬 Ortak İş Kuyruğu (Uzman Onayı Bekleyenler)</h2>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Onay bekleyen rapor bulunmamaktadır.
          </div>
        ) : (
          <div className={styles.taskList}>
            {tasks.map(t => <TaskItem key={t.id} card={t} />)}
          </div>
        )}
      </div>
      <div className={styles.sideColumn}>
        <h2 className={styles.sectionTitle}>🤖 Hızlı İşlemler</h2>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => router.push('/ai-analiz')} style={{ width: '100%', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span> AI Analiz Panelini Aç
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/harita')} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span> Risk Haritasına Git
          </button>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>📊 Kuyruk Özeti</h2>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#6e8efb' }}>📥</div>
          <div>
            <div className={styles.statValue}>{pendingCount}</div>
            <div className={styles.statLabel}>Bekleyen İş</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function YoneticiDashboard({ tasks }: { tasks: KanbanCard[] }) {
  const pendingCount = tasks.length;

  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.mainColumn}>
        <h2 className={styles.sectionTitle}>✅ Nihai Onay Kuyruğu (Yönetici)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Uzman incelemesinden geçmiş ve kurumlara bildirilmek üzere onayınızı bekleyen raporlar.
        </p>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Yönetici onayı bekleyen rapor yok.
          </div>
        ) : (
          <div className={styles.taskList}>
            {tasks.map(t => <TaskItem key={t.id} card={t} />)}
          </div>
        )}
      </div>
      <div className={styles.sideColumn}>
        <h2 className={styles.sectionTitle}>📈 Takım Performansı</h2>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b' }}>⏳</div>
          <div>
            <div className={styles.statValue}>{pendingCount}</div>
            <div className={styles.statLabel}>Onay Bekleyen</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#00ff88' }}>🚀</div>
          <div>
            <div className={styles.statValue}>~4s</div>
            <div className={styles.statLabel}>Ort. Onay Süresi</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ tasks }: { tasks: KanbanCard[] }) {
  const router = useRouter();

  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.mainColumn}>
        <h2 className={styles.sectionTitle}>👑 Sistem Genel Bakış</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: '#00d4ff' }}>👥</div>
            <div>
              <div className={styles.statValue}>Aktif</div>
              <div className={styles.statLabel}>Kullanıcı Servisi</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: '#6e8efb' }}>🤖</div>
            <div>
              <div className={styles.statValue}>Aktif</div>
              <div className={styles.statLabel}>Gemini AI Servisi</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: '#f59e0b' }}>📧</div>
            <div>
              <div className={styles.statValue}>Aktif</div>
              <div className={styles.statLabel}>Resend Mail Servisi</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: '#00ff88' }}>📋</div>
            <div>
              <div className={styles.statValue}>{tasks.length}</div>
              <div className={styles.statLabel}>Toplam Sistem Raporu</div>
            </div>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>Son Raporlar</h2>
        <div className={styles.taskList}>
          {tasks.slice(0, 5).map(t => <TaskItem key={t.id} card={t} />)}
        </div>
      </div>
      
      <div className={styles.sideColumn}>
        <h2 className={styles.sectionTitle}>⚙️ Yönetim Modülleri</h2>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => router.push('/kullanicilar')} style={{ width: '100%', justifyContent: 'center' }}>
            👥 Kullanıcıları Yönet
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/mail-sablonlari')} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border)' }}>
            📧 Mail Şablonları
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/ayarlar')} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border)' }}>
            ⚙️ Sistem Ayarları
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Main Page ── */

export default function ProfilPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/kanban/my-tasks')
        .then(r => r.json())
        .then(d => {
          if (d.success) setTasks(d.tasks);
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading || !user) {
    return (
      <div className={styles.profilePage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--accent)' }} />
      </div>
    );
  }

  const roleColor = ROLE_COLORS[user.role] || '#8892a8';
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div className={styles.profilePage}>
      {/* Header Profile Info */}
      <div className={styles.header}>
        <div className={styles.avatar} style={{ background: `linear-gradient(135deg, ${roleColor}, #0a0f1e)` }}>
          {getInitials(user.name)}
        </div>
        <div className={styles.headerInfo}>
          <h1>{user.name}</h1>
          <p>
            {user.email}
            <span className={styles.roleBadge} style={{ color: roleColor, borderColor: `${roleColor}44`, background: `${roleColor}12` }}>
              {roleLabel}
            </span>
          </p>
        </div>
      </div>

      {/* Role specific dashboard routing */}
      {user.role === 'halk' && <HalkDashboard tasks={tasks} />}
      {user.role === 'uzman' && <UzmanDashboard tasks={tasks} />}
      {user.role === 'yonetici' && <YoneticiDashboard tasks={tasks} />}
      {user.role === 'admin' && <AdminDashboard tasks={tasks} />}
    </div>
  );
}
