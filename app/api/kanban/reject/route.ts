/* ============================================================
   POST /api/kanban/reject — Reddet + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { APPROVAL_ROLES, KanbanCard, ApprovalRecord, ApprovalRole } from '@/lib/kanban';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';
import { sendRejectionMail, sendCitizenNotificationMail } from '@/lib/email';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  try {
    const payload = auth.user;

    const body = await request.json() as { cardId?: string; reason?: string };
    const { cardId, reason } = body;
    if (!cardId) return NextResponse.json({ error: 'cardId gerekli.' }, { status: 400 });
    const safeReason = reason?.trim() || 'Gerekçe belirtilmedi.';

    const cardRef = doc(db, 'reports', cardId);
    const cardSnap = await getDoc(cardRef);
    if (!cardSnap.exists()) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });
    const card = cardSnap.data() as KanbanCard;

    const allowedRoles = APPROVAL_ROLES[card.column];
    const currentRole = payload.role as ApprovalRole | undefined;
    if (!allowedRoles || !currentRole || !allowedRoles.includes(currentRole)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const newApproval: ApprovalRecord = {
      id: `appr-${Date.now()}`,
      cardId,
      action: 'rejected',
      role: currentRole,
      actorName: payload.name,
      actorInitials: payload.name.substring(0, 2).toUpperCase(),
      actorColor: '#ff4444',
      columnFrom: card.column,
      columnTo: 'reddedildi',
      reason: safeReason,
      timestamp: new Date().toISOString()
    };

    await updateDoc(cardRef, {
      column: 'reddedildi',
      updatedAt: new Date().toISOString(),
      approvals: arrayUnion(newApproval)
    });

    const updatedCard = { ...card, column: 'reddedildi', approvals: [...(card.approvals || []), newApproval] };

    // ── Red Maili ──────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (card.creatorEmail && card.creatorEmail !== adminEmail) {
      sendRejectionMail(card.creatorEmail, card.title, safeReason, payload.name).catch(console.error);
    }
    
    if (card.creatorEmail && card.creatorEmail !== 'yeni@aquaguard.com') {
      sendCitizenNotificationMail(card.creatorEmail, card.title, card.location, 'rejected', safeReason).catch(console.error);
    }

    return NextResponse.json({ success: true, card: updatedCard, message: `Reddedildi. Mail gönderildi.` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sunucu hatası';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
