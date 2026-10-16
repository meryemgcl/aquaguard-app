import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { listStationAlerts } from '@/lib/measurements';
import type { AlertStatus } from '@/lib/measurements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const statuses: AlertStatus[] = ['open', 'acknowledged', 'resolved'];

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;
  const rawStatus = request.nextUrl.searchParams.get('status');
  if (rawStatus && !statuses.includes(rawStatus as AlertStatus)) {
    return NextResponse.json({ error: 'Geçersiz uyarı durumu.' }, { status: 400 });
  }
  return NextResponse.json({ alerts: listStationAlerts(rawStatus as AlertStatus | undefined) });
}
