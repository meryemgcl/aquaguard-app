import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider/AuthProvider';
import AppShell from '@/components/AppShell/AppShell';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
