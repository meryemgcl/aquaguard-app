import { NextRequest, NextResponse } from 'next/server'
import { analyzeReport } from '@/lib/ai'

/* ── Statik demo örnekleri ── */
const DEMO_SAMPLES = [
  {
    location: 'Ergene Nehri, Tekirdağ',
    date: '2026-08-05',
    params: { ph: 4.2, turbidity: 38, dissolvedO2: 5.1, temperature: 22, conductivity: 850, heavyMetal: 0.08 },
  },
  {
    location: 'Sapanca Gölü, Sakarya',
    date: '2026-08-05',
    params: { ph: 6.8, turbidity: 12, dissolvedO2: 1.8, temperature: 26, conductivity: 320, heavyMetal: 0.02 },
  },
  {
    location: 'Gediz Havzası, İzmir',
    date: '2026-08-04',
    params: { ph: 7.2, turbidity: 22, dissolvedO2: 6.5, temperature: 24, conductivity: 580, heavyMetal: 0.21 },
  },
  {
    location: 'Melen Çayı, Düzce',
    date: '2026-08-04',
    params: { ph: 7.6, turbidity: 4, dissolvedO2: 8.9, temperature: 18, conductivity: 210, heavyMetal: 0.01 },
  },
]

/* ── Statik analiz sonuçları (API maliyeti olmadan) ── */
function analyzeLocally(params: Record<string, number>) {
  const anomalies: any[] = []

  if (params.ph < 6.5 || params.ph > 8.5) {
    anomalies.push({ parameterId: 'ph', label: 'pH', value: params.ph, unit: '', normalRange: '6.5 – 8.5', severity: params.ph < 5 || params.ph > 9 ? 'critical' : 'warning', explanation: `pH değeri ${params.ph < 6.5 ? 'asidik' : 'bazik'} sınırlar dışında.` })
  }
  if (params.turbidity > 20) {
    anomalies.push({ parameterId: 'turbidity', label: 'Bulanıklık', value: params.turbidity, unit: 'NTU', normalRange: '0 – 20 NTU', severity: params.turbidity > 50 ? 'critical' : 'warning', explanation: 'Bulanıklık içme suyu standartlarını aşıyor.' })
  }
  if (params.dissolvedO2 < 5) {
    anomalies.push({ parameterId: 'dissolvedO2', label: 'Çözünmüş Oksijen', value: params.dissolvedO2, unit: 'mg/L', normalRange: '≥ 5 mg/L', severity: params.dissolvedO2 < 2 ? 'critical' : 'warning', explanation: 'Düşük oksijen su canlı yaşamını tehdit ediyor.' })
  }
  if (params.heavyMetal > 0.1) {
    anomalies.push({ parameterId: 'heavyMetal', label: 'Ağır Metal', value: params.heavyMetal, unit: 'mg/L', normalRange: '< 0.1 mg/L', severity: params.heavyMetal > 0.5 ? 'critical' : 'warning', explanation: 'Endüstriyel kaynaklı ağır metal kirliliği tespit edildi.' })
  }

  const score = Math.min(100, Math.round(anomalies.reduce((s, a) => s + (a.severity === 'critical' ? 35 : 20), 10)))
  const level = score < 30 ? 'low' : score < 60 ? 'medium' : score < 80 ? 'high' : 'critical'
  const color = { low: '#00ff88', medium: '#f59e0b', high: '#ff6b35', critical: '#ff4444' }[level]

  const summaries: Record<string, string> = {
    low: 'Su kalitesi parametreleri genel olarak normal sınırlar içinde. Rutin izleme önerilir.',
    medium: `${anomalies.length} parametrede sapma tespit edildi. Kaynak araştırması yapılmalıdır.`,
    high: `${anomalies.length} kritik parametre sınır değerleri aşıyor. Acil müdahale planlanmalıdır.`,
    critical: 'Birden fazla kritik sapma tespit edildi. Derhal müdahale ve kaynağın izolasyonu gereklidir.',
  }

  return {
    riskScore: score,
    riskLevel: level,
    riskColor: color,
    anomalies,
    summary: summaries[level],
    recommendations: anomalies.length === 0
      ? ['Rutin aylık ölçüm planına devam edin.', 'Mevcut filtre ve arıtma sistemlerini kontrol edin.']
      : anomalies.map(a => `${a.label} için kaynağa yönelik inceleme başlatın.`).concat(['Çevre Bakanlığı\'na durum raporu gönderin.']),
  }
}

import { verifyToken } from '@/lib/auth'

/* GET — Tüm demo analizleri döndür */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const payload = await verifyToken(token);
  if (!payload || !['admin', 'super_admin', 'uzman'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = DEMO_SAMPLES.map(sample => ({
    sample,
    result: analyzeLocally(sample.params),
  }))
  return NextResponse.json({ success: true, results })
}

/* POST — Tekil rapor analizi (Kanban kartlarından) */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'super_admin', 'uzman'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { description } = await req.json()
    if (!description) return NextResponse.json({ error: 'Açıklama zorunludur.' }, { status: 400 })
    const result = await analyzeReport(description)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 })
  }
}
