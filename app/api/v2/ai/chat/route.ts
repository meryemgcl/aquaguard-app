import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_CONTEXT = `Sen AquaGuard'ın çevre asistanısın. Görevin doğayı koruyan uzmanlara ve halka yardımcı olmak.
Çok teknik, soğuk ve "robotik" bir dil yerine; samimi, yardımsever ve doğal bir dil kullan. Cümlelerin sıcak olsun.
Bilmediğin durumlarda "Bunu tam olarak bilemiyorum ama birlikte araştırabiliriz" gibi insani tepkiler ver.
Kesinlikle "Ben bir yapay zeka asistanıyım" gibi mekanik girişler yapma. Doğayı ve suyu ne kadar önemsediğini hissettir.

Özet Ekosistem Durumu:
- Ergene Nehri (Tekirdağ): pH 4.2. Ne yazık ki çok asidik, su canlıları için tehlikeli boyutta.
- Sapanca Gölü (Sakarya): Çözünmüş Oksijen 1.8 mg/L. Göldeki oksijen çok düşük, acil havalandırma gerekebilir.
- Gediz Havzası (İzmir): Ağır Metal 0.21 mg/L. Sınırın biraz üzerinde, dikkatle izlenmeli.
- Melen Çayı (Düzce): Her şey yolunda, suyumuz pırıl pırıl.`

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
      let reply = 'Şu an sistemde ufak bir bağlantı sorunu var galiba, doğa biraz dinlenmek istiyor olabilir. Lütfen birazdan tekrar dene.'
      if (lower.includes('riskli')) reply = 'Maalesef şu an en riskli nokta Ergene Nehri gibi görünüyor. pH değeri 4.2 seviyelerinde, bu da su canlıları için çok asidik ve tehlikeli.'
      else if (lower.includes('ph')) reply = 'Ergene Nehri\'nin pH değeri 4.2. İdeal olan 6.5–8.5 aralığıdır. Ne yazık ki acil müdahale şart.'
      else if (lower.includes('oksijen')) reply = 'Sapanca Gölü\'nde oksijen seviyesi 1.8 mg/L. Balıklar nefes almakta zorlanıyor olabilir, acilen incelemeliyiz.'
      else if (lower.includes('genel') || lower.includes('durum')) reply = 'Genel olarak baktığımda, Ergene ve Sapanca acil yardımımızı bekliyor. Melen Çayı ise pırıl pırıl.'
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
