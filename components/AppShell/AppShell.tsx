'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import Navbar from '@/components/Navbar/Navbar';
import { PUBLIC_ROUTES } from '@/lib/types';
import MobileNav from '@/components/MobileNav/MobileNav';

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
      <main className="main-content">
        <div className="main-container">
          {children}
        </div>
      </main>
      <MobileNav />
    </>
  );
}
