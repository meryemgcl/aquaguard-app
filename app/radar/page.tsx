import RadarClient from '@/components/Radar/RadarClient';

export const metadata = {
  title: 'Kümelenme Radarı — AquaGuard',
  description: 'Yerel ihbar kayıtlarında mekânsal ve zamansal kümelenme erken uyarıları.',
};

export default function RadarPage() {
  return <RadarClient />;
}
