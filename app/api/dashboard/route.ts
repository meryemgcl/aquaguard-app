/* GET /api/dashboard */
import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';

export async function GET() {
  return NextResponse.json({ success: true, data: getDashboardData() });
}
