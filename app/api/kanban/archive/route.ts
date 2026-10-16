import { NextRequest, NextResponse } from 'next/server';
import { getCards } from '@/lib/kanban';
import { requireApiUser } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if (!auth.user) return auth.response;

    const allCards = getCards();
    // Yalnızca yayinlandi veya reddedildi sütunundaki kartlar arşivdedir.
    let archivedTasks = allCards.filter(c => c.column === 'yayinlandi' || c.column === 'reddedildi');

    // Halk (Vatandaş) sadece kendi oluşturduğu arşiv belgelerini görebilir
    if (auth.user.role === 'halk') {
      archivedTasks = archivedTasks.filter(c => c.creatorEmail === auth.user.email);
    }
    // Diğer roller (Uzman, Yönetici, Admin) tüm arşivi görebilir.

    // En yeni en üstte olacak şekilde sıralama (createdAt)
    archivedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, tasks: archivedTasks, total: archivedTasks.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
