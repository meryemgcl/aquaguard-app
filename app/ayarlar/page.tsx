'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SettingsPage() {
  const { user, login, loading: authLoading } = useAuth(); // We'll mock login as refresh
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  // Mock preferences
  const [emailNotifs, setEmailNotifs] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        setName(user.name);
      }
    }
  }, [user, authLoading, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const payload: any = {};
      if (name !== user?.name) payload.name = name;
      if (password) payload.password = password;

      if (Object.keys(payload).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus({ type: 'success', msg: 'Bilgileriniz başarıyla güncellendi!' });
        setPassword('');
        // Auth provider'ı manuel tazelemek için login'i tekrar tetikleyemeyiz ama sayfa yenilense iyi olur.
        // Veya user verisi provider içinden çekiliyorsa window reload en temizi.
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus({ type: 'error', msg: data.error || 'Güncelleme başarısız.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'Bağlantı hatası oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Kişisel Ayarlar</h1>
        <p className={styles.subtitle}>Profil bilgilerinizi, şifrenizi ve sistem tercihlerinizi güncelleyin.</p>
      </div>

      {status && (
        <div className={`${styles.alert} ${status.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {status.msg}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 Profil Bilgileri</h2>
        <form onSubmit={handleUpdate}>
          <div className={styles.formGroup}>
            <label>E-posta Adresi (Değiştirilemez)</label>
            <input type="email" className={styles.input} value={user.email} disabled />
          </div>
          
          <div className={styles.formGroup}>
            <label>Ad Soyad</label>
            <input 
              type="text" 
              className={styles.input} 
              value={name} 
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
            <input 
              type="password" 
              className={styles.input} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </form>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⚙️ Sistem Tercihleri</h2>
        
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>E-posta Bildirimleri</span>
            <span className={styles.toggleDesc}>Rapor onay ve uyarı bildirimlerini e-posta ile alın.</span>
          </div>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" checked={emailNotifs} onChange={e => setEmailNotifs(e.target.checked)} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Karanlık Tema</span>
            <span className={styles.toggleDesc}>Sistem arayüzünü karanlık modda kullanın.</span>
          </div>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" checked={theme === 'dark'} onChange={() => toggleTheme()} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
    </div>
  );
}
