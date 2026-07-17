'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import styles from './Navbar.module.css';

/* ── Route → Title Map ── */
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Navbar() {
  const pathname = usePathname();
  const current = routeTitles[pathname] ?? { title: 'Sayfa', breadcrumb: pathname };
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className={styles.navbar}>
      {/* Left — Title & Breadcrumb */}
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{current.title}</h1>
        <div className={styles.breadcrumb}>
          <span>AquaGuard</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{current.breadcrumb}</span>
        </div>
      </div>

      {/* Right — Search, Notifications, User */}
      <div className={styles.right}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Ara..."
            aria-label="Arama"
          />
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Notification Bell */}
        <button className={styles.iconBtn} aria-label="Bildirimler">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.notifBadge}>5</span>
        </button>

        {/* User Avatar Dropdown */}
        <div className={styles.userMenu} ref={menuRef}>
          <button
            className={styles.userBtn}
            aria-label="Kullanıcı menüsü"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={styles.userBtnName}>
              {user?.name?.split(' ')[0] ?? 'Kullanıcı'}
            </span>
            <div
              className={styles.userBtnAvatar}
              style={{
                background: user ? `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)` : undefined,
                boxShadow: user ? `0 0 12px ${ROLE_COLORS[user.role]}44` : undefined,
              }}
            >
              {user ? getInitials(user.name) : '?'}
            </div>
          </button>

          {/* Dropdown */}
          {menuOpen && user && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div
                  className={styles.dropdownAvatar}
                  style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)` }}
                >
                  {getInitials(user.name)}
                </div>
                <div>
                  <p className={styles.dropdownName}>{user.name}</p>
                  <p className={styles.dropdownEmail}>{user.email}</p>
                  <span
                    className={styles.dropdownRole}
                    style={{ color: ROLE_COLORS[user.role], borderColor: `${ROLE_COLORS[user.role]}44` }}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>

              <div className={styles.dropdownDivider} />

              <button className={styles.dropdownItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                Profilim
              </button>
              <button className={styles.dropdownItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Ayarlar
              </button>

              <div className={styles.dropdownDivider} />

              <button
                className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                onClick={logout}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
