/* ============================================================
   GET /api/kanban/my-tasks
   Returns tasks specific to the authenticated user's role.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCards } from '@/lib/kanban';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const allCards = getCards();
    const role = payload.role;
    let myTasks = [];

    if (role === 'uzman') {
      // Uzman sees new, ai-analiz, and ones waiting for uzman approval
      myTasks = allCards.filter(c => ['yeni', 'ai-analiz', 'onay-uzman'].includes(c.column));
    } else if (role === 'yonetici') {
      // Yonetici sees ones waiting for yonetici approval
      myTasks = allCards.filter(c => c.column === 'onay-yonetici');
    } else if (role === 'admin') {
      // Admin sees everything
      myTasks = allCards;
    } else {
      // Halk sees only their own reports
      myTasks = allCards.filter(c => c.creatorEmail === payload.email);
    }

    // Sort by riskScore descending
    myTasks.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, tasks: myTasks, total: myTasks.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
