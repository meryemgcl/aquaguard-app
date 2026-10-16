'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import type { KanbanCard, KanbanColumn } from '@/lib/kanban-types';
import styles from './MyReports.module.css';

const STATUS_LABELS: Record<KanbanColumn, string> = {
  yeni: 'Alındı',
  'ai-analiz': 'Ön incelemede',
  'onay-uzman': 'Uzman incelemesinde',
  'onay-yonetici': 'Yönetici onayında',
  yayinlandi: 'Yayınlandı',
  reddedildi: 'İşlem tamamlandı',
};

const STATUS_STEPS: KanbanColumn[] = ['yeni', 'ai-analiz', 'onay-uzman', 'onay-yonetici', 'yayinlandi'];

export default function MyReportsClient() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadReports = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch('/api/kanban/my-tasks', { cache: 'no-store', signal });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result &&
          typeof result.error === 'string' ? result.error : 'Raporlar yüklenemedi.';
        throw new Error(message);
      }
      if (typeof result !== 'object' || result === null || !('tasks' in result) || !Array.isArray(result.tasks)) {
        throw new Error('Sunucudan beklenmeyen rapor verisi alındı.');
      }
      setReports(result.tasks as KanbanCard[]);
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Raporlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void loadReports(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadReports, reloadKey, user]);

  const isCitizen = user?.role === 'halk';
  const heading = isCitizen ? 'Raporlarım' : 'Görevlerim';
  const summary = isCitizen
    ? 'Gönderdiğiniz su kirliliği ve kalite bildirimlerinin durumunu buradan takip edin.'
    : 'Rolünüze atanmış inceleme ve onay işlerini, güncel durumlarıyla takip edin.';

  if (authLoading || !user) {
    return <div className={styles.state} role="status" aria-live="polite">Hesap bilgileri yükleniyor…</div>;
  }

  return (
    <section className={styles.page} aria-labelledby="my-reports-title" aria-busy={loading}>
      <header className={styles.header}>
        <div>
          <h2 id="my-reports-title">{heading}</h2>
          <p>{summary}</p>
        </div>
        {isCitizen && <Link href="/arsiv" className={styles.secondaryAction}>Tamamlanan raporlar</Link>}
      </header>

      {loading ? (
        <div className={styles.state} role="status" aria-live="polite">Raporlar yükleniyor…</div>
      ) : error ? (
        <div className={styles.state} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); setReloadKey(key => key + 1); }}>Yeniden dene</button>
        </div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>{isCitizen ? 'Henüz rapor göndermediniz' : 'Bekleyen göreviniz yok'}</h3>
          <p>{isCitizen ? 'Bir su kirliliği veya kalite sorunu fark ettiğinizde bildirim oluşturabilirsiniz.' : 'Yeni görev atandığında veya rapor incelemeye geldiğinde burada görünür.'}</p>
          {isCitizen && <Link className={styles.primaryAction} href="/ihbar">Yeni ihbar bildir</Link>}
        </div>
      ) : (
        <ul className={styles.reportList} aria-label={heading}>
          {reports.map(report => {
            const currentStep = STATUS_STEPS.indexOf(report.column);
            const stepsCompleted = report.column === 'yayinlandi' ? STATUS_STEPS.length : Math.max(0, currentStep + 1);
            return (
              <li className={styles.reportCard} key={report.id}>
                <div className={styles.reportHeader}>
                  <div>
                    <span className={`${styles.status} ${report.column === 'reddedildi' ? styles.statusRejected : ''}`}>
                      {report.resolution === 'gecersiz_ihbar'
                        ? 'Geçersiz ihbar'
                        : report.resolution === 'kapatildi'
                          ? 'Kapatıldı'
                          : STATUS_LABELS[report.column]}
                    </span>
                    <h3>{report.title}</h3>
                    <p>{report.location} · {new Date(report.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {report.riskAssessed && (
                    <span className={styles.riskValue} aria-label={`Uzman değerlendirmesi, risk skoru ${report.riskScore} / 100`}>
                      Uzman değerlendirmesi: {report.riskScore}/100
                    </span>
                  )}
                </div>
                {report.column === 'reddedildi' ? (
                  <p className={styles.statusMessage}>
                    {report.expertNotes || report.managerNotes || (report.resolution === 'gecersiz_ihbar'
                      ? 'Uzman incelemesi sonucunda geçersiz olarak kapatıldı.'
                      : 'Yetkili yönetici tarafından kapatıldı.')}
                  </p>
                ) : (
                  <ol className={styles.progress} aria-label={`Rapor durumu: ${STATUS_LABELS[report.column]}`}>
                    {STATUS_STEPS.map((step, index) => (
                      <li key={step} className={index < stepsCompleted ? styles.stepDone : ''} aria-current={step === report.column ? 'step' : undefined}>
                        <span aria-hidden="true" />
                        <span>{STATUS_LABELS[step]}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
