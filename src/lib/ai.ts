/* ============================================================
   AquaGuard — AI Engine (Google Gemini)
   Anomaly detection, risk scoring, report summary, chatbot
   ============================================================ */

import { GoogleGenAI, Type } from '@google/genai';

/* ── Water quality parameter definitions ── */
export interface WaterParameter {
  id: string;
  label: string;
  unit: string;
  min: number;        // normal range min
  max: number;        // normal range max
  criticalMin?: number;
  criticalMax?: number;
  weight: number;     // importance weight for risk scoring
  icon: string;
}

export const WATER_PARAMS: WaterParameter[] = [
  { id: 'ph',          label: 'pH',                   unit: '',        min: 6.5, max: 8.5,  criticalMin: 4.0, criticalMax: 10.0, weight: 0.20, icon: '🧪' },
  { id: 'turbidity',   label: 'Bulanıklık',           unit: 'NTU',     min: 0,   max: 5,    criticalMax: 25,                    weight: 0.15, icon: '🌫️' },
  { id: 'heavyMetal',  label: 'Ağır Metal',           unit: 'mg/L',    min: 0,   max: 0.05, criticalMax: 0.2,                   weight: 0.25, icon: '⚠️' },
  { id: 'dissolvedO2', label: 'Çözünmüş Oksijen',    unit: 'mg/L',    min: 5,   max: 14,   criticalMin: 2,                     weight: 0.20, icon: '💨' },
  { id: 'temperature', label: 'Sıcaklık',             unit: '°C',      min: 5,   max: 25,   criticalMin: 0, criticalMax: 35,    weight: 0.10, icon: '🌡️' },
  { id: 'conductivity',label: 'İletkenlik',            unit: 'μS/cm',   min: 100, max: 1500, criticalMax: 3000,                  weight: 0.10, icon: '⚡' },
];

export interface WaterSample {
  location: string;
  date: string;
  params: Record<string, number>;
}

export interface Anomaly {
  parameterId: string;
  label: string;
  value: number;
  unit: string;
  normalRange: string;
  severity: 'warning' | 'critical';
  explanation: string;
}

export interface AnalysisResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskColor: string;
  anomalies: Anomaly[];
  summary: string;
  recommendations: string[];
  rawResponse?: string;
}

/* ── Local anomaly detection (no API needed) ── */
export function detectAnomalies(sample: WaterSample): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const param of WATER_PARAMS) {
    const value = sample.params[param.id];
    if (value === undefined || value === null) continue;

    const normalRange = `${param.min}–${param.max} ${param.unit}`;
    let severity: 'warning' | 'critical' | null = null;
    let explanation = '';

    if (value < param.min) {
      if (param.criticalMin !== undefined && value <= param.criticalMin) {
        severity = 'critical';
        explanation = `${param.label} değeri (${value} ${param.unit}) kritik düzeyde düşük. Normal alt sınır ${param.min} ${param.unit}.`;
      } else {
        severity = 'warning';
        explanation = `${param.label} değeri (${value} ${param.unit}) normal aralığın altında. Beklenen: ${normalRange}.`;
      }
    } else if (value > param.max) {
      if (param.criticalMax !== undefined && value >= param.criticalMax) {
        severity = 'critical';
        explanation = `${param.label} değeri (${value} ${param.unit}) kritik düzeyde yüksek! Normal üst sınır ${param.max} ${param.unit}.`;
      } else {
        severity = 'warning';
        explanation = `${param.label} değeri (${value} ${param.unit}) normal aralığın üstünde. Beklenen: ${normalRange}.`;
      }
    }

    if (severity) {
      anomalies.push({
        parameterId: param.id,
        label: param.label,
        value,
        unit: param.unit,
        normalRange,
        severity,
        explanation,
      });
    }
  }

  return anomalies;
}

/* ── Local risk scoring (no API needed) ── */
export function calculateRiskScore(sample: WaterSample): number {
  let totalScore = 0;

  for (const param of WATER_PARAMS) {
    const value = sample.params[param.id];
    if (value === undefined) continue;

    let paramScore = 0;
    const range = param.max - param.min;

    if (value < param.min) {
      const deviation = (param.min - value) / (param.min - (param.criticalMin ?? 0));
      paramScore = Math.min(deviation * 100, 100);
    } else if (value > param.max) {
      const deviation = (value - param.max) / ((param.criticalMax ?? param.max * 2) - param.max);
      paramScore = Math.min(deviation * 100, 100);
    } else {
      // Within range — score based on distance from ideal midpoint
      const mid = (param.min + param.max) / 2;
      const distFromMid = Math.abs(value - mid) / (range / 2);
      paramScore = distFromMid * 20; // max 20 if at edge of normal
    }

    totalScore += paramScore * param.weight;
  }

  return Math.round(Math.min(Math.max(totalScore, 0), 100));
}

export function scoreToRiskLevel(score: number): { level: string; color: string } {
  if (score <= 30)  return { level: 'Düşük',  color: '#00ff88' };
  if (score <= 60)  return { level: 'Orta',    color: '#f59e0b' };
  if (score <= 80)  return { level: 'Yüksek',  color: '#ff6b35' };
  return { level: 'Kritik', color: '#ff4444' };
}

/* ── Gemini client ── */
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock') return null;
  return new GoogleGenAI({ apiKey });
}

/* ── AI-powered analysis via Gemini ── */
export async function analyzeWithGemini(sample: WaterSample): Promise<AnalysisResult> {
  const anomalies = detectAnomalies(sample);
  const riskScore = calculateRiskScore(sample);
  const risk = scoreToRiskLevel(riskScore);

  const ai = getGemini();

  if (!ai) {
    /* Mock response for development */
    return {
      riskScore,
      riskLevel: riskScore <= 30 ? 'low' : riskScore <= 60 ? 'medium' : riskScore <= 80 ? 'high' : 'critical',
      riskColor: risk.color,
      anomalies,
      summary: generateMockSummary(sample, anomalies, riskScore),
      recommendations: generateMockRecommendations(anomalies),
    };
  }

  /* Build prompt */
  const paramLines = WATER_PARAMS.map(p => {
    const v = sample.params[p.id];
    const status = v === undefined ? 'VERİ YOK'
      : v < p.min ? '⚠️ DÜŞÜK' : v > p.max ? '⚠️ YÜKSEK' : '✅ Normal';
    return `- ${p.label}: ${v ?? '—'} ${p.unit} (Normal: ${p.min}–${p.max}) → ${status}`;
  }).join('\n');

  const prompt = `Sen AquaGuard su kalitesi izleme platformunun yapay zeka asistanısın.

Aşağıdaki su kalitesi verilerini analiz et ve Türkçe olarak yanıtla.

📍 Konum: ${sample.location}
📅 Tarih: ${sample.date}

Ölçüm Sonuçları:
${paramLines}

Hesaplanan Risk Skoru: ${riskScore}/100 (${risk.level})

Lütfen şunları içeren bir analiz yap:
1. Kısa bir genel değerlendirme paragrafı (3-4 cümle, anlaşılır Türkçe)
2. Tespit edilen her anomali için neden tehlikeli olduğunu açıkla
3. En az 3 somut öneri sun

JSON formatında yanıt ver:
{
  "summary": "Genel değerlendirme paragrafı",
  "recommendations": ["Öneri 1", "Öneri 2", "Öneri 3"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['summary', 'recommendations'],
        },
        temperature: 0.4,
      },
    });

    const text = response.text ?? '';
    let parsed: { summary: string; recommendations: string[] };

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text.slice(0, 500), recommendations: [] };
    }

    return {
      riskScore,
      riskLevel: riskScore <= 30 ? 'low' : riskScore <= 60 ? 'medium' : riskScore <= 80 ? 'high' : 'critical',
      riskColor: risk.color,
      anomalies,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      rawResponse: text,
    };
  } catch (err) {
    console.error('[GEMINI ERROR]', err);
    return {
      riskScore,
      riskLevel: riskScore <= 30 ? 'low' : riskScore <= 60 ? 'medium' : riskScore <= 80 ? 'high' : 'critical',
      riskColor: risk.color,
      anomalies,
      summary: generateMockSummary(sample, anomalies, riskScore),
      recommendations: generateMockRecommendations(anomalies),
    };
  }
}

/* ── AI Chatbot via Gemini ── */
export async function chatWithGemini(
  message: string,
  context: string
): Promise<string> {
  const ai = getGemini();

  if (!ai) {
    return generateMockChat(message);
  }

  const systemPrompt = `Sen AquaGuard su kalitesi izleme platformunun yapay zeka asistanısın "AquaBot".
Görevin kullanıcıların su kalitesi hakkındaki sorularını Türkçe olarak yanıtlamak.

Platformdaki güncel veriler:
${context}

Kurallar:
- Her zaman Türkçe yanıt ver
- Kısa, net ve anlaşılır cevaplar ver
- Su kalitesi, çevre ve ekoloji dışındaki sorulara kibarca "Bu konuda yardımcı olamam, su kalitesi hakkında soru sorabilirsiniz." yanıtı ver
- Verilere dayalı somut cevaplar ver, tahmin yapma
- Emoji kullan ama aşırıya kaçma`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${systemPrompt}\n\nKullanıcı sorusu: ${message}`,
      config: { temperature: 0.6, maxOutputTokens: 800 },
    });

    return response.text ?? 'Yanıt üretilemedi. Lütfen tekrar deneyin.';
  } catch (err) {
    console.error('[GEMINI CHAT ERROR]', err);
    return 'AI servisi şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.';
  }
}

/* ── Mock fallbacks ── */
function generateMockSummary(sample: WaterSample, anomalies: Anomaly[], score: number): string {
  if (anomalies.length === 0) {
    return `${sample.location} konumundaki su kalitesi ölçümleri normal sınırlar içinde seyrediyor. Risk skoru ${score}/100 olarak hesaplanmış olup herhangi bir acil müdahale gerektirmemektedir. Tüm parametreler WHO ve ulusal standartlara uygundur.`;
  }

  const criticals = anomalies.filter(a => a.severity === 'critical');
  const warnings = anomalies.filter(a => a.severity === 'warning');

  let summary = `${sample.location} konumunda yapılan ölçümlerde `;
  if (criticals.length > 0) {
    summary += `${criticals.map(a => a.label).join(', ')} parametrelerinde kritik düzeyde anomali tespit edilmiştir. `;
  }
  if (warnings.length > 0) {
    summary += `${warnings.map(a => a.label).join(', ')} parametrelerinde uyarı seviyesinde sapma görülmektedir. `;
  }
  summary += `Genel risk skoru ${score}/100 olarak belirlenmiştir. `;
  if (score > 60) {
    summary += 'Acil müdahale ve detaylı inceleme önerilmektedir.';
  } else {
    summary += 'Durumun yakından takip edilmesi gerekmektedir.';
  }

  return summary;
}

function generateMockRecommendations(anomalies: Anomaly[]): string[] {
  const recs: string[] = [];
  const paramIds = new Set(anomalies.map(a => a.parameterId));

  if (paramIds.has('ph')) {
    recs.push('pH dengesini düzeltmek için nötralizasyon işlemi uygulanmalıdır.');
  }
  if (paramIds.has('dissolvedO2')) {
    recs.push('Çözünmüş oksijen artırmak için havalandırma sistemi kurulmalıdır.');
  }
  if (paramIds.has('heavyMetal')) {
    recs.push('Ağır metal kaynağı tespit edilerek endüstriyel deşarj kontrolü yapılmalıdır.');
  }
  if (paramIds.has('turbidity')) {
    recs.push('Bulanıklığı azaltmak için çöktürme havuzları değerlendirilmelidir.');
  }
  if (paramIds.has('temperature')) {
    recs.push('Sıcaklık anomalisi için termal kirlilik kaynakları araştırılmalıdır.');
  }
  if (paramIds.has('conductivity')) {
    recs.push('Yüksek iletkenlik için tuzluluk ve mineral içeriği detaylı analiz edilmelidir.');
  }

  if (recs.length < 3) {
    recs.push('24 saat aralıklarla tekrar ölçüm yapılmalıdır.');
    recs.push('Çevredeki potansiyel kirlilik kaynaklarının tespiti için saha incelemesi planlanmalıdır.');
    recs.push('Ölçüm sonuçları il çevre müdürlüğüne raporlanmalıdır.');
  }

  return recs.slice(0, 5);
}

function generateMockChat(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('risk') || lower.includes('tehlike')) {
    return '📊 Güncel verilere göre en riskli su kaynağı **Sapanca Gölü** olup, çözünmüş oksijen seviyesi kritik düzeyde düşük (2 mg/L altı). Risk skoru 85/100 (Kritik). Acil havalandırma müdahalesi önerilmektedir.\n\nİkinci sırada **Ergene Nehri** yer almakta (pH anomalisi, risk skoru 72/100).';
  }
  if (lower.includes('kalite') || lower.includes('durum')) {
    return '🌊 **Genel Su Kalitesi Özeti:**\n- 8 aktif izleme noktası var\n- 2 kritik, 3 uyarı seviyesinde anomali mevcut\n- Ortalama risk skoru: 52/100 (Orta)\n- Melen Çayı en temiz kaynak (risk: 18/100)\n- Sapanca Gölü en riskli (risk: 85/100)';
  }
  if (lower.includes('ph') || lower.includes('asit')) {
    return '🧪 **pH Durumu:**\nErgene Nehri\'nde pH 4.2 olarak ölçülmüş — bu ciddi bir asit kirliliği göstergesi. Normal aralık 6.5-8.5\'tir. pH 4.2 su canlıları için hayati tehlike oluşturur. Olası nedenler: endüstriyel deşarj, asit yağmurları.';
  }
  if (lower.includes('merhaba') || lower.includes('selam')) {
    return '👋 Merhaba! Ben **AquaBot**, AquaGuard yapay zeka asistanınız.\n\nSize şu konularda yardımcı olabilirim:\n- 🌊 Su kalitesi durumu\n- ⚠️ Risk analizleri\n- 🧪 Parametre bilgileri\n- 📊 Karşılaştırmalı analizler\n\nNe sormak istersiniz?';
  }

  return `🤖 Su kalitesi verilerini analiz ettim. Sorgunuzla ilgili detaylı bilgi için lütfen daha spesifik bir soru sorun.\n\nÖrnek sorular:\n- "En riskli su kaynağı hangisi?"\n- "pH değerleri normal mi?"\n- "Genel kalite durumu nasıl?"`;
}

/* ── Demo water samples ── */
export const DEMO_SAMPLES: WaterSample[] = [
  {
    location: 'Ergene Nehri, Tekirdağ',
    date: '2026-07-17',
    params: { ph: 4.2, turbidity: 12, heavyMetal: 0.08, dissolvedO2: 4.8, temperature: 22, conductivity: 1800 },
  },
  {
    location: 'Sapanca Gölü, Sakarya',
    date: '2026-07-16',
    params: { ph: 7.1, turbidity: 3, heavyMetal: 0.02, dissolvedO2: 1.8, temperature: 19, conductivity: 420 },
  },
  {
    location: 'Melen Çayı, Düzce',
    date: '2026-07-15',
    params: { ph: 7.4, turbidity: 2, heavyMetal: 0.01, dissolvedO2: 8.5, temperature: 16, conductivity: 350 },
  },
  {
    location: 'Gediz Havzası, İzmir',
    date: '2026-07-14',
    params: { ph: 6.8, turbidity: 8, heavyMetal: 0.12, dissolvedO2: 5.2, temperature: 24, conductivity: 1100 },
  },
  {
    location: 'Kızılırmak, Kırıkkale',
    date: '2026-07-17',
    params: { ph: 7.8, turbidity: 4, heavyMetal: 0.03, dissolvedO2: 7.2, temperature: 18, conductivity: 680 },
  },
];
