'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './AiAnalysis.module.css';

/* ── Types ── */
interface Anomaly {
  parameterId: string;
  label: string;
  value: number;
  unit: string;
  normalRange: string;
  severity: 'warning' | 'critical';
  explanation: string;
}

interface AnalysisResult {
  riskScore: number;
  riskLevel: string;
  riskColor: string;
  anomalies: Anomaly[];
  summary: string;
  recommendations: string[];
}

interface SampleResult {
  sample: { location: string; date: string; params: Record<string, number> };
  result: AnalysisResult;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;
}

const PARAM_ICONS: Record<string, string> = {
  ph: '🧪', turbidity: '🌫️', heavyMetal: '⚠️',
  dissolvedO2: '💨', temperature: '🌡️', conductivity: '⚡',
};

const PARAM_LABELS: Record<string, string> = {
  ph: 'pH', turbidity: 'Bulanıklık', heavyMetal: 'Ağır Metal',
  dissolvedO2: 'Çöz. Oksijen', temperature: 'Sıcaklık', conductivity: 'İletkenlik',
};

const PARAM_UNITS: Record<string, string> = {
  ph: '', turbidity: 'NTU', heavyMetal: 'mg/L',
  dissolvedO2: 'mg/L', temperature: '°C', conductivity: 'μS/cm',
};

function formatTime(d: Date) {
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════ */
export default function AiAnalysisClient() {
  const [results, setResults] = useState<SampleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number>(0);
  const [tab, setTab] = useState<'analysis' | 'chat'>('analysis');

  /* Chat state */
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'bot-0', role: 'bot',
      text: '👋 Merhaba! Ben **AquaBot**, AquaGuard yapay zeka asistanınız.\n\nSu kalitesi, risk analizleri ve parametre bilgileri hakkında bana soru sorabilirsiniz.\n\nÖrnekler:\n- "En riskli su kaynağı hangisi?"\n- "Genel kalite durumu nasıl?"\n- "pH değerleri normal mi?"',
      time: formatTime(new Date()),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Fetch all analyses */
  useEffect(() => {
    fetch('/api/ai/analyze')
      .then(r => r.json())
      .then(d => { if (d.success) setResults(d.results); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* Scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Send chat */
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`, role: 'user',
      text: chatInput.trim(), time: formatTime(new Date()),
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`, role: 'bot',
        text: data.success ? data.reply : 'Bir hata oluştu. Lütfen tekrar deneyin.',
        time: formatTime(new Date()),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `bot-err-${Date.now()}`, role: 'bot',
        text: 'Bağlantı hatası. Lütfen tekrar deneyin.', time: formatTime(new Date()),
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading]);

  const cur = results[selected];

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>AI analiz yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <span className={styles.aiIcon}>🤖</span>
            AI Su Kalitesi Analizi
          </h1>
          <p className={styles.pageSubtitle}>Gemini destekli anomali tespiti, risk skorlama ve doğal dil sorgulama</p>
        </div>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${tab === 'analysis' ? styles.tabActive : ''}`}
            onClick={() => setTab('analysis')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Analiz Paneli
          </button>
          <button className={`${styles.tabBtn} ${tab === 'chat' ? styles.tabActive : ''}`}
            onClick={() => setTab('chat')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AquaBot Chat
          </button>
        </div>
      </div>

      {/* ════════ ANALYSIS TAB ════════ */}
      {tab === 'analysis' && cur && (
        <div className={styles.analysisLayout}>
          {/* Left: Location cards */}
          <aside className={styles.locationList}>
            <div className={styles.listHeader}>İzleme Noktaları</div>
            {results.map((r, i) => (
              <button key={i}
                className={`${styles.locationCard} ${i === selected ? styles.locationActive : ''}`}
                onClick={() => setSelected(i)}
              >
                <div className={styles.locationTop}>
                  <span className={styles.locationName}>{r.sample.location}</span>
                  <span className={styles.riskBadge}
                    style={{ color: r.result.riskColor, borderColor: `${r.result.riskColor}44`, background: `${r.result.riskColor}12` }}>
                    {r.result.riskScore}
                  </span>
                </div>
                <div className={styles.locationMeta}>
                  📅 {r.sample.date}
                  <span className={styles.anomalyCount}>
                    {r.result.anomalies.length > 0 ? `${r.result.anomalies.length} anomali` : '✓ Normal'}
                  </span>
                </div>
                {/* Mini param bars */}
                <div className={styles.miniParams}>
                  {Object.entries(r.sample.params).slice(0, 4).map(([k, v]) => (
                    <span key={k} className={styles.miniParam}>
                      {PARAM_ICONS[k]} {typeof v === 'number' ? v : '—'}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </aside>

          {/* Right: Analysis detail */}
          <div className={styles.analysisMain}>
            {/* Risk gauge */}
            <div className={styles.riskGaugeCard}>
              <div className={styles.gaugeLeft}>
                <div className={styles.gaugeCircle}
                  style={{ '--risk-color': cur.result.riskColor, '--risk-pct': `${cur.result.riskScore}%` } as React.CSSProperties}>
                  <svg viewBox="0 0 120 120" className={styles.gaugeSvg}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={cur.result.riskColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${cur.result.riskScore * 3.27} 327`}
                      transform="rotate(-90 60 60)"
                      style={{ filter: `drop-shadow(0 0 6px ${cur.result.riskColor})`, transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <div className={styles.gaugeCenter}>
                    <span className={styles.gaugeScore} style={{ color: cur.result.riskColor }}>{cur.result.riskScore}</span>
                    <span className={styles.gaugeMax}>/100</span>
                  </div>
                </div>
                <div className={styles.gaugeInfo}>
                  <span className={styles.gaugeLevel} style={{ color: cur.result.riskColor }}>
                    {cur.result.riskLevel === 'low' ? '🟢 Düşük Risk' :
                     cur.result.riskLevel === 'medium' ? '🟡 Orta Risk' :
                     cur.result.riskLevel === 'high' ? '🟠 Yüksek Risk' : '🔴 Kritik Risk'}
                  </span>
                  <span className={styles.gaugeLocation}>📍 {cur.sample.location}</span>
                </div>
              </div>

              {/* Parameter grid */}
              <div className={styles.paramGrid}>
                {Object.entries(cur.sample.params).map(([k, v]) => {
                  const anomaly = cur.result.anomalies.find(a => a.parameterId === k);
                  return (
                    <div key={k} className={`${styles.paramCell} ${anomaly ? (anomaly.severity === 'critical' ? styles.paramCritical : styles.paramWarning) : ''}`}>
                      <div className={styles.paramIcon}>{PARAM_ICONS[k] ?? '📊'}</div>
                      <div className={styles.paramVal}>
                        <span style={anomaly ? { color: anomaly.severity === 'critical' ? '#ff4444' : '#f59e0b' } : {}}>
                          {v}
                        </span>
                        <span className={styles.paramUnit}>{PARAM_UNITS[k]}</span>
                      </div>
                      <div className={styles.paramLabel}>{PARAM_LABELS[k] ?? k}</div>
                      {anomaly && (
                        <span className={styles.paramStatus} style={{ color: anomaly.severity === 'critical' ? '#ff4444' : '#f59e0b' }}>
                          {anomaly.severity === 'critical' ? '⛔ Kritik' : '⚠️ Uyarı'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Summary */}
            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>🤖</span>
                <h3>AI Değerlendirmesi</h3>
              </div>
              <p className={styles.summaryText}>{cur.result.summary}</p>
            </div>

            {/* Anomalies */}
            {cur.result.anomalies.length > 0 && (
              <div className={styles.anomaliesCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardIcon}>🔍</span>
                  <h3>Tespit Edilen Anomaliler</h3>
                  <span className={styles.anomalyBadge}>{cur.result.anomalies.length}</span>
                </div>
                <div className={styles.anomalyList}>
                  {cur.result.anomalies.map((a, i) => (
                    <div key={i} className={`${styles.anomalyItem} ${a.severity === 'critical' ? styles.anomalyCritical : styles.anomalyWarning}`}>
                      <div className={styles.anomalyHeader}>
                        <span className={styles.anomalyLabel}>{PARAM_ICONS[a.parameterId]} {a.label}</span>
                        <span className={styles.anomalySeverity}
                          style={{ color: a.severity === 'critical' ? '#ff4444' : '#f59e0b' }}>
                          {a.severity === 'critical' ? '⛔ Kritik' : '⚠️ Uyarı'}
                        </span>
                      </div>
                      <div className={styles.anomalyValues}>
                        <span>Ölçülen: <strong style={{ color: a.severity === 'critical' ? '#ff4444' : '#f59e0b' }}>
                          {a.value} {a.unit}
                        </strong></span>
                        <span>Normal: <strong>{a.normalRange}</strong></span>
                      </div>
                      <p className={styles.anomalyExplanation}>{a.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className={styles.recsCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>💡</span>
                <h3>AI Önerileri</h3>
              </div>
              <div className={styles.recsList}>
                {cur.result.recommendations.map((rec, i) => (
                  <div key={i} className={styles.recItem}>
                    <span className={styles.recNum}>{i + 1}</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ CHAT TAB ════════ */}
      {tab === 'chat' && (
        <div className={styles.chatLayout}>
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div className={styles.chatBotAvatar}>🤖</div>
              <div>
                <span className={styles.chatBotName}>AquaBot</span>
                <span className={styles.chatBotStatus}>
                  <span className={styles.onlineDot} />
                  Gemini ile çalışıyor
                </span>
              </div>
            </div>

            <div className={styles.chatMessages}>
              {messages.map(msg => (
                <div key={msg.id} className={`${styles.chatBubble} ${msg.role === 'user' ? styles.chatUser : styles.chatBot}`}>
                  {msg.role === 'bot' && <div className={styles.bubbleAvatar}>🤖</div>}
                  <div className={styles.bubbleContent}>
                    <div className={styles.bubbleText}
                      dangerouslySetInnerHTML={{
                        __html: msg.text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    <span className={styles.bubbleTime}>{msg.time}</span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className={`${styles.chatBubble} ${styles.chatBot}`}>
                  <div className={styles.bubbleAvatar}>🤖</div>
                  <div className={styles.bubbleContent}>
                    <div className={styles.typingDots}>
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.chatInputArea}>
              <div className={styles.chatSuggestions}>
                {['En riskli su kaynağı hangisi?', 'Genel kalite durumu nasıl?', 'pH değerleri normal mi?'].map(q => (
                  <button key={q} className={styles.suggestionBtn}
                    onClick={() => { setChatInput(q); }}>
                    {q}
                  </button>
                ))}
              </div>
              <div className={styles.chatInputRow}>
                <input
                  className={styles.chatInput}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="AquaBot'a bir soru sorun…"
                  disabled={chatLoading}
                />
                <button className={styles.sendBtn} onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Chat sidebar — quick stats */}
          <aside className={styles.chatSidebar}>
            <div className={styles.sidebarTitle}>📊 Anlık Özet</div>
            {results.map((r, i) => (
              <div key={i} className={styles.sidebarItem}>
                <div className={styles.sidebarItemTop}>
                  <span className={styles.sidebarLoc}>{r.sample.location.split(',')[0]}</span>
                  <span className={styles.sidebarScore} style={{ color: r.result.riskColor }}>
                    {r.result.riskScore}
                  </span>
                </div>
                <div className={styles.sidebarBar}>
                  <div className={styles.sidebarBarFill}
                    style={{ width: `${r.result.riskScore}%`, background: r.result.riskColor }} />
                </div>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
