/* ============================================================
   POST /api/kanban/reject — Reddet + Mail Gönder
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCard, rejectCard, APPROVAL_ROLES } from '@/lib/kanban';
import { sendRejectionMail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });

    const { cardId, reason } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'cardId gerekli.' }, { status: 400 });

    const card = getCard(cardId);
    if (!card) return NextResponse.json({ error: 'Kart bulunamadı.' }, { status: 404 });

    const allowedRoles = APPROVAL_ROLES[card.column];
    if (!allowedRoles || !allowedRoles.includes(payload.role as any)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    const updatedCard = rejectCard(cardId, {
      actorId: payload.userId,
      actorName: payload.name,
      actorRole: payload.role as any,
      action: 'rejected',
    });

    if (!updatedCard) return NextResponse.json({ error: 'Kart güncellenemedi.' }, { status: 500 });

    // ── Red Maili ──────────────────────────────────────────────
    const rejectionReason = reason || 'İnceleme sonucunda yeterli belge/veri bulunmadığı tespit edilmiştir.';
    const adminEmail = process.env.ADMIN_EMAIL || '';

    // Raporun oluşturucusuna bildir
    if (card.creatorEmail) {
      sendRejectionMail(card.creatorEmail, card.title, rejectionReason, payload.name).catch(console.error);
    }
    // Admin'e de bildir
    if (adminEmail && adminEmail !== card.creatorEmail) {
      sendRejectionMail(adminEmail, card.title, rejectionReason, payload.name).catch(console.error);
    }

    return NextResponse.json({ success: true, card: updatedCard, message: 'Reddedildi. İlgili taraflara bildirim gönderildi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
