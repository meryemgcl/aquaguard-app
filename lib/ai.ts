import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AIAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  explanation: string
  suggestedAction: string
  draftEmail: string
}

export async function analyzeReport(description: string): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ortam değişkeni ayarlanmamış.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const prompt = `
  Sen AquaGuard isimli bir su kalitesi ve çevre koruma sisteminin yapay zeka asistanısın. 
  Aşağıda bir su kirliliği veya kalite sorunu ihbar/rapor metni bulunuyor.
  Bu raporu analiz et ve bana SADECE aşağıdaki JSON formatında cevap ver.
  Backtick, "json" etiketi veya herhangi bir markdown kullanma. Sadece ham JSON döndür.

  {
    "riskLevel": "low" | "medium" | "high" | "critical",
    "explanation": "Bu risk seviyesini neden seçtiğinin 2-3 cümlelik açıklaması",
    "suggestedAction": "İlgili ekibin atması gereken ilk ve en kritik adım",
    "draftEmail": "Çevre Bakanlığı veya ilgili belediyeye gönderilecek resmi ihbar dilekçesi/e-posta taslağı (Türkçe, resmi dil)"
  }

  Rapor:
  "${description}"
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const cleanedText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const parsed = JSON.parse(cleanedText) as AIAnalysisResult
    return parsed
  } catch (error) {
    console.error('AI Analysis failed:', error)
    throw new Error('Yapay zeka analizi sırasında bir hata oluştu.')
  }
}
