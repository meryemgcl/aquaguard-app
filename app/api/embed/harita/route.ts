import { NextResponse } from 'next/server';
import { getCardPhotos, getCards } from '@/lib/kanban';
import { isPubliclyVisibleIncident, toOpenDataIncident, type EmbedMapIncident } from '@/lib/open-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const incidents: EmbedMapIncident[] = getCards().flatMap(card => {
    const coordinates = card.coordinates;
    if (!isPubliclyVisibleIncident(card) || !coordinates) return [];
    return [{
      ...toOpenDataIncident(card),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      photo: getCardPhotos(card.id)?.[0] ?? null,
    }];
  });
  return NextResponse.json({ incidents }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
