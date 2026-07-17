import KanbanBoard from '@/components/Kanban/KanbanBoard';

export const metadata = {
  title: 'Raporlar — AquaGuard',
  description: 'Su kalitesi rapor yönetim panosu — sürükle bırak Kanban arayüzü.',
};

export default function KanbanPage() {
  return <KanbanBoard />;
}
