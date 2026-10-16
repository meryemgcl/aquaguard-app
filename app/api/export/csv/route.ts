import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { getCards } from '@/lib/kanban';
import { getExportIncidents, toIncidentCsv } from '@/lib/open-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const includeAll = request.nextUrl.searchParams.get('scope') === 'all';
  if (includeAll) {
    const auth = await requireApiUser(request, STAFF_ROLES);
    if (!auth.user) return auth.response;
  }

  const csv = toIncidentCsv(getExportIncidents(getCards(), includeAll));
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="aquaguard-kirlilik-verileri.csv"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
