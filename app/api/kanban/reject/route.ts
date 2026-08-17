/* ============================================================
   POST /api/kanban/reject — Reddet + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { APPROVAL_ROLES, KanbanCard, ApprovalRecord } from '@/lib/kanban';
import { sendRejectionMail } from '@/lib/email';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });

    const { cardId, reason } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'cardId gerekli.' }, { status: 400 });

    const cardRef = doc(db, 'reports', cardId);
    const cardSnap = await getDoc(cardRef);
    if (!cardSnap.exists()) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });
    const card = cardSnap.data() as KanbanCard;

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (!allowedRoles || !allowedRoles.includes(payload.role as any)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const newApproval: ApprovalRecord = {
      id: `appr-${Date.now()}`,
      cardId,
      action: 'rejected',
      role: payload.role as any,
      actorName: payload.name,
      actorInitials: payload.name.substring(0,2).toUpperCase(),
      actorColor: '#ff4444',
      columnFrom: card.column,
      columnTo: 'reddedildi',
      reason: reason,
      timestamp: new Date().toISOString()
    };

    await updateDoc(cardRef, {
      column: 'reddedildi',
      updatedAt: new Date().toISOString(),
      approvals: arrayUnion(newApproval)
    });

    const updatedCard = { ...card, column: 'reddedildi', approvals: [...(card.approvals || []), newApproval] };

    // ── Red Maili ──────────────────────────────────────────────
    const rejectionReason = reason || 'İnceleme sonucunda yeterli belge/veri bulunmadığı tespit edilmiştir.';
    const adminEmail = process.env.ADMIN_EMAIL || '';

    if (card.creatorEmail) {
      sendRejectionMail(card.creatorEmail, card.title, rejectionReason, payload.name).catch(console.error);
    }
    if (adminEmail && adminEmail !== card.creatorEmail) {
      sendRejectionMail(adminEmail, card.title, rejectionReason, payload.name).catch(console.error);
    }

    return NextResponse.json({ success: true, card: updatedCard, message: 'Reddedildi. İlgili taraflara bildirim gönderildi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
