import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { createMeasurement, listMeasurements } from '@/lib/measurements';
import type {
  CalibrationStatus,
  MeasurementQuality,
} from '@/lib/measurements';
import { isRecord } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const qualityFlags: MeasurementQuality[] = ['valid', 'suspect', 'invalid'];
const calibrationStatuses: CalibrationStatus[] = ['current', 'due', 'unknown', 'not_applicable'];
const parameterPattern = /^[a-z][a-z0-9_]{0,39}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  const { id } = await params;
  const parameter = request.nextUrl.searchParams.get('parameter') ?? undefined;
  const rows = listMeasurements({ stationId: id, parameter, limit: 500 });
  return NextResponse.json({ measurements: rows });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Geçersiz ölçüm verisi.' }, { status: 400 });
  }

  const {
    parameter, value, unit, measuredAt, source, sourceRecordId, qualityFlag, calibrationStatus,
  } = body;
  if (
    typeof parameter !== 'string' || !parameterPattern.test(parameter) ||
    typeof value !== 'number' || !Number.isFinite(value) ||
    typeof unit !== 'string' || !unit.trim() || unit.trim().length > 24 ||
    typeof measuredAt !== 'string' || !Number.isFinite(Date.parse(measuredAt)) ||
    Date.parse(measuredAt) > Date.now() + 5 * 60 * 1000 ||
    source !== 'manual' ||
    typeof sourceRecordId !== 'string' || !sourceRecordId.trim() || sourceRecordId.length > 200 ||
    (qualityFlag !== undefined && (typeof qualityFlag !== 'string' || !qualityFlags.includes(qualityFlag as MeasurementQuality))) ||
    (calibrationStatus !== undefined && (
      typeof calibrationStatus !== 'string' || !calibrationStatuses.includes(calibrationStatus as CalibrationStatus)
    ))
  ) {
    return NextResponse.json({ error: 'Ölçüm alanlarını ve biçimlerini kontrol edin.' }, { status: 400 });
  }

  const { id: stationId } = await params;
  try {
    const result = createMeasurement({
      stationId,
      parameter,
      value,
      unit: unit.trim(),
      measuredAt: new Date(measuredAt).toISOString(),
      source: 'manual',
      sourceRecordId: sourceRecordId.trim(),
      qualityFlag: (qualityFlag as MeasurementQuality | undefined) ?? 'valid',
      calibrationStatus: (calibrationStatus as CalibrationStatus | undefined) ?? 'unknown',
      recordedBy: auth.user.email,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'station_not_found') {
      return NextResponse.json({ error: 'İstasyon bulunamadı.' }, { status: 404 });
    }
    console.error('İstasyon ölçümü kaydedilemedi:', error);
    return NextResponse.json({ error: 'Ölçüm kaydedilemedi.' }, { status: 500 });
  }
}
