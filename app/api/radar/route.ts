import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { detectCardIncidentClusters } from '@/lib/clustering';
import { getCards } from '@/lib/kanban';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  const clusters = detectCardIncidentClusters(getCards());
  return NextResponse.json({ success: true, clusters });
}
