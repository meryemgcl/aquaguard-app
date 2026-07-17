'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError('');
  };

  return (
    <div className={styles.authPage}>
      {/* Animated Background */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={styles.authContainer}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <svg className={styles.logoIcon} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="loginDropGrad" x1="12" y1="5" x2="38" y2="45" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#6e8efb" />
              </linearGradient>
            </defs>
            <path d="M25 4C25 4 10 20 10 30a15 15 0 0 0 30 0C40 20 25 4 25 4z" fill="url(#loginDropGrad)" opacity="0.9" />
            <path d="M20 28c0-4 5-9 5-9" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 className={styles.logoText}>AquaGuard</h1>
          <p className={styles.logoSubtitle}>Akıllı Su Kalitesi İzleme Platformu</p>
        </div>

        {/* Login Card */}
        <div className={styles.authCard}>
          <h2 className={styles.cardTitle}>Giriş Yap</h2>
          <p className={styles.cardSubtitle}>Hesabınıza giriş yaparak devam edin</p>

          {error && (
            <div className={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>E-posta</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13 2 4" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@aquaguard.com"
                  className={styles.input}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Şifre</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className={styles.input}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  Giriş Yap
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>Demo Hesaplar</span>
          </div>

          <div className={styles.demoAccounts}>
            <button className={styles.demoBtn} onClick={() => fillDemo('admin@aquaguard.com')}>
              <span className={styles.demoDot} style={{ background: '#00d4ff' }} />
              Admin
            </button>
            <button className={styles.demoBtn} onClick={() => fillDemo('ayse@aquaguard.com')}>
              <span className={styles.demoDot} style={{ background: '#6e8efb' }} />
              Uzman
            </button>
            <button className={styles.demoBtn} onClick={() => fillDemo('mehmet@aquaguard.com')}>
              <span className={styles.demoDot} style={{ background: '#00ff88' }} />
              Yönetici
            </button>
            <button className={styles.demoBtn} onClick={() => fillDemo('halk@aquaguard.com')}>
              <span className={styles.demoDot} style={{ background: '#8892a8' }} />
              Halk
            </button>
          </div>

          <p className={styles.switchAuth}>
            Hesabınız yok mu?{' '}
            <Link href="/register" className={styles.switchLink}>
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
