'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ApprovalModal.module.css';

interface Props {
  cardTitle: string;
  cardId: string;
  action: 'approve' | 'reject';
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
}

export default function ApprovalModal({ cardTitle, action, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (action === 'reject') textareaRef.current?.focus();
  }, [action]);

  /* Close on backdrop click */
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleSubmit = async () => {
    if (action === 'reject' && !reason.trim()) {
      setError('Red sebebi zorunludur. Lütfen açıklayın.');
      textareaRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(action === 'reject' ? reason.trim() : undefined);
    } catch {
      setError('İşlem başarısız. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const isReject = action === 'reject';
  const accentColor = isReject ? '#ff4444' : '#00ff88';
  const MIN_REASON = 20;

  return (
    <div className={styles.backdrop} onClick={handleBackdrop} role="dialog" aria-modal>
      <div className={`${styles.modal} ${isReject ? styles.modalReject : styles.modalApprove}`}>
        {/* Header */}
        <div className={styles.header} style={{ borderColor: accentColor }}>
          <div className={styles.headerIcon} style={{ background: `${accentColor}15`, borderColor: `${accentColor}30` }}>
            {isReject ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <div>
            <h3 className={styles.title}>
              {isReject ? 'Raporu Reddet' : 'Raporu Onayla'}
            </h3>
            <p className={styles.subtitle}>
              {isReject ? 'Bu işlem geri alınamaz. Mail otomatik gönderilecek.' : 'Rapor bir sonraki aşamaya geçecek.'}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onCancel} aria-label="Kapat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Card Preview */}
        <div className={styles.cardPreview}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className={styles.cardTitle}>{cardTitle}</span>
        </div>

        {/* Reject reason textarea */}
        {isReject && (
          <div className={styles.reasonSection}>
            <label className={styles.reasonLabel}>
              Red Gerekçesi
              <span className={styles.required}>* Zorunlu</span>
            </label>
            <div className={styles.textareaWrapper}>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={e => { setReason(e.target.value); setError(''); }}
                placeholder="Raporun neden reddedildiğini açıklayın. Bu metin, raporu oluşturan kişiye e-posta ile iletilecektir..."
                className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
                rows={4}
                maxLength={500}
              />
              <div className={styles.charCount}>
                <span className={reason.length < MIN_REASON ? styles.charInsuff : styles.charOk}>
                  {reason.length}
                </span>
                /500 {reason.length < MIN_REASON && `(en az ${MIN_REASON} karakter)`}
              </div>
            </div>
            {error && (
              <p className={styles.errorText}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </p>
            )}

            {/* Email warning */}
            <div className={styles.emailWarning}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" />
              </svg>
              <span>Raporu oluşturana otomatik düzeltme daveti maili gönderilecek.</span>
            </div>
          </div>
        )}

        {/* Approve confirmation */}
        {!isReject && (
          <div className={styles.approveInfo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Onaylama işlemi kaydedilecek ve rapor oluşturan kişiye bildirim maili gönderilecektir.</p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            İptal
          </button>
          <button
            className={`${styles.confirmBtn} ${isReject ? styles.confirmReject : styles.confirmApprove}`}
            onClick={handleSubmit}
            disabled={loading || (isReject && reason.trim().length < MIN_REASON)}
            style={{ '--accent': accentColor } as React.CSSProperties}
          >
            {loading ? (
              <span className={styles.btnSpinner} />
            ) : isReject ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reddet &amp; Mail Gönder
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Onayla
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
