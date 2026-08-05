"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      <h1>Ayarlar</h1>
      <p>{user.name} ({user.role}) için ayarlar sayfası.</p>
      {/* TODO: Ayar formu, tema seçimi, vs. */}
    </div>
  );
}
