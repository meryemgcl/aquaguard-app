'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MailTemplates.module.css';

/* ── Types ── */
interface MailTemplate {
  id: string;
  name: string;
  trigger: string;
  description: string;
  accentColor: string;
  accentLabel: string;
  subject: string;
  html: string;
  variables: string[];
  lastEditedAt: string;
}

interface MailLog {
  id: string;
  templateId: string;
  templateName: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  metadata: Record<string, string>;
  sentAt: string;
}

interface LogStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

/* ── Helpers ── */
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const TRIGGER_ICONS: Record<string, string> = {
  'new-report':       '📋',
  'ai-complete':      '🤖',
  'first-approval':   '✅',
  'first-rejection':  '❌',
  'published':        '🌊',
  'final-rejection':  '🚫',
};

/* ── Main Component ── */
export default function MailTemplatesClient() {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [logs, setLogs] = useState<MailLog[]>([]);
  const [stats, setStats] = useState<LogStats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [selected, setSelected] = useState<MailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'editor' | 'logs'>('editor');
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [logDetail, setLogDetail] = useState<MailLog | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Fetch data ── */
  useEffect(() => {
    fetch('/api/mail/templates')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTemplates(d.templates);
          if (d.templates.length) selectTemplate(d.templates[0]);
        }
      });

    fetch('/api/mail/logs')
      .then(r => r.json())
      .then(d => {
        if (d.success) { setLogs(d.logs); setStats(d.stats); }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(t: MailTemplate) {
    setSelected(t);
    setEditSubject(t.subject);
    setEditHtml(t.html);
    setShowPreview(false);
    setPreviewHtml('');
  }

  /* ── Save template ── */
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mail/templates/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, html: editHtml }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.map(t => t.id === selected.id ? data.template : t));
        setSelected(data.template);
        showToast('✓ Şablon kaydedildi.');
      } else {
        showToast(data.message || 'Kayıt başarısız.', 'error');
      }
    } catch {
      showToast('Sunucu hatası.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Preview ── */
  const handlePreview = async () => {
    if (!selected) return;
    setPreviewing(true);
    try {
      const res = await fetch(`/api/mail/templates/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, html: editHtml }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.html);
        setShowPreview(true);
        // Write to iframe
        setTimeout(() => {
          if (iframeRef.current?.contentDocument) {
            iframeRef.current.contentDocument.open();
            iframeRef.current.contentDocument.write(data.html);
            iframeRef.current.contentDocument.close();
          }
        }, 50);
      }
    } catch {
      showToast('Önizleme yüklenemedi.', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  /* ── Insert variable ── */
  const insertVar = (v: string) => {
    const tag = `{{${v}}}`;
    setEditHtml(prev => prev + tag);
  };

  const filteredLogs = logs.filter(l =>
    logFilter === 'all' ? true : l.status === logFilter
  );

  const isDirty = selected && (editSubject !== selected.subject || editHtml !== selected.html);

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mail Otomasyon Sistemi</h1>
          <p className={styles.pageSubtitle}>6 otomatik tetikleyici · AquaGuard markalı şablonlar</p>
        </div>
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{stats.total}</span>
            <span className={styles.statLabel}>Toplam</span>
          </div>
          <div className={`${styles.statCard} ${styles.statGreen}`}>
            <span className={styles.statNum}>{stats.sent}</span>
            <span className={styles.statLabel}>Gönderildi</span>
          </div>
          <div className={`${styles.statCard} ${styles.statRed}`}>
            <span className={styles.statNum}>{stats.failed}</span>
            <span className={styles.statLabel}>Başarısız</span>
          </div>
          <div className={`${styles.statCard} ${styles.statBlue}`}>
            <span className={styles.statNum}>{stats.pending}</span>
            <span className={styles.statLabel}>Bekleyen</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${tab === 'editor' ? styles.tabActive : ''}`}
          onClick={() => setTab('editor')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
          Şablon Editörü
        </button>
        <button className={`${styles.tabBtn} ${tab === 'logs' ? styles.tabActive : ''}`}
          onClick={() => setTab('logs')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          Mail Logları
          {stats.failed > 0 && <span className={styles.logsBadge}>{stats.failed}</span>}
        </button>
      </div>

      {/* ════════════ EDITOR TAB ════════════ */}
      {tab === 'editor' && (
        <div className={styles.editorLayout}>
          {/* Left: template list */}
          <aside className={styles.templateList}>
            <div className={styles.listHeader}>Tetikleyiciler</div>
            {templates.map(t => (
              <button
                key={t.id}
                className={`${styles.templateItem} ${selected?.id === t.id ? styles.templateItemActive : ''}`}
                onClick={() => selectTemplate(t)}
                style={{ '--accent': t.accentColor } as React.CSSProperties}
              >
                <span className={styles.templateIcon}>{TRIGGER_ICONS[t.id] ?? '📧'}</span>
                <div className={styles.templateItemContent}>
                  <span className={styles.templateItemName}>{t.name}</span>
                  <span className={styles.templateItemTrigger}>{t.trigger}</span>
                </div>
                <span className={styles.templateDot} style={{ background: t.accentColor }} />
              </button>
            ))}

            {/* Resend config box */}
            <div className={styles.configBox}>
              <div className={styles.configTitle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Resend Entegrasyonu
              </div>
              <p className={styles.configDesc}>
                Gerçek e-posta göndermek için:
              </p>
              <div className={styles.configCode}>
                <code>npm install resend</code>
              </div>
              <div className={styles.configCode}>
                <code>RESEND_API_KEY=re_xxxx</code>
              </div>
              <p className={styles.configDesc} style={{ marginTop: '8px' }}>
                .env.local dosyasına ekleyin. API key yokken <strong>mock</strong> mod aktif.
              </p>
            </div>
          </aside>

          {/* Right: editor + preview */}
          {selected ? (
            <div className={styles.editorMain}>
              {/* Template header */}
              <div className={styles.editorHeader}
                style={{ borderLeftColor: selected.accentColor }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{TRIGGER_ICONS[selected.id]}</span>
                    <h2 className={styles.editorTitle}>{selected.name}</h2>
                    {isDirty && <span className={styles.dirtyBadge}>● Kaydedilmemiş</span>}
                  </div>
                  <p className={styles.editorDesc}>{selected.trigger}</p>
                </div>
                <div className={styles.editorActions}>
                  <button
                    className={styles.previewBtn}
                    onClick={handlePreview}
                    disabled={previewing}
                  >
                    {previewing ? <span className={styles.miniSpin} /> : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    Önizle
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                  >
                    {saving ? <span className={styles.miniSpin} style={{ borderTopColor: '#0a0f1e' }} /> : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                      </svg>
                    )}
                    Kaydet
                  </button>
                </div>
              </div>

              {/* View toggle: editor / preview */}
              <div className={styles.viewToggle}>
                <button className={`${styles.viewBtn} ${!showPreview ? styles.viewBtnActive : ''}`}
                  onClick={() => setShowPreview(false)}>Editör</button>
                <button className={`${styles.viewBtn} ${showPreview ? styles.viewBtnActive : ''}`}
                  onClick={() => { if (!previewHtml) handlePreview(); else setShowPreview(true); }}>
                  Önizleme
                </button>
              </div>

              {!showPreview ? (
                <div className={styles.editorFields}>
                  {/* Subject */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      Konu Satırı
                      <span className={styles.fieldHint}>{'{{'}değişkenler{'}}'}  kullanabilirsiniz</span>
                    </label>
                    <input
                      className={styles.subjectInput}
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      placeholder="Konu satırı…"
                    />
                  </div>

                  {/* Variables */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      Kullanılabilir Değişkenler
                      <span className={styles.fieldHint}>Tıklayarak HTML editörüne ekle</span>
                    </label>
                    <div className={styles.varChips}>
                      {selected.variables.map(v => (
                        <button key={v} className={styles.varChip} onClick={() => insertVar(v)}>
                          {'{{' + v + '}}'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML editor */}
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>
                      HTML İçerik
                      <span className={styles.fieldHint}>{`{{BASE_OPEN}} ve {{BASE_CLOSE}} header/footer oluşturur`}</span>
                    </label>
                    <textarea
                      className={styles.htmlEditor}
                      value={editHtml}
                      onChange={e => setEditHtml(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.previewPane}>
                  <div className={styles.previewBrowser}>
                    <div className={styles.browserBar}>
                      <div className={styles.browserDots}>
                        <span style={{ background: '#ff5f57' }} />
                        <span style={{ background: '#febc2e' }} />
                        <span style={{ background: '#28c840' }} />
                      </div>
                      <div className={styles.browserUrl}>
                        📧 {editSubject || 'E-posta önizlemesi'}
                      </div>
                    </div>
                    <iframe
                      ref={iframeRef}
                      className={styles.previewIframe}
                      title="email-preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.editorEmpty}>
              <span style={{ fontSize: '2.5rem' }}>📧</span>
              <p>Sol panelden bir şablon seçin</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════ LOGS TAB ════════════ */}
      {tab === 'logs' && (
        <div className={styles.logsTab}>
          {/* Filter bar */}
          <div className={styles.logsFilter}>
            {(['all', 'sent', 'failed'] as const).map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${logFilter === f ? styles.filterBtnActive : ''}`}
                onClick={() => setLogFilter(f)}
              >
                {f === 'all' ? 'Tümü' : f === 'sent' ? '✓ Gönderildi' : '✗ Başarısız'}
                <span className={styles.filterCount}>
                  {f === 'all' ? stats.total : f === 'sent' ? stats.sent : stats.failed}
                </span>
              </button>
            ))}
          </div>

          {/* Log table */}
          <div className={styles.logsTable}>
            <div className={styles.logsTableHead}>
              <span>Durum</span>
              <span>Alıcı</span>
              <span>Şablon</span>
              <span>Konu</span>
              <span>Tarih</span>
              <span></span>
            </div>
            {filteredLogs.length === 0 ? (
              <div className={styles.logsEmpty}>
                <span>📭</span>
                <p>Henüz log yok.</p>
              </div>
            ) : filteredLogs.map(log => (
              <div key={log.id} className={styles.logRow} onClick={() => setLogDetail(log)}>
                <span>
                  <span className={`${styles.statusDot} ${
                    log.status === 'sent' ? styles.statusSent :
                    log.status === 'failed' ? styles.statusFailed : styles.statusPending
                  }`} />
                  <span className={styles.statusText}>
                    {log.status === 'sent' ? 'Gönderildi' : log.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                  </span>
                </span>
                <span className={styles.logTo}>{log.to}</span>
                <span className={styles.logTemplate}>
                  {TRIGGER_ICONS[log.templateId]} {log.templateName}
                </span>
                <span className={styles.logSubject} title={log.subject}>{log.subject}</span>
                <span className={styles.logDate} title={formatDateTime(log.sentAt)}>
                  {timeAgo(log.sentAt)}
                </span>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555f75" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Log detail modal ── */}
      {logDetail && (
        <div className={styles.modalBackdrop} onClick={() => setLogDetail(null)}>
          <div className={styles.logModal} onClick={e => e.stopPropagation()}>
            <div className={styles.logModalHeader}>
              <div>
                <span className={`${styles.statusDot} ${logDetail.status === 'sent' ? styles.statusSent : styles.statusFailed}`} style={{ width: 10, height: 10 }} />
                <span style={{ marginLeft: 8, fontWeight: 700, color: '#f0f4ff' }}>
                  {logDetail.status === 'sent' ? 'Başarıyla Gönderildi' : 'Gönderim Başarısız'}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={() => setLogDetail(null)}>✕</button>
            </div>
            <div className={styles.logModalBody}>
              <div className={styles.logDetailGrid}>
                <div><div className={styles.logDetailLabel}>Şablon</div><div className={styles.logDetailVal}>{TRIGGER_ICONS[logDetail.templateId]} {logDetail.templateName}</div></div>
                <div><div className={styles.logDetailLabel}>Alıcı</div><div className={styles.logDetailVal}>{logDetail.to}</div></div>
                <div><div className={styles.logDetailLabel}>Konu</div><div className={styles.logDetailVal}>{logDetail.subject}</div></div>
                <div><div className={styles.logDetailLabel}>Tarih</div><div className={styles.logDetailVal}>{formatDateTime(logDetail.sentAt)}</div></div>
              </div>
              {logDetail.error && (
                <div className={styles.errorBox}>
                  <span className={styles.errorBoxLabel}>Hata Detayı</span>
                  <code className={styles.errorBoxCode}>{logDetail.error}</code>
                </div>
              )}
              {Object.keys(logDetail.metadata).length > 0 && (
                <div className={styles.metaBox}>
                  <span className={styles.metaBoxLabel}>Metadata</span>
                  {Object.entries(logDetail.metadata).map(([k, v]) => (
                    <div key={k} className={styles.metaRow}>
                      <span className={styles.metaKey}>{k}</span>
                      <span className={styles.metaVal}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastErr : styles.toastOk}`}>
          {toast.type === 'success'
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          }
          {toast.msg}
        </div>
      )}
    </div>
  );
}
