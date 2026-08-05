import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json()

    if (!subject || !body) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    if (!resend) {
      console.log('[SIMULATED MAIL]', { to, subject, body: body.substring(0, 100) })
      return NextResponse.json({ success: true, simulated: true })
    }

    const data = await resend.emails.send({
      from: 'AquaGuard <onboarding@resend.dev>',
      to: [to || 'test@example.com'],
      subject: `[AquaGuard] ${subject}`,
      text: body,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Mail Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
