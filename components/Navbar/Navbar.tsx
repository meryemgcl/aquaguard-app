'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import { geocodeLocation, riskScoreToColor } from '@/lib/geocode';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import styles from './Navbar.module.css';

const routeTitles: Record<string, { title: string; breadcrumb: string }> = {
  '/': { title: 'Pano', breadcrumb: 'Anasayfa' },
  '/kanban': { title: 'Raporlar', breadcrumb: 'Raporlar' },
  '/harita': { title: 'Harita', breadcrumb: 'Harita' },
  '/ai-analiz': { title: 'AI Analiz', breadcrumb: 'AI Analiz' },
  '/mail-sablonlari': { title: 'Mail Şablonları', breadcrumb: 'Mail Şablonları' },
  '/kullanicilar': { title: 'Kullanıcılar', breadcrumb: 'Kullanıcılar' },
  '/ayarlar': { title: 'Ayarlar', breadcrumb: 'Ayarlar' },
  '/arsiv': { title: 'Arşiv', breadcrumb: 'Arşiv' },
};

const SEARCH_LINKS = [
  { label: 'Pano', href: '/' },
  { label: 'Raporlar / Kanban', href: '/kanban' },
  { label: 'Harita', href: '/harita' },
  { label: 'AI Analiz', href: '/ai-analiz' },
  { label: 'Mail Şablonları', href: '/mail-sablonlari' },
  { label: 'Kullanıcılar', href: '/kullanicilar' },
  { label: 'Ayarlar', href: '/ayarlar' },
  { label: 'Arşiv', href: '/arsiv' },
];

const NOTIFICATIONS = [
  { id: 1, type: 'danger', icon: '🚨', title: 'Kritik: Ergene Nehri pH Anomalisi', desc: 'pH seviyesi 4.2\'ye düştü!', time: '2 dk önce', unread: true },
  { id: 2, type: 'warning', icon: '⚠️', title: 'Sapanca Gölü AI Analizde', desc: 'Gemini raporu hazırlanıyor...', time: '8 dk önce', unread: true },
  { id: 3, type: 'success', icon: '✅', title: 'Melen Çayı Raporu Yayınlandı', desc: 'Yönetici onayıyla tamamlandı.', time: '1 saat önce', unread: true },
  { id: 4, type: 'info', icon: '🔬', title: 'Uzman Onayı Bekleniyor', desc: 'Gediz Havzası raporu onayınızı bekliyor.', time: '3 saat önce', unread: false },
  { id: 5, type: 'info', icon: '📋', title: 'Yeni Rapor Oluşturuldu', desc: 'Kızılırmak Nehri aylık izleme eklendi.', time: '5 saat önce', unread: false },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

interface NewReportModalProps {
  onClose: () => void;
}

function NewReportModal({ onClose }: NewReportModalProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', location: '', description: '', riskLevel: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.location || !form.description) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }
    setSubmitting(true);
    try {
      const cardId = `card-${Date.now()}`;
      const riskScore = form.riskLevel === 'critical' ? 95 : form.riskLevel === 'high' ? 75 : form.riskLevel === 'medium' ? 50 : 20;

      const newCard = {
        id: cardId,
        title: form.title,
        location: form.location,
        description: form.description,
        column: 'yeni',
        riskScore,
        riskLevel: form.riskLevel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorEmail: 'yeni@aquaguard.com',
        assignee: { name: 'Atanmadı', role: 'uzman', initials: '--', color: '#8892a8' },
        tags: [],
        approvals: [],
      };

      await setDoc(doc(db, 'reports', cardId), newCard);
      
      toast.success('Rapor başarıyla oluşturuldu!', { description: 'Gerçek zamanlı olarak sisteme eklendi.' });
      onClose();
      router.push('/kanban');
    } catch (err) {
      console.error(err);
      toast.error('Sunucuya bağlanılamadı veya veritabanı hatası.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '520px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        animation: 'slideUp 0.25s ease',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span> Yeni Rapor Oluştur
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Rapor Başlığı *
            </label>
            <input
              className="input"
              type="text"
              placeholder="Örn: Ergene Nehri pH Anomalisi"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Konum *
            </label>
            <input
              className="input"
              type="text"
              placeholder="Örn: Tekirdağ, TR"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Risk Seviyesi
            </label>
            <select
              className="input"
              value={form.riskLevel}
              onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value as any }))}
            >
              <option value="low">🟢 Düşük</option>
              <option value="medium">🟡 Orta</option>
              <option value="high">🟠 Yüksek</option>
              <option value="critical">🔴 Kritik</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Açıklama *
            </label>
            <textarea
              className="input"
              placeholder="Sorunu ve gözlemlenen ölçümleri detaylı açıklayın..."
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>İptal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
              {submitting ? 'Kaydediliyor...' : '📋 Raporu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const current = routeTitles[pathname] ?? { title: 'Sayfa', breadcrumb: pathname };
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;
  const filteredLinks = SEARCH_LINKS.filter(l =>
    l.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, unread: false })));

  return (
    <>
      <header className={styles.navbar}>
        {/* Left */}
        <div className={styles.left}>
          <h1 className={styles.pageTitle}>{current.title}</h1>
          <div className={styles.breadcrumb}>
            <span>AquaGuard</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{current.breadcrumb}</span>
          </div>
        </div>

        {/* Right */}
        <div className={styles.right}>
          {/* New Report Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setReportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Yeni Rapor
          </button>

          {/* Search */}
          <div className={styles.searchWrapper} style={{ position: 'relative' }}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Sayfa ara..."
              aria-label="Arama"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {/* Search results dropdown */}
            {searchFocused && searchQuery.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'rgba(18,24,44,0.97)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)', zIndex: 1000,
              }}>
                {filteredLinks.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Sonuç bulunamadı</div>
                ) : filteredLinks.map(l => (
                  <button key={l.href} onClick={() => { router.push(l.href); setSearchQuery(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                      padding: '0.7rem 1rem', background: 'none', border: 'none',
                      color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer',
                      transition: 'background 0.15s', textAlign: 'left', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className={styles.iconBtn} aria-label="Bildirimler" onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
            </button>

            {notifOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.75rem)', right: 0,
                width: 340, background: 'rgba(18,24,44,0.97)', backdropFilter: 'blur(24px)',
                border: '1px solid var(--border)', borderRadius: 16, zIndex: 1000,
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
                animation: 'dropIn 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Bildirimler</span>
                  <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Tümünü okundu işaretle
                  </button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      display: 'flex', gap: '0.75rem', padding: '0.85rem 1.25rem',
                      borderBottom: '1px solid var(--border)',
                      background: n.unread ? 'rgba(0,212,255,0.04)' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.unread ? 'rgba(0,212,255,0.04)' : 'transparent')}
                    >
                      <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }}>{n.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
                          {n.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0.75rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                  <button style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Tüm bildirimleri gör →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className={styles.userMenu} ref={menuRef}>
            <button className={styles.userBtn} onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}>
              <span className={styles.userBtnName}>{user?.name?.split(' ')[0] ?? 'Kullanıcı'}</span>
              <div className={styles.userBtnAvatar} style={{
                background: user ? `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)` : undefined,
                boxShadow: user ? `0 0 12px ${ROLE_COLORS[user.role]}44` : undefined,
              }}>
                {user ? getInitials(user.name) : '?'}
              </div>
            </button>

            {menuOpen && user && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar} style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)` }}>
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className={styles.dropdownName}>{user.name}</p>
                    <p className={styles.dropdownEmail}>{user.email}</p>
                    <span className={styles.dropdownRole} style={{ color: ROLE_COLORS[user.role], borderColor: `${ROLE_COLORS[user.role]}44` }}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </div>
                <div className={styles.dropdownDivider} />
                <button className={styles.dropdownItem} onClick={() => { router.push('/profil'); setMenuOpen(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  Profilim
                </button>
                <button className={styles.dropdownItem} onClick={() => { router.push('/ayarlar'); setMenuOpen(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Ayarlar
                </button>
                <div className={styles.dropdownDivider} />
                <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={logout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* New Report Modal */}
      {reportModalOpen && <NewReportModal onClose={() => setReportModalOpen(false)} />}
    </>
  );
}
