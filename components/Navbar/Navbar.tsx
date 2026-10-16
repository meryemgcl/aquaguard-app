'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ROUTES } from '@/lib/types';
import styles from './Navbar.module.css';

const routeTitles: Record<string, { title: string; breadcrumb: string }> = {
  '/': { title: 'Operasyon Panosu', breadcrumb: 'Ana sayfa' },
  '/ihbar': { title: 'İhbar Bildir', breadcrumb: 'İhbar Bildir' },
  '/ihbar-takip': { title: 'İhbarı Kodla Takip Et', breadcrumb: 'İhbar Takip' },
  '/kanban': { title: 'Operasyon & Doğrulama Panosu', breadcrumb: 'Operasyon & Doğrulama Panosu' },
  '/raporlarim': { title: 'İhbar Takip', breadcrumb: 'İhbar Takip' },
  '/harita': { title: 'Kirlilik Haritası', breadcrumb: 'Kirlilik Haritası' },
  '/radar': { title: 'Kirlilik Kümelenme Radarı', breadcrumb: 'Erken Uyarı Radarı' },
  '/saha': { title: 'Saha İnceleme & Ölçüm', breadcrumb: 'Saha İnceleme' },
  '/istasyonlar': { title: 'İzleme İstasyonları', breadcrumb: 'İstasyonlar' },
  '/ai-analiz': { title: 'Ölçüm Analizi', breadcrumb: 'Ölçüm Analizi' },
  '/kullanicilar': { title: 'Kullanıcılar', breadcrumb: 'Kullanıcılar' },
  '/ayarlar': { title: 'Sistem Ayarları', breadcrumb: 'Ayarlar' },
  '/arsiv': { title: 'Tamamlanan İhbarlar', breadcrumb: 'Arşiv' },
  '/profil': { title: 'Profilim', breadcrumb: 'Profilim' },
};

const SEARCH_LINKS = [
  { label: 'İhbar Bildir', href: '/ihbar' },
  { label: 'İhbar Takip', href: '/raporlarim' },
  { label: 'Takip Koduyla Sorgula', href: '/ihbar-takip' },
  { label: 'Operasyon & Doğrulama Panosu', href: '/kanban' },
  { label: 'Kirlilik Haritası', href: '/harita' },
  { label: 'Kümelenme Radarı', href: '/radar' },
  { label: 'Saha İnceleme', href: '/saha' },
  { label: 'Kullanıcılar', href: '/kullanicilar' },
  { label: 'Sistem Ayarları', href: '/ayarlar' },
];

function getInitials(name: string) {
  return name.split(' ').map(namePart => namePart[0]).slice(0, 2).join('').toUpperCase();
}

interface NavbarProps {
  menuOpen: boolean;
  onMenuOpen: () => void;
}

export default function Navbar({ menuOpen, onMenuOpen }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = routeTitles[pathname] ?? { title: 'AquaGuard', breadcrumb: pathname };
  const filteredLinks = SEARCH_LINKS.filter(link =>
    user && ROLE_ROUTES[user.role].includes(link.href) &&
    link.label.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')),
  );

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <button type="button" className={styles.menuButton} onClick={onMenuOpen} aria-label="Ana menüyü aç" aria-controls="primary-navigation" aria-expanded={menuOpen}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <h1 className={styles.pageTitle}>{current.title}</h1>
        <div className={styles.breadcrumb}>
          <span>AquaGuard</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{current.breadcrumb}</span>
        </div>
      </div>

      <div className={styles.right}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => router.push('/ihbar')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          İhbar Bildir
        </button>

        <div className={styles.searchWrapper} style={{ position: 'relative' }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sayfa ara…"
            aria-label="Sayfa ara"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchFocused && searchQuery.length > 0 && (
            <div className={styles.searchResults}>
              {filteredLinks.length === 0 ? (
                <div className={styles.searchEmpty}>Sonuç bulunamadı</div>
              ) : filteredLinks.map(link => (
                <button
                  key={link.href}
                  type="button"
                  className={styles.searchResult}
                  onClick={() => { router.push(link.href); setSearchQuery(''); }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.userMenu} ref={menuRef}>
          <button className={styles.userBtn} onClick={() => setUserMenuOpen(open => !open)} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label="Kullanıcı menüsünü aç">
            <span className={styles.userBtnName}>{user?.name?.split(' ')[0] ?? 'Kullanıcı'}</span>
            <span className={styles.userBtnAvatar} style={user ? {
              background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, #0a0f1e)`,
              boxShadow: `0 0 12px ${ROLE_COLORS[user.role]}44`,
            } : undefined}>
              {user ? getInitials(user.name) : '?'}
            </span>
          </button>

          {userMenuOpen && user && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownHeader}>
                <div>
                  <p className={styles.dropdownName}>{user.name}</p>
                  <p className={styles.dropdownEmail}>{user.email}</p>
                  <span className={styles.dropdownRole} style={{ color: ROLE_COLORS[user.role], borderColor: `${ROLE_COLORS[user.role]}44` }}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} role="menuitem" onClick={() => { router.push('/profil'); setUserMenuOpen(false); }}>Profilim</button>
              <button className={styles.dropdownItem} role="menuitem" onClick={() => { router.push('/ayarlar'); setUserMenuOpen(false); }}>Sistem ayarları</button>
              <div className={styles.dropdownDivider} />
              <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} role="menuitem" onClick={logout}>Çıkış yap</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
