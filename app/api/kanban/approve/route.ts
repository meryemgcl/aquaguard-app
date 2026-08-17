/* ============================================================
   POST /api/kanban/approve — Onayla + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { APPROVAL_ROLES, APPROVAL_NEXT, KanbanColumn, ApprovalRecord, KanbanCard } from '@/lib/kanban';
import { sendExpertApprovalMail, sendManagerApprovalMail, sendCitizenNotificationMail } from '@/lib/email';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });

    const { cardId, draftEmail } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'cardId gerekli.' }, { status: 400 });

    const cardRef = doc(db, 'reports', cardId);
    const cardSnap = await getDoc(cardRef);
    
    if (!cardSnap.exists()) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });
    const card = cardSnap.data() as KanbanCard;

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (!allowedRoles || !allowedRoles.includes(payload.role as any)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const nextCol = APPROVAL_NEXT[card.column];
    if (!nextCol) return NextResponse.json({ error: 'Sonraki asama bulunamadi.' }, { status: 400 });

    const newApproval: ApprovalRecord = {
      id: `appr-${Date.now()}`,
      cardId,
      action: 'approved',
      role: payload.role as any,
      actorName: payload.name,
      actorInitials: payload.name.substring(0,2).toUpperCase(),
      actorColor: '#6e8efb',
      columnFrom: card.column,
      columnTo: nextCol,
      timestamp: new Date().toISOString()
    };

    await updateDoc(cardRef, {
      column: nextCol,
      updatedAt: new Date().toISOString(),
      approvals: arrayUnion(newApproval)
    });

    const updatedCard = { ...card, column: nextCol, approvals: [...(card.approvals || []), newApproval] };

    // ── Mail bildirimleri ──────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const yoneticiEmail = process.env.YONETICI_EMAIL || '';

    if (payload.role === 'uzman') {
      sendExpertApprovalMail(adminEmail, card.title, card.location, payload.name).catch(console.error);
      if (yoneticiEmail && yoneticiEmail !== adminEmail) {
        sendExpertApprovalMail(yoneticiEmail, card.title, card.location, payload.name).catch(console.error);
      }
    } else if (payload.role === 'yonetici' || payload.role === 'admin') {
      const draft = draftEmail || `${card.title} raporu onaylanmıştır.`;
      sendManagerApprovalMail(adminEmail, card.title, card.location, payload.name, draft).catch(console.error);
      if (card.creatorEmail && card.creatorEmail !== adminEmail) {
        sendManagerApprovalMail(card.creatorEmail, card.title, card.location, payload.name, draft).catch(console.error);
      }
      
      // Vatandaşa nihai onay bildirimi (Yayınlandı)
      if (nextCol === 'yayinlandi' && card.creatorEmail && card.creatorEmail !== 'yeni@aquaguard.com') {
        sendCitizenNotificationMail(card.creatorEmail, card.title, card.location, 'approved').catch(console.error);
      }
    }

    return NextResponse.json({ success: true, card: updatedCard, message: `Onaylandı. İlgili taraflara e-posta gönderildi.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
