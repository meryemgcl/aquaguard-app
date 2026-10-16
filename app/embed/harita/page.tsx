import EmbedMapPage from '@/components/EmbedMap/EmbedMapPage';

export const metadata = {
  title: 'AquaGuard Şeffaf Su İzleme Haritası',
  description: 'Yayımlanmış ve çözümlenmiş su kirliliği ihbarlarının herkese açık haritası.',
};

export default function EmbedHaritaPage() {
  return <EmbedMapPage />;
}
