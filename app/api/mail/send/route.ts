import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireApiUser } from '@/lib/api-auth'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, ['super_admin', 'admin', 'yonetici']);
  if (!auth.user) return auth.response;

  try {
    const body = await req.json() as { to?: string; subject?: string; body?: string };
    const { to, subject, body: emailBody } = body;

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    if (!resend) {
      console.log('[SIMULATED MAIL]', { to, subject, body: emailBody.substring(0, 100) })
      return NextResponse.json({ success: true, simulated: true })
    }

    const data = await resend.emails.send({
      from: 'AquaGuard <onboarding@resend.dev>',
      to: [to || 'test@example.com'],
      subject: `[AquaGuard] ${subject}`,
      text: emailBody,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Mail Error:', error)
    const message = error instanceof Error ? error.message : 'Mail send failed';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
