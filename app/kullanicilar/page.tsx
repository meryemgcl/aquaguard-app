"use client";

import React from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
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
      <h1>Kullanıcılar</h1>
      <p>Bu sayfa {user.name} ({user.role}) tarafından görüntüleniyor.</p>
      {/* TODO: Liste, oluşturma, vs. */}
    </div>
  );
}
