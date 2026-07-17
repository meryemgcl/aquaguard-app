/* ============================================================
   GET  /api/kanban        → tüm kartlar
   PATCH /api/kanban       → kart kolonunu güncelle
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getCards, updateCardColumn, KanbanColumn } from '@/lib/kanban';

export async function GET() {
  const cards = getCards();
  return NextResponse.json({ success: true, cards });
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, column } = await request.json();

    if (!id || !column) {
      return NextResponse.json(
        { success: false, message: 'id ve column gereklidir.' },
        { status: 400 }
      );
    }

    const updated = updateCardColumn(id, column as KanbanColumn);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Kart bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, card: updated });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası.' },
      { status: 500 }
    );
  }
}
