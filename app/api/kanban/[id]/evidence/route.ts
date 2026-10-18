import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCardPhotos } from '@/lib/kanban';
import { requireApiUser, STAFF_ROLES } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const photosSchema = z.array(z.string().regex(/^\/api\/media\/inc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/)).max(4);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, STAFF_ROLES);
  if (!auth.user) return auth.response;

  const { id } = await params;
  try {
    const photos = getCardPhotos(id);
    if (!photos) return NextResponse.json({ error: 'İhbar bulunamadı.' }, { status: 404 });
    const parsed = photosSchema.safeParse(photos);
    if (!parsed.success) {
      console.error('Stored report evidence failed validation:', { reportId: id });
      return NextResponse.json({ error: 'İhbar kanıt verisi geçersiz.' }, { status: 500 });
    }
    return NextResponse.json({ photos: parsed.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('Report evidence lookup failed:', error);
    return NextResponse.json({ error: 'İhbar kanıtı yüklenemedi.' }, { status: 500 });
  }
}
