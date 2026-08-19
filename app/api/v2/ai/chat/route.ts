import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_CONTEXT = `Sen AquaGuard platformunun yapay zeka asistanısın. 
Su kalitesi izleme ve analiz konusunda uzman bir chatbotsun.
Türkçe, kısa ve net cevaplar ver. Teknik terimleri açıkla.
Bilmediğin şeyleri uydurma, "Bu konuda yardımcı olamıyorum" de.

Mevcut izleme noktaları:
- Ergene Nehri (Tekirdağ): pH 4.2 (KRİTİK), Yüksek Risk
- Sapanca Gölü (Sakarya): Çözünmüş O2 1.8 mg/L (KRİTİK), Yüksek Risk  
- Gediz Havzası (İzmir): Ağır Metal 0.21 mg/L (UYARI), Orta Risk
- Melen Çayı (Düzce): Tüm parametreler normal, Düşük Risk`

import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'super_admin', 'uzman'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message } = await req.json()
    if (!message) return NextResponse.json({ error: 'Mesaj gerekli' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // Fallback: rule-based responses
      const lower = message.toLowerCase()
      let reply = 'Üzgünüm, şu an yapay zeka servisine bağlanamıyorum.'
      if (lower.includes('riskli')) reply = '🔴 En riskli nokta **Ergene Nehri**\'dir. pH değeri 4.2 ile kritik asidik seviyede.'
      else if (lower.includes('ph')) reply = '🧪 Ergene Nehri pH: 4.2 (kritik). Normal aralık 6.5–8.5. Acil müdahale gerekiyor.'
      else if (lower.includes('oksijen')) reply = '💨 Sapanca Gölü\'nde çözünmüş oksijen 1.8 mg/L — kritik düşük (norm: ≥5 mg/L).'
      else if (lower.includes('genel') || lower.includes('durum')) reply = '📊 4 noktadan 2\'si kritik, 1\'i uyarı seviyesinde. Ergene ve Sapanca acil müdahale bekliyor.'
      return NextResponse.json({ success: true, reply })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent(`${SYSTEM_CONTEXT}\n\nKullanıcı: ${message}\n\nAsistan:`)
    const reply = result.response.text()

    return NextResponse.json({ success: true, reply })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
