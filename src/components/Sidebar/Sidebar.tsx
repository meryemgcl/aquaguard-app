'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import styles from './Sidebar.module.css';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Icon components (inline SVGs) ── */
const IconDashboard = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconKanban = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </svg>
);

const IconMap = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const IconAI = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
    <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
    <circle cx="9" cy="7" r="0.5" fill="currentColor" />
    <circle cx="15" cy="7" r="0.5" fill="currentColor" />
  </svg>
);

const IconMail = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 4L12 13 2 4" />
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

const IconArchive = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

/* ── Navigation Configuration ── */
interface NavItem {
  href: string;
  label: string;
  icon: React.FC;
  badge?: number;
  badgeVariant?: 'default' | 'warning' | 'danger';
}

interface NavSection {
  header: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    header: 'ANA MENÜ',
    items: [
      { href: '/', label: 'Pano', icon: IconDashboard },
      { href: '/kanban', label: 'Raporlar', icon: IconKanban, badge: 12, badgeVariant: 'warning' },
      { href: '/harita', label: 'Harita', icon: IconMap },
      { href: '/ai-analiz', label: 'AI Analiz', icon: IconAI },
    ],
  },
  {
    header: 'YÖNETİM',
    items: [
      { href: '/mail-sablonlari', label: 'Mail Şablonları', icon: IconMail },
      { href: '/kullanicilar', label: 'Kullanıcılar', icon: IconUsers, badge: 3 },
      { href: '/ayarlar', label: 'Ayarlar', icon: IconSettings },
    ],
  },
  {
    header: 'GÖRÜNÜM & ARAÇLAR',
    items: [
      { href: '/arsiv', label: 'Arşiv', icon: IconArchive },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const getBadgeClass = (variant?: 'default' | 'warning' | 'danger') => {
    if (variant === 'warning') return `${styles.navBadge} ${styles.navBadgeWarning}`;
    if (variant === 'danger') return `${styles.navBadge} ${styles.navBadgeDanger}`;
    return styles.navBadge;
  };

  return (
    <aside className={styles.sidebar}>
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
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navSections.map((section) => (
          <div key={section.header}>
            <div className={styles.sectionHeader}>{section.header}</div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                >
                  <Icon />
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={getBadgeClass(item.badgeVariant)}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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
  );
}
