import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider/AuthProvider';
import AppShell from '@/components/AppShell/AppShell';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AquaGuard — Akıllı Su Kalitesi İzleme Platformu',
  description:
    'AquaGuard, su kaynaklarının kalitesini gerçek zamanlı izleyen, raporlayan ve AI destekli analiz sunan akıllı bir platformdur.',
  keywords: ['su kalitesi', 'izleme', 'rapor', 'AquaGuard', 'çevre'],
};

import { ThemeProvider } from '@/components/ThemeProvider/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
