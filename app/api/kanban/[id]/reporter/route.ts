import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { getReporterContact } from '@/lib/kanban';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTACT_ROLES = ['yonetici', 'admin', 'super_admin'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, CONTACT_ROLES);
  if (!auth.user) return auth.response;

  const { id } = await params;
  const reporter = getReporterContact(id);
  if (!reporter) return NextResponse.json({ error: 'İhbar bulunamadı.' }, { status: 404 });
  return NextResponse.json({ reporter }, { headers: { 'Cache-Control': 'no-store' } });
}
