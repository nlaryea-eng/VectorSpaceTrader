export interface RankInfo {
  title: string;
  tier: number;
}

export interface RankInputs {
  totalBalEarned: number;
  missionsCompleted: number;
  enemiesDestroyed: number;
}

interface RankThreshold {
  score: number;
  title: string;
}

export const RANK_THRESHOLDS: readonly RankThreshold[] = [
  { score: 0,      title: "Drifter" },
  { score: 500,    title: "Hauler" },
  { score: 2500,   title: "Contractor" },
  { score: 10000,  title: "Pathfinder" },
  { score: 30000,  title: "Sector Runner" },
  { score: 80000,  title: "Void Pilot" },
  { score: 200000, title: "Station Legend" },
] as const;

export function getRankScore(inputs: RankInputs): number {
  return inputs.totalBalEarned
    + inputs.missionsCompleted * 800
    + inputs.enemiesDestroyed * 300;
}

export function getPilotRank(inputs: RankInputs): RankInfo {
  const score = getRankScore(inputs);
  let tier = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= RANK_THRESHOLDS[i].score) {
      tier = i;
      break;
    }
  }
  return { title: RANK_THRESHOLDS[tier].title, tier };
}
