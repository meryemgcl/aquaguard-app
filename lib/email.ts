/* ============================================================
   AquaGuard — Mail Service (Resend)
   Gerçek e-posta gönderimi: kayıt, onay, red, uyarı
   ============================================================ */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.MAIL_FROM || 'AquaGuard <onboarding@resend.dev>'
// Resend ücretsiz planda sadece doğrulanmış adrese gönderilebilir.
// RESEND_TO_OVERRIDE doldurulursa tüm mailler o adrese yönlendirilir.
const OVERRIDE = process.env.RESEND_TO_OVERRIDE || ''

function resolveRecipient(email: string): string {
  return OVERRIDE || email
}

async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; simulated?: boolean }> {
  const recipient = resolveRecipient(to)

  if (!resend) {
    console.log(`[MAIL SIMULATED] To: ${recipient}\nSubject: ${subject}`)
    return { ok: true, simulated: true }
  }

  try {
    await resend.emails.send({ from: FROM, to: [recipient], subject, html })
    return { ok: true }
  } catch (e) {
    console.error('[MAIL ERROR]', e)
    return { ok: false }
  }
}

/* ── HTML Şablonu ── */
function template(title: string, color: string, icon: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#111827,#1a1f35);border-radius:16px 16px 0 0;padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <table width="100%"><tr>
            <td><span style="font-size:28px;">${icon}</span></td>
            <td style="padding-left:12px;">
              <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#6e8efb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AquaGuard</span>
              <br/><span style="font-size:12px;color:#555f75;letter-spacing:0.08em;text-transform:uppercase;">Su Kalitesi İzleme Platformu</span>
            </td>
          </tr></table>
        </td></tr>
        <!-- Colored bar -->
        <tr><td style="height:4px;background:${color};"></td></tr>
        <!-- Body -->
        <tr><td style="background:#111827;padding:36px 40px;border-radius:0 0 16px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f0f4ff;">${title}</h1>
          <div style="height:1px;background:rgba(255,255,255,0.06);margin:20px 0;"></div>
          ${body}
          <div style="height:1px;background:rgba(255,255,255,0.06);margin:28px 0 20px;"></div>
          <p style="margin:0;font-size:12px;color:#555f75;">Bu e-posta AquaGuard platformu tarafından otomatik gönderilmiştir. Lütfen yanıtlamayın.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3a4055;">© 2026 AquaGuard · Su Kalitesi İzleme Platformu</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function infoText(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#8892a8;line-height:1.7;">${text}</p>`
}

function boldRow(label: string, value: string, color = '#f0f4ff') {
  return `<table width="100%" style="margin-bottom:10px;"><tr>
    <td style="font-size:13px;color:#555f75;width:140px;">${label}</td>
    <td style="font-size:13px;font-weight:600;color:${color};">${value}</td>
  </tr></table>`
}

function ctaButton(text: string, url: string, color: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${color};color:#0a0f1e;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">${text}</a>`
}

/* ══════════════════════════════════════════════════════════════
   1. HOŞGELDİN — Kayıt Sonrası
   ══════════════════════════════════════════════════════════════ */
export async function sendWelcomeMail(to: string, name: string, role: string) {
  const roleLabels: Record<string, string> = {
    admin: 'Sistem Yöneticisi', uzman: 'Çevre Uzmanı',
    yonetici: 'Yönetici', halk: 'Halk Kullanıcısı',
  }
  const body = `
    ${infoText(`Merhaba <strong style="color:#00d4ff;">${name}</strong>,`)}
    ${infoText('AquaGuard platformuna hoş geldiniz! Hesabınız başarıyla oluşturulmuştur.')}
    ${boldRow('E-posta', to)}
    ${boldRow('Rol', roleLabels[role] || role, '#6e8efb')}
    ${boldRow('Şifre', '123456 (ilk girişten sonra değiştirin)', '#f59e0b')}
    ${ctaButton('Platforma Giriş Yap', 'http://localhost:3000/login', '#00d4ff')}
  `
  return sendMail(to, 'AquaGuard — Hesabınız Oluşturuldu 🎉', template('Hesabınıza Hoş Geldiniz', '#00d4ff', '🌊', body))
}

/* ══════════════════════════════════════════════════════════════
   2. UZMAN ONAYI
   ══════════════════════════════════════════════════════════════ */
export async function sendExpertApprovalMail(to: string, reportTitle: string, location: string, actorName: string) {
  const body = `
    ${infoText('Aşağıdaki rapor <strong style="color:#6e8efb;">Uzman</strong> seviyesinde onaylanmıştır.')}
    ${boldRow('Rapor', reportTitle)}
    ${boldRow('Konum', location)}
    ${boldRow('Onaylayan Uzman', actorName, '#6e8efb')}
    ${boldRow('Durum', '1. Onay (Uzman) ✅ → Yönetici onayı bekleniyor', '#f59e0b')}
    ${infoText('Rapor artık Yönetici onay kuyruğuna alınmıştır. Yönetici onayından sonra ilgili kurumlara bildirim gönderilecektir.')}
    ${ctaButton('Kanban Panosunu Görüntüle', 'http://localhost:3000/kanban', '#6e8efb')}
  `
  return sendMail(to, `[AquaGuard] Uzman Onayı: ${reportTitle}`, template('Uzman Onayı Verildi 🔬', '#6e8efb', '🔬', body))
}

/* ══════════════════════════════════════════════════════════════
   3. YÖNETİCİ ONAYI — Karar verildi, kuruma bildir
   ══════════════════════════════════════════════════════════════ */
export async function sendManagerApprovalMail(to: string, reportTitle: string, location: string, actorName: string, draftEmail: string) {
  const body = `
    ${infoText('Aşağıdaki rapor tüm onay süreçlerinden geçerek <strong style="color:#00ff88;">Yayınlandı</strong>.')}
    ${boldRow('Rapor', reportTitle)}
    ${boldRow('Konum', location)}
    ${boldRow('Onaylayan Yönetici', actorName, '#00ff88')}
    ${boldRow('Durum', 'Yayınlandı ✅✅', '#00ff88')}
    <div style="margin-top:20px;padding:20px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:10px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#00ff88;text-transform:uppercase;letter-spacing:0.06em;">Resmi Dilekçe / Bildirim Taslağı</p>
      <p style="margin:0;font-size:13px;color:#8892a8;line-height:1.8;white-space:pre-wrap;">${draftEmail}</p>
    </div>
    ${ctaButton('Arşivi Görüntüle', 'http://localhost:3000/arsiv', '#00ff88')}
  `
  return sendMail(to, `[AquaGuard] Rapor Yayınlandı: ${reportTitle}`, template('Yönetici Onayı — Rapor Yayınlandı', '#00ff88', '✅', body))
}

/* ══════════════════════════════════════════════════════════════
   4. RED BİLDİRİMİ
   ══════════════════════════════════════════════════════════════ */
export async function sendRejectionMail(to: string, reportTitle: string, reason: string, actorName: string) {
  const body = `
    ${infoText('Üzgünüz. Aşağıdaki rapor inceleme sürecinde <strong style="color:#ff4444;">Reddedilmiştir</strong>.')}
    ${boldRow('Rapor', reportTitle)}
    ${boldRow('Reddeden', actorName, '#ff4444')}
    <div style="margin-top:20px;padding:20px;background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:10px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#ff4444;text-transform:uppercase;letter-spacing:0.06em;">Red Gerekçesi</p>
      <p style="margin:0;font-size:14px;color:#8892a8;line-height:1.7;">${reason}</p>
    </div>
    ${infoText('Eksiklikleri gidererek raporu yeniden oluşturabilirsiniz.')}
    ${ctaButton('Yeni Rapor Oluştur', 'http://localhost:3000/kanban', '#ff4444')}
  `
  return sendMail(to, `[AquaGuard] Rapor Reddedildi: ${reportTitle}`, template('Rapor Reddedildi ❌', '#ff4444', '❌', body))
}

/* ══════════════════════════════════════════════════════════════
   5. KRİTİK UYARI — Otomatik tespit
   ══════════════════════════════════════════════════════════════ */
export async function sendCriticalAlertMail(to: string, location: string, parameter: string, value: string, normalRange: string) {
  const body = `
    <div style="padding:16px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);border-radius:10px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ff4444;">🚨 Kritik Su Kalitesi Alarmı</p>
    </div>
    ${boldRow('Konum', location, '#ff4444')}
    ${boldRow('Parametre', parameter)}
    ${boldRow('Ölçülen Değer', value, '#ff4444')}
    ${boldRow('Normal Aralık', normalRange, '#00ff88')}
    ${infoText('Bu değer kritik eşiği aşmıştır. Lütfen derhal ilgili birimi bilgilendirin ve saha ekibini bölgeye yönlendirin.')}
    ${ctaButton('AI Analiz Panelini Aç', 'http://localhost:3000/ai-analiz', '#ff4444')}
  `
  return sendMail(to, `🚨 [AquaGuard] KRİTİK UYARI: ${location} — ${parameter}`, template('Kritik Su Kalitesi Uyarısı', '#ff4444', '🚨', body))
}
