/* ============================================================
   GET /api/kanban/my-tasks
   Returns tasks specific to the authenticated user's role.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getCards } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.user) return auth.response;

    const allCards = getCards();
    let myTasks = [];

    if (auth.user.role === 'super_admin' || auth.user.role === 'admin') {
      myTasks = allCards;
    } else if (auth.user.role === 'uzman') {
      // Uzman sees new, ai-analiz, and ones waiting for uzman approval
      myTasks = allCards.filter(c => ['yeni', 'ai-analiz', 'onay-uzman'].includes(c.column));
    } else if (auth.user.role === 'yonetici') {
      // Yonetici sees ones waiting for yonetici approval
      myTasks = allCards.filter(c => c.column === 'onay-yonetici');
    } else {
      // Halk sees only their own reports
      myTasks = allCards.filter(c => c.creatorEmail === auth.user.email);
    }

    // Sort by riskScore descending
    myTasks.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, tasks: myTasks, total: myTasks.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
