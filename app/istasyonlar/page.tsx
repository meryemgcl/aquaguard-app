import StationOperationsClient from '@/components/Stations/StationOperationsClient';

export const metadata = {
  title: 'İstasyonlar — AquaGuard',
  description: 'Su kalitesi istasyonlarını, ölçümlerini ve eşik uyarılarını yönetin.',
};

export default function StationsPage() {
  return <StationOperationsClient />;
}
