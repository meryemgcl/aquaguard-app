import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { createThreshold, listThresholds } from '@/lib/measurements';
import type { AlertSeverity, ThresholdComparator } from '@/lib/measurements';
import { USER_ADMIN_ROLES } from '@/lib/permissions';
import { isRecord } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const parameterPattern = /^[a-z][a-z0-9_]{0,39}$/;

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  return NextResponse.json({ thresholds: listThresholds() });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, USER_ADMIN_ROLES);
  if (!auth.user) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Geçersiz eşik verisi.' }, { status: 400 });
  }

  const {
    parameter, unit, comparator, thresholdValue, hysteresis, severity,
    consecutiveCount, activeFrom, activeUntil,
  } = body;
  if (
    typeof parameter !== 'string' || !parameterPattern.test(parameter) ||
    typeof unit !== 'string' || !unit.trim() || unit.trim().length > 24 ||
    typeof comparator !== 'string' || !(['above', 'below'] as const).includes(comparator as ThresholdComparator) ||
    typeof thresholdValue !== 'number' || !Number.isFinite(thresholdValue) ||
    (hysteresis !== undefined && (typeof hysteresis !== 'number' || !Number.isFinite(hysteresis) || hysteresis < 0)) ||
    typeof severity !== 'string' || !severities.includes(severity as AlertSeverity) ||
    (consecutiveCount !== undefined && (
      typeof consecutiveCount !== 'number' || !Number.isInteger(consecutiveCount) || consecutiveCount < 1 || consecutiveCount > 20
    )) ||
    typeof activeFrom !== 'string' || !Number.isFinite(Date.parse(activeFrom)) ||
    (activeUntil !== undefined && activeUntil !== null && (
      typeof activeUntil !== 'string' || !Number.isFinite(Date.parse(activeUntil)) || Date.parse(activeUntil) <= Date.parse(activeFrom)
    ))
  ) {
    return NextResponse.json({ error: 'Eşik alanlarını ve yürürlük tarihlerini kontrol edin.' }, { status: 400 });
  }

  try {
    const threshold = createThreshold({
      parameter,
      unit: unit.trim(),
      comparator: comparator as ThresholdComparator,
      thresholdValue,
      hysteresis: (hysteresis as number | undefined) ?? 0,
      severity: severity as AlertSeverity,
      consecutiveCount: (consecutiveCount as number | undefined) ?? 1,
      activeFrom: new Date(activeFrom).toISOString(),
      activeUntil: typeof activeUntil === 'string' ? new Date(activeUntil).toISOString() : null,
      createdBy: auth.user.email,
    });
    return NextResponse.json({ threshold }, { status: 201 });
  } catch (error) {
    console.error('Ölçüm eşiği kaydedilemedi:', error);
    return NextResponse.json({ error: 'Ölçüm eşiği kaydedilemedi.' }, { status: 500 });
  }
}
