"use client";

import React from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ArchivePage() {
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
      <h1>Arşiv</h1>
      <p>{user.name} ({user.role}) için arşiv sayfası.</p>
      {/* TODO: Arşiv listeleme ve filtreleme */}
    </div>
  );
}
