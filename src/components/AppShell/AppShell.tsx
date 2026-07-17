'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import Navbar from '@/components/Navbar/Navbar';
import { PUBLIC_ROUTES } from '@/lib/types';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  /* On auth pages (login, register) — render only children, no shell */
  const isAuthPage = PUBLIC_ROUTES.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <Navbar />
      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          marginTop: 'var(--navbar-height)',
          minHeight: 'calc(100vh - var(--navbar-height))',
        }}
      >
        <div
          style={{
            padding: 'var(--space-xl)',
            maxWidth: '1440px',
          }}
        >
          {children}
        </div>
      </main>
    </>
  );
}
