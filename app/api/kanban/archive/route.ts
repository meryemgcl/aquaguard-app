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
    
    // Yalnızca yayinlandi veya reddedildi sütunundaki kartlar arşivdedir.
    let archivedTasks = allCards.filter(c => c.column === 'yayinlandi' || c.column === 'reddedildi');

    // Halk (Vatandaş) sadece kendi oluşturduğu arşiv belgelerini görebilir
    if (role === 'halk') {
      archivedTasks = archivedTasks.filter(c => c.creatorEmail === payload.email);
    }
    // Diğer roller (Uzman, Yönetici, Admin) tüm arşivi görebilir.

    // En yeni en üstte olacak şekilde sıralama (createdAt)
    archivedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, tasks: archivedTasks, total: archivedTasks.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
