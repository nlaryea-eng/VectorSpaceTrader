export interface RunStats {
  totalBalEarned: number;
  jumpsCompleted: number;
  systemsVisited: number[];
  missionsCompleted: number;
  missionsFailed: number;
  enemiesDestroyed: number;
  timePlayed: number;
  causeOfDeath: string;
}

export function createRunStats(startSystemId = 0): RunStats {
  return {
    totalBalEarned: 0,
    jumpsCompleted: 0,
    systemsVisited: [startSystemId],
    missionsCompleted: 0,
    missionsFailed: 0,
    enemiesDestroyed: 0,
    timePlayed: 0,
    causeOfDeath: "Unknown",
  };
}

export function addBalEarned(stats: RunStats, amount: number): RunStats {
  if (amount <= 0) return stats;
  return { ...stats, totalBalEarned: stats.totalBalEarned + amount };
}

export function recordJump(stats: RunStats, systemId: number): RunStats {
  const alreadyVisited = stats.systemsVisited.includes(systemId);
  return {
    ...stats,
    jumpsCompleted: stats.jumpsCompleted + 1,
    systemsVisited: alreadyVisited ? stats.systemsVisited : [...stats.systemsVisited, systemId],
  };
}

export function recordMissionCompleted(stats: RunStats): RunStats {
  return { ...stats, missionsCompleted: stats.missionsCompleted + 1 };
}

export function recordMissionFailed(stats: RunStats): RunStats {
  return { ...stats, missionsFailed: stats.missionsFailed + 1 };
}

export function recordEnemyDestroyed(stats: RunStats): RunStats {
  return { ...stats, enemiesDestroyed: stats.enemiesDestroyed + 1 };
}

export function advanceTimePlayed(stats: RunStats, dt: number): RunStats {
  return { ...stats, timePlayed: stats.timePlayed + dt };
}

export function setDeathCause(stats: RunStats, cause: string): RunStats {
  return { ...stats, causeOfDeath: cause };
}

export function formatTimePlayed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
