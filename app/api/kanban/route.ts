/* ============================================================
   GET  /api/kanban        → tüm staff kartları
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getCards } from '@/lib/kanban';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  const cards = getCards();
  return NextResponse.json({ success: true, cards });
}
