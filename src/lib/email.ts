/* ============================================================
   AquaGuard — Email Engine
   Resend (primary) → console mock (fallback)
   All sends are logged to MailLogs store.
   ============================================================ */

import { getTemplate, renderTemplate, TemplateId } from './mailTemplates';
import { addLog, MailTrigger } from './mailLogs';

/* ── Resend sender ── */
async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'mock') {
    /* Console mock */
    console.log('\n📧 [EMAIL MOCK] ─────────────────────────────────');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log('  (Set RESEND_API_KEY in .env.local for real delivery)');
    console.log('─────────────────────────────────────────────────\n');
    return;
  }

  /* Real Resend API — install with: npm install resend */
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: 'AquaGuard <no-reply@aquaguard.com>',
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

/* ── Core send function with logging ── */
export async function sendTemplatedEmail(
  templateId: TemplateId,
  to: string,
  vars: Record<string, string>,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const template = getTemplate(templateId);
  if (!template) {
    return { success: false, error: `Template not found: ${templateId}` };
  }

  const { subject, html } = renderTemplate(template, { title: template.name, ...vars });

  try {
    await sendViaResend(to, subject, html);

    const log = addLog({
      templateId: templateId as MailTrigger,
      templateName: template.name,
      to,
      subject,
      status: 'sent',
      metadata,
    });

    return { success: true, logId: log.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';

    const log = addLog({
      templateId: templateId as MailTrigger,
      templateName: template.name,
      to,
      subject,
      status: 'failed',
      error,
      metadata,
    });

    console.error(`[EMAIL ERROR] ${templateId} → ${to}: ${error}`);
    return { success: false, logId: log.id, error };
  }
}

/* ============================================================
   Typed Trigger Functions
   ============================================================ */

export async function triggerNewReport(opts: {
  adminEmail: string;
  adminName: string;
  reportTitle: string;
  location: string;
  riskScore: number;
  riskLevel: string;
  riskColor: string;
  reportId: string;
}) {
  return sendTemplatedEmail('new-report', opts.adminEmail, {
    adminName: opts.adminName,
    reportTitle: opts.reportTitle,
    location: opts.location,
    riskScore: String(opts.riskScore),
    riskLevel: opts.riskLevel,
    riskColor: opts.riskColor,
    reportId: opts.reportId.slice(0, 8).toUpperCase(),
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    loginUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }, { reportTitle: opts.reportTitle, adminName: opts.adminName });
}

export async function triggerAiComplete(opts: {
  to: string;
  reportTitle: string;
  riskScore: number;
  riskLevel: string;
  riskColor: string;
}) {
  return sendTemplatedEmail('ai-complete', opts.to, {
    reportTitle: opts.reportTitle,
    riskScore: String(opts.riskScore),
    riskLevel: opts.riskLevel,
    riskColor: opts.riskColor,
    loginUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }, { reportTitle: opts.reportTitle });
}

export async function triggerFirstApproval(opts: {
  managerEmail: string;
  managerName: string;
  reportTitle: string;
  actorName: string;
}) {
  return sendTemplatedEmail('first-approval', opts.managerEmail, {
    adminName: opts.managerName,
    reportTitle: opts.reportTitle,
    actorName: opts.actorName,
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    loginUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }, { reportTitle: opts.reportTitle, actorName: opts.actorName });
}

export async function triggerFirstRejection(opts: {
  to: string;
  reportTitle: string;
  actorName: string;
  reason: string;
  reportId: string;
}) {
  return sendTemplatedEmail('first-rejection', opts.to, {
    reportTitle: opts.reportTitle,
    actorName: opts.actorName,
    reason: opts.reason,
    reportId: opts.reportId.slice(0, 8).toUpperCase(),
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    editUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/kanban`,
  }, { reportTitle: opts.reportTitle, reason: opts.reason.slice(0, 60) });
}

export async function triggerPublished(opts: {
  to: string;
  reportTitle: string;
  actorName: string;
  expertName: string;
}) {
  return sendTemplatedEmail('published', opts.to, {
    reportTitle: opts.reportTitle,
    actorName: opts.actorName,
    expertName: opts.expertName,
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    loginUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }, { reportTitle: opts.reportTitle, actorName: opts.actorName });
}

export async function triggerFinalRejection(opts: {
  to: string;
  reportTitle: string;
  actorName: string;
  reason: string;
  reportId: string;
}) {
  return sendTemplatedEmail('final-rejection', opts.to, {
    reportTitle: opts.reportTitle,
    actorName: opts.actorName,
    reason: opts.reason,
    reportId: opts.reportId.slice(0, 8).toUpperCase(),
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, { reportTitle: opts.reportTitle, reason: opts.reason.slice(0, 60) });
}
