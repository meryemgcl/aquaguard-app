import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider/AuthProvider';
import AppShell from '@/components/AppShell/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider/ThemeProvider';
import MixpanelProvider from '@/components/MixpanelProvider/MixpanelProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AquaGuard — Su Kirliliği Bildirim ve Takip Platformu',
  description:
    'AquaGuard; su kirliliği olaylarının bildirilmesini, incelenmesini ve yerel takip koduyla sorgulanmasını sağlar.',
  keywords: ['su kalitesi', 'izleme', 'rapor', 'AquaGuard', 'çevre'],
};

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
          <Suspense fallback={null}>
            <MixpanelProvider>
              <AuthProvider>
                <ErrorBoundary>
                  <AppShell>{children}</AppShell>
                </ErrorBoundary>
              </AuthProvider>
              <Toaster richColors position="top-right" />
            </MixpanelProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
