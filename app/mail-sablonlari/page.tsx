import MailTemplatesClient from '@/components/MailTemplates/MailTemplatesClient';

export const metadata = {
  title: 'Mail Şablonları — AquaGuard',
  description: 'AquaGuard mail otomasyon şablonları yönetimi ve gönderim logları.',
};

export default function MailSablonlariPage() {
  return <MailTemplatesClient />;
}
