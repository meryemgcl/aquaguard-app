/* GET /api/dashboard */
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (!auth.user) return auth.response;

  return NextResponse.json({
    success: true,
    data: getDashboardData(STAFF_ROLES.includes(auth.user.role)),
  });
}
