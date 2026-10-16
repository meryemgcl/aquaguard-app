'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS, ROLE_ROUTES } from '@/lib/types';
import styles from './Sidebar.module.css';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Icon components (inline SVGs) ── */
const IconKanban = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </svg>
);

const IconReports = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </svg>
);

const IconMap = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const IconRadar = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
    <path d="M12 12 19 5" />
  </svg>
);

const IconField = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3z" />
    <path d="M9 4v13M15 7v13" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const IconUsers = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSettings = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ── Navigation Configuration ── */
interface NavItem {
  href: string;
  label: string;
  icon: React.FC;
}

interface NavSection {
  header: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    header: 'İHBAR İŞ AKIŞI',
    items: [
      { href: '/ihbar', label: 'İhbar Bildir', icon: IconReports },
      { href: '/raporlarim', label: 'İhbar Takip', icon: IconKanban },
      { href: '/ihbar-takip', label: 'Takip Koduyla Sorgula', icon: IconReports },
      { href: '/kanban', label: 'Operasyon & Doğrulama Panosu', icon: IconKanban },
      { href: '/harita', label: 'Kirlilik Haritası', icon: IconMap },
      { href: '/radar', label: 'Kümelenme Radarı', icon: IconRadar },
      { href: '/saha', label: 'Saha İnceleme', icon: IconField },
    ],
  },
  {
    header: 'SİSTEM',
    items: [
      { href: '/kullanicilar', label: 'Kullanıcılar', icon: IconUsers },
      { href: '/ayarlar', label: 'Sistem Ayarları', icon: IconSettings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && <button type="button" className={styles.mobileOverlay} aria-label="Menüyü kapat" onClick={onClose} />}
      <aside
        id="primary-navigation"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
        aria-label="Ana gezinme"
      >
      {/* Logo */}
      <div className={styles.logo}>
        <svg className={styles.logoIcon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dropGrad" x1="10" y1="5" x2="30" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#6e8efb" />
            </linearGradient>
          </defs>
          <path
            d="M20 4C20 4 8 18 8 25a12 12 0 0 0 24 0C32 18 20 4 20 4z"
            fill="url(#dropGrad)"
            opacity="0.9"
          />
          <path
            d="M16 24c0-4 4-8 4-8"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.logoText}>AquaGuard</span>
        <button type="button" className={styles.mobileClose} onClick={onClose} aria-label="Menüyü kapat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navSections.map((section) => {
          const visibleItems = section.items.filter(item => user && ROLE_ROUTES[user.role].includes(item.href));
          if (!visibleItems.length) return null;
          return (
          <div key={section.header}>
            <div className={styles.sectionHeader}>{section.header}</div>
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={onClose}
                >
                  <Icon />
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        <div
          className={styles.userAvatar}
          style={user ? {
            background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)`,
            boxShadow: `0 0 12px ${ROLE_COLORS[user.role]}44`,
            color: '#fff',
          } : undefined}
        >
          {user ? getInitials(user.name) : '?'}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name ?? 'Yükleniyor…'}</span>
          <span className={styles.userRole} style={user ? { color: ROLE_COLORS[user.role] } : undefined}>
            {user ? ROLE_LABELS[user.role] : ''}
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}
