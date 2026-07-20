/* POST /api/ai/chat — AI chatbot */
import { NextRequest, NextResponse } from 'next/server';
import { chatWithGemini, DEMO_SAMPLES, analyzeWithGemini } from '@/lib/ai';

/* Build context from current data */
async function buildContext(): Promise<string> {
  const analyses = await Promise.all(
    DEMO_SAMPLES.map(async s => {
      const r = await analyzeWithGemini(s);
      return `📍 ${s.location} (${s.date}): Risk ${r.riskScore}/100 (${r.riskLevel}). Anomaliler: ${r.anomalies.map(a => `${a.label}=${a.value}${a.unit}`).join(', ') || 'Yok'}`;
    })
  );
  return analyses.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ success: false, message: 'Mesaj boş olamaz.' }, { status: 400 });
    }

    const context = await buildContext();
    const reply = await chatWithGemini(message.trim(), context);

    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json({ success: false, message: 'Chat hatası.' }, { status: 500 });
  }
}
