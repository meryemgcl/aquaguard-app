import type { RiskLevel } from './kanban-types';

const riskColors: Record<RiskLevel, string> = {
  low: '#2f80ed',
  medium: '#f2c94c',
  high: '#ff6b35',
  critical: '#eb5757',
};

export function riskLevelToColor(level: RiskLevel): string {
  return riskColors[level];
}

/** Maps a reviewed risk score to its severity level and matching map color. */
export function riskScoreToColor(score: number): { riskLevel: RiskLevel; riskColor: string } {
  const riskLevel: RiskLevel = score < 30 ? 'low'
    : score < 60 ? 'medium'
      : score < 80 ? 'high'
        : 'critical';
  return { riskLevel, riskColor: riskLevelToColor(riskLevel) };
}
