'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import Navbar from '@/components/Navbar/Navbar';
import { PUBLIC_ROUTES } from '@/lib/types';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* On auth pages (login, register) — render only children, no shell */
  const isAuthPage = PUBLIC_ROUTES.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Navbar menuOpen={mobileNavOpen} onMenuOpen={() => setMobileNavOpen(true)} />
      <a className={styles.skipLink} href="#main-content">Ana içeriğe geç</a>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.content}>{children}</div>
      </main>
    </>
  );
}
