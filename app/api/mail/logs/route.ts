/* GET /api/mail/logs */
import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getLogStats } from '@/lib/mailLogs';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');
  return NextResponse.json({
    success: true,
    logs: getLogs(limit),
    stats: getLogStats(),
  });
}
