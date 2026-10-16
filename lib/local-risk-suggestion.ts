import type { WaterIncidentCategory } from './types';

const categoryScores: Record<WaterIncidentCategory, number> = {
  'endüstriyel atık': 68,
  'evsel atık': 36,
  'balık ölümü': 82,
  'renk/koku değişimi': 52,
};

const urgentSignals = [
  'toplu balik',
  'balik olumu',
  'kimyasal',
  'zehir',
  'kirmizi',
  'siyah',
  'kopuk',
  'duman',
  'yanma',
  'cok sayida',
  'deri temasi',
];

export function suggestLocalRiskScore(category: WaterIncidentCategory, description: string): number {
  const normalizedDescription = description
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
  const matchedSignals = urgentSignals.filter(signal => normalizedDescription.includes(signal)).length;
  return Math.min(100, categoryScores[category] + matchedSignals * 8);
}
