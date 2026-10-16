import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { createStation, getStations } from '@/lib/stations';
import { isRecord } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  return NextResponse.json({ stations: getStations() });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Geçersiz istasyon verisi.' }, { status: 400 });
  }
  const { name, location, latitude, longitude, measurements, measuredAt } = body;
  if (
    typeof name !== 'string' || !name.trim() || name.length > 120 ||
    typeof location !== 'string' || !location.trim() || location.length > 240 ||
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    measuredAt !== undefined ||
    measurements !== undefined
  ) {
    return NextResponse.json({ error: 'Geçersiz istasyon verisi. Ölçümleri istasyon ölçüm uç noktasına gönderin.' }, { status: 400 });
  }

  try {
    const station = createStation({
      name: name.trim(),
      location: location.trim(),
      latitude,
      longitude,
    });
    return NextResponse.json({ station }, { status: 201 });
  } catch (error) {
    console.error('İstasyon kaydedilemedi:', error);
    return NextResponse.json({ error: 'İstasyon kaydedilemedi.' }, { status: 500 });
  }
}
