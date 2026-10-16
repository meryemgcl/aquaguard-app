import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { getFieldInspectionQueue } from '@/lib/kanban';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, ['uzman', 'admin', 'super_admin']);
  if (!auth.user) return auth.response;

  return NextResponse.json({ incidents: getFieldInspectionQueue() }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
