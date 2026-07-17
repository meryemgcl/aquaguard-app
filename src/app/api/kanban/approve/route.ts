/* ============================================================
   POST /api/kanban/approve
   Body: { cardId, actorName, actorInitials, actorColor, role }
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCardById, addApproval, APPROVAL_NEXT, APPROVAL_ROLES, ApprovalRole,
} from '@/lib/kanban';
import { triggerFirstApproval, triggerPublished } from '@/lib/email';

/* Manager email lookup (demo — replace with DB lookup) */
const MANAGER_EMAIL = 'yonetici@aquaguard.com';
const MANAGER_NAME  = 'Mehmet Demir';

export async function POST(request: NextRequest) {
  try {
    const { cardId, actorName, actorInitials, actorColor, role } = await request.json();

    if (!cardId || !actorName || !role) {
      return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 });
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

    const nextColumn = APPROVAL_NEXT[card.column];
    if (!nextColumn) {
      return NextResponse.json({ success: false, message: 'Sonraki kolon bulunamadı.' }, { status: 400 });
    }

    const result = addApproval(cardId, {
      action: 'approved', role: role as ApprovalRole,
      actorName, actorInitials, actorColor,
      columnFrom: card.column, columnTo: nextColumn,
    });

    if (!result) {
      return NextResponse.json({ success: false, message: 'Onay kaydedilemedi.' }, { status: 500 });
    }

    /* ── Trigger correct email based on which stage was approved ── */
    if (card.column === 'onay-uzman') {
      /* 1st approval → notify manager */
      triggerFirstApproval({
        managerEmail: MANAGER_EMAIL,
        managerName: MANAGER_NAME,
        reportTitle: card.title,
        actorName,
      }).catch(console.error);
    } else if (card.column === 'onay-yonetici') {
      /* 2nd approval → notify report creator that it's published */
      const expertApproval = card.approvals.find(
        a => a.columnFrom === 'onay-uzman' && a.action === 'approved'
      );
      triggerPublished({
        to: card.creatorEmail,
        reportTitle: card.title,
        actorName,
        expertName: expertApproval?.actorName ?? 'Uzman',
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Rapor onaylandı. Bildirim maili kuyruğa alındı.',
      card: result.card,
      approval: result.approval,
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Sunucu hatası.' }, { status: 500 });
  }
}
