import { NextRequest, NextResponse } from 'next/server';
import { getPublicIncidentTracking } from '@/lib/incidents';
import { trackingCodeSchema } from '@/lib/incident-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingCode: string }> },
) {
  const { trackingCode: rawCode } = await params;
  const parsedCode = trackingCodeSchema.safeParse(rawCode);
  if (!parsedCode.success) {
    return NextResponse.json({ error: 'Takip kodunun biçimini kontrol edin.' }, { status: 400 });
  }

  try {
    const incident = getPublicIncidentTracking(parsedCode.data);
    if (!incident) {
      return NextResponse.json({ error: 'Bu takip koduyla eşleşen bir ihbar bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json({ incident }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('Public incident tracking lookup failed:', error);
    return NextResponse.json({ error: 'İhbar bilgisi şu anda yüklenemiyor.' }, { status: 500 });
  }
}
