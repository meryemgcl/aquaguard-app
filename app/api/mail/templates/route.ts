/* GET /api/mail/templates — list all */
import { NextResponse } from 'next/server';
import { getAllTemplates } from '@/lib/mailTemplates';

export async function GET() {
  return NextResponse.json({ success: true, templates: getAllTemplates() });
}
