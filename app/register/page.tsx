'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<'halk' | 'uzman' | 'yonetici'>('halk');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    const result = await register(
      name,
      email,
      password,
      requestedRole === 'halk' ? undefined : requestedRole,
    );

    if (result.success) {
      if (result.pending) {
        setNotice(result.message);
      } else {
        router.push('/');
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className={styles.authPage}>
      {/* Animated Background */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={styles.authContainer} style={{ maxWidth: '480px' }}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <svg className={styles.logoIcon} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="regDropGrad" x1="12" y1="5" x2="38" y2="45" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#6e8efb" />
              </linearGradient>
            </defs>
            <path d="M25 4C25 4 10 20 10 30a15 15 0 0 0 30 0C40 20 25 4 25 4z" fill="url(#regDropGrad)" opacity="0.9" />
            <path d="M20 28c0-4 5-9 5-9" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 className={styles.logoText}>AquaGuard</h1>
          <p className={styles.logoSubtitle}>Yeni hesap oluştur</p>
        </div>

        {/* Register Card */}
        <div className={styles.authCard}>
          <h2 className={styles.cardTitle}>Kayıt Ol</h2>
          <p className={styles.cardSubtitle}>Platforma katılmak için bilgilerinizi girin</p>

          {error && (
            <div className={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
          {notice && <div className={styles.cardSubtitle} role="status">{notice}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Name */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Ad Soyad</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ad Soyad" className={styles.input} required autoComplete="name" />
              </div>
            </div>

            {/* Email */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>E-posta</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" />
                </svg>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@aquaguard.com" className={styles.input} required autoComplete="email" />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="requestedRole">Hesap türü</label>
              <select
                id="requestedRole"
                className={styles.input}
                value={requestedRole}
                onChange={event => setRequestedRole(event.target.value as 'halk' | 'uzman' | 'yonetici')}
              >
                <option value="halk">Vatandaş — hemen etkinleşir</option>
                <option value="uzman">Çevre uzmanı — yönetici onayı gerekir</option>
                <option value="yonetici">Yönetici — yönetici onayı gerekir</option>
              </select>
            </div>

            {/* Password */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Şifre</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter"
                  className={styles.input} required autoComplete="new-password" />
                <button type="button" className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Şifre Tekrar</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifrenizi tekrar girin"
                  className={styles.input} required autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : (
                <>
                  Kayıt Ol
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className={styles.switchAuth} style={{ marginTop: '1.5rem' }}>
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className={styles.switchLink}>Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
