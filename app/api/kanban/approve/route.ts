/* ============================================================
   POST /api/kanban/approve — Onayla + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { recordApproval, getCardById } from '@/lib/kanban';
import { APPROVAL_ROLES, APPROVAL_NEXT } from '@/lib/kanban-types';
import { requireApiUser } from '@/lib/api-auth';
import { isRecord } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, ['yonetici']);
  if (!auth.user) return auth.response;

  try {
    const payload = auth.user;

    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.cardId !== 'string' || !body.cardId ||
        (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000))) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi veya cardId.' }, { status: 400 });
    }
    const cardId = body.cardId;
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    const card = getCardById(cardId);
    if (!card) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (payload.role !== 'yonetici' || !allowedRoles || !allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const nextCol = APPROVAL_NEXT[card.column];
    if (!nextCol) return NextResponse.json({ error: 'Sonraki asama bulunamadi.' }, { status: 400 });

    const updatedCard = recordApproval(cardId, card.column, {
      action: 'approved',
      role: 'yonetici',
      actorName: payload.name,
      actorInitials: payload.name.substring(0, 2).toUpperCase(),
      actorColor: '#6e8efb',
      columnFrom: card.column,
      columnTo: nextCol,
      reason: note || 'Yönetici tarafından yayımlanması onaylandı.',
    });
    if (!updatedCard) return NextResponse.json({ error: 'Rapor eşzamanlı olarak değişti; yenileyip tekrar deneyin.' }, { status: 409 });

    return NextResponse.json({ success: true, message: 'İhbar yayımlandı.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sunucu hatası';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
