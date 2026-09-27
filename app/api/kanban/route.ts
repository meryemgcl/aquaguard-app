/* ============================================================
   GET  /api/kanban        → tüm kartlar
   PATCH /api/kanban       → kart kolonunu güncelle
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getCardById, getCards, updateCardColumn, KanbanColumn } from '@/lib/kanban';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  const cards = getCards();
  return NextResponse.json({ success: true, cards });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json() as { id?: unknown; column?: unknown };
    const { id, column } = body;

    if (
      typeof id !== 'string' ||
      !id ||
      typeof column !== 'string' ||
      !['yeni', 'ai-analiz', 'onay-uzman', 'onay-yonetici', 'yayinlandi', 'reddedildi'].includes(column)
    ) {
      return NextResponse.json(
        { success: false, message: 'id ve column gereklidir.' },
        { status: 400 }
      );
    }

    const card = getCardById(id);
    const validTransitions: Partial<Record<KanbanColumn, KanbanColumn[]>> = {
      'yeni': ['ai-analiz'],
      'ai-analiz': ['onay-uzman'],
    };
    if (!card || !validTransitions[card.column]?.includes(column as KanbanColumn)) {
      return NextResponse.json(
        { success: false, message: 'Bu iş akışı geçişine izin verilmiyor.' },
        { status: 403 }
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
