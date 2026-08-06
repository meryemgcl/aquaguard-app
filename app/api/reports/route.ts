import { NextRequest, NextResponse } from 'next/server';
import { getCards, scoreToLevel } from '@/lib/kanban';
import type { KanbanCard } from '@/lib/kanban';

export const dynamic = 'force-dynamic';

// In-memory store reference (same as kanban.ts)
// We import addCard from kanban module
const riskScoreMap: Record<string, number> = {
  low: Math.floor(Math.random() * 29) + 1,
  medium: Math.floor(Math.random() * 29) + 30,
  high: Math.floor(Math.random() * 19) + 60,
  critical: Math.floor(Math.random() * 19) + 80,
};

export async function GET() {
  return NextResponse.json({ cards: getCards() });
}

export async function POST(req: NextRequest) {
  try {
    const { title, location, description, riskLevel } = await req.json();

    if (!title || !location || !description) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    const riskScores: Record<string, [number, number]> = {
      low: [5, 29], medium: [30, 59], high: [60, 79], critical: [80, 99],
    };
    const [min, max] = riskScores[riskLevel || 'medium'] || [30, 59];
    const riskScore = Math.floor(Math.random() * (max - min + 1)) + min;
    const level = scoreToLevel(riskScore);

    // Dynamically import to avoid circular reference issues
    const { addCard } = await import('@/lib/kanban');
    const card = addCard({ title, location, description, riskLevel: level, riskScore });

    return NextResponse.json({ success: true, card });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
