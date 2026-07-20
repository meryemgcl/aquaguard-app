/* POST /api/ai/analyze — Analyze water sample */
import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithGemini, DEMO_SAMPLES, WaterSample } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sample: WaterSample = body.sample ?? DEMO_SAMPLES[0];

    const result = await analyzeWithGemini(sample);

    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ success: false, message: 'Analiz hatası.' }, { status: 500 });
  }
}

/* GET /api/ai/analyze — Analyze all demo samples */
export async function GET() {
  try {
    const results = await Promise.all(
      DEMO_SAMPLES.map(async sample => ({
        sample,
        result: await analyzeWithGemini(sample),
      }))
    );

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ success: false, message: 'Toplu analiz hatası.' }, { status: 500 });
  }
}
