import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.dashboard}>
      {/* Welcome Header */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>
          Hoş Geldiniz, <span className={styles.gradientText}>AquaGuard</span>
        </h1>
        <p className={styles.welcomeSubtitle}>
          Su kalitesi izleme ve raporlama platformu
        </p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {/* Card 1 - Toplam Rapor */}
        <div className={`${styles.statCard} ${styles.statCardAccent}`}>
          <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className={styles.statTrend}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span className={styles.trendUp}>+12%</span>
            </div>
          </div>
          <div className={styles.statValue}>247</div>
          <div className={styles.statLabel}>Toplam Rapor</div>
          <div className={styles.statBar}>
            <div className={styles.statBarFill} style={{ width: '78%', background: 'linear-gradient(90deg, #00b4d8, #00d4ff)' }} />
          </div>
        </div>

        {/* Card 2 - Bekleyen Onay */}
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(255, 170, 0, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffaa00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className={styles.badgeWarning}>Bekliyor</span>
          </div>
          <div className={styles.statValue}>12</div>
          <div className={styles.statLabel}>Bekleyen Onay</div>
          <div className={styles.statBar}>
            <div className={styles.statBarFill} style={{ width: '35%', background: 'linear-gradient(90deg, #cc8800, #ffaa00)' }} />
          </div>
        </div>

        {/* Card 3 - Ortalama Risk */}
        <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
          <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className={styles.badgeSuccess}>Düşük</span>
          </div>
          <div className={styles.statValue}>34.2</div>
          <div className={styles.statLabel}>Ortalama Risk Skoru</div>
          <div className={styles.statBar}>
            <div className={styles.statBarFill} style={{ width: '34%', background: 'linear-gradient(90deg, #00cc6a, #00ff88)' }} />
          </div>
        </div>

        {/* Card 4 - Bu Ay Yayınlanan */}
        <div className={`${styles.statCard} ${styles.statCardInfo}`}>
          <div className={styles.statCardHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(110, 142, 251, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6e8efb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className={styles.statTrend}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span className={styles.trendUp}>+8%</span>
            </div>
          </div>
          <div className={styles.statValue}>38</div>
          <div className={styles.statLabel}>Bu Ay Yayınlanan</div>
          <div className={styles.statBar}>
            <div className={styles.statBarFill} style={{ width: '62%', background: 'linear-gradient(90deg, #5570d0, #6e8efb)' }} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Hızlı İşlemler
        </h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionCard}>
            <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #00b4d8, #00d4ff)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0f1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span>Yeni Rapor</span>
          </button>
          <button className={styles.actionCard}>
            <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #00cc6a, #00ff88)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0f1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span>Onay Bekleyenler</span>
          </button>
          <button className={styles.actionCard}>
            <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #6e8efb, #a777e3)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
              </svg>
            </div>
            <span>AI Analiz Başlat</span>
          </button>
          <button className={styles.actionCard}>
            <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff4444)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </div>
            <span>Harita Görünümü</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.recentSection}>
        <h2 className={styles.sectionTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Son Aktiviteler
        </h2>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <div className={styles.activityDot} style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.5)' }} />
            <div className={styles.activityContent}>
              <span className={styles.activityText}>Sapanca Gölü raporu <strong>yayınlandı</strong></span>
              <span className={styles.activityTime}>2 saat önce</span>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot} style={{ background: '#ffaa00', boxShadow: '0 0 8px rgba(255,170,0,0.5)' }} />
            <div className={styles.activityContent}>
              <span className={styles.activityText}>Kızılırmak ölçüm verisi <strong>onay bekliyor</strong></span>
              <span className={styles.activityTime}>4 saat önce</span>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot} style={{ background: '#00d4ff', boxShadow: '0 0 8px rgba(0,212,255,0.5)' }} />
            <div className={styles.activityContent}>
              <span className={styles.activityText}>AI analiz: Burdur Gölü&apos;nde <strong>anomali tespit edildi</strong></span>
              <span className={styles.activityTime}>6 saat önce</span>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot} style={{ background: '#ff4444', boxShadow: '0 0 8px rgba(255,68,68,0.5)' }} />
            <div className={styles.activityContent}>
              <span className={styles.activityText}>Ergene Nehri raporu <strong>reddedildi</strong> — düzeltme maili gönderildi</span>
              <span className={styles.activityTime}>1 gün önce</span>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot} style={{ background: '#6e8efb', boxShadow: '0 0 8px rgba(110,142,251,0.5)' }} />
            <div className={styles.activityContent}>
              <span className={styles.activityText}>3 yeni kullanıcı <strong>sisteme kaydoldu</strong></span>
              <span className={styles.activityTime}>2 gün önce</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
