/* ============================================================
   POST /api/kanban/reject
   Body: { cardId, actorName, actorInitials, actorColor, role, reason }
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCardById, addApproval, APPROVAL_ROLES, ApprovalRole,
} from '@/lib/kanban';
import { triggerFirstRejection, triggerFinalRejection } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { cardId, actorName, actorInitials, actorColor, role, reason } = await request.json();

    if (!cardId || !actorName || !role || !reason?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Kart ID, aktör, rol ve red sebebi zorunludur.' },
        { status: 400 }
      );
    }

    const card = getCardById(cardId);
    if (!card) return NextResponse.json({ success: false, message: 'Kart bulunamadı.' }, { status: 404 });

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (!allowedRoles) {
      return NextResponse.json({ success: false, message: 'Bu kolon onay gerektirmiyor.' }, { status: 400 });
    }

    if (!allowedRoles.includes(role as ApprovalRole)) {
      return NextResponse.json({ success: false, message: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const fromColumn = card.column;
    const result = addApproval(cardId, {
      action: 'rejected', role: role as ApprovalRole,
      actorName, actorInitials, actorColor,
      reason: reason.trim(),
      columnFrom: fromColumn, columnTo: 'reddedildi',
    });

    if (!result) {
      return NextResponse.json({ success: false, message: 'Red kaydedilemedi.' }, { status: 500 });
    }

    /* ── Trigger correct rejection email ── */
    if (fromColumn === 'onay-uzman') {
      /* 1st stage rejection — correction invitation */
      triggerFirstRejection({
        to: card.creatorEmail,
        reportTitle: card.title,
        actorName,
        reason: reason.trim(),
        reportId: card.id,
      }).catch(console.error);
    } else if (fromColumn === 'onay-yonetici') {
      /* 2nd stage — final rejection */
      triggerFinalRejection({
        to: card.creatorEmail,
        reportTitle: card.title,
        actorName,
        reason: reason.trim(),
        reportId: card.id,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Rapor reddedildi. Bilgilendirme maili kuyruğa alındı.',
      card: result.card,
      approval: result.approval,
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Sunucu hatası.' }, { status: 500 });
  }
}
