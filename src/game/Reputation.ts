export function getReputationLabel(reputation: number): string {
  if (reputation >= 20) return "Station Ally";
  if (reputation >= 10) return "Trusted Contractor";
  if (reputation >= 3) return "Known Pilot";
  if (reputation >= 0) return "Newcomer";
  return "Suspect";
}

export function getLegalRiskLabel(legalRisk: number): string {
  if (legalRisk >= 8) return "Hot";
  if (legalRisk >= 5) return "Watched";
  if (legalRisk >= 2) return "Flagged";
  return "Clean";
}

export function getMissionRewardModifier(reputation: number): number {
  if (reputation >= 20) return 1.2;
  if (reputation >= 10) return 1.1;
  return 1.0;
}

export function getEnemyDifficultyModifier(legalRisk: number): number {
  if (legalRisk >= 8) return 1.4;
  if (legalRisk >= 5) return 1.2;
  if (legalRisk >= 2) return 1.1;
  return 1.0;
}
