import { describe, expect, it } from "vitest";
import {
  addCreditsEarned,
  advanceTimePlayed,
  createRunStats,
  formatTimePlayed,
  recordEnemyDestroyed,
  recordJump,
  recordMissionCompleted,
  recordMissionFailed,
  setDeathCause,
} from "../src/game/RunStats";

describe("createRunStats", () => {
  it("initializes all counters to zero", () => {
    const stats = createRunStats(0);
    expect(stats.totalCreditsEarned).toBe(0);
    expect(stats.jumpsCompleted).toBe(0);
    expect(stats.missionsCompleted).toBe(0);
    expect(stats.missionsFailed).toBe(0);
    expect(stats.enemiesDestroyed).toBe(0);
    expect(stats.timePlayed).toBe(0);
  });

  it("seeds systemsVisited with the start system", () => {
    const stats = createRunStats(3);
    expect(stats.systemsVisited).toContain(3);
    expect(stats.systemsVisited).toHaveLength(1);
  });

  it("defaults causeOfDeath to Unknown", () => {
    expect(createRunStats().causeOfDeath).toBe("Unknown");
  });
});

describe("addCreditsEarned", () => {
  it("adds positive revenue", () => {
    const s = createRunStats();
    expect(addCreditsEarned(s, 500).totalCreditsEarned).toBe(500);
  });

  it("accumulates across multiple calls", () => {
    let s = createRunStats();
    s = addCreditsEarned(s, 200);
    s = addCreditsEarned(s, 350);
    expect(s.totalCreditsEarned).toBe(550);
  });

  it("ignores zero amounts", () => {
    const s = createRunStats();
    expect(addCreditsEarned(s, 0).totalCreditsEarned).toBe(0);
  });

  it("ignores negative amounts", () => {
    const s = createRunStats();
    expect(addCreditsEarned(s, -100).totalCreditsEarned).toBe(0);
  });
});

describe("recordJump", () => {
  it("increments jump count", () => {
    const s = createRunStats(0);
    expect(recordJump(s, 1).jumpsCompleted).toBe(1);
  });

  it("adds new system to visited list", () => {
    const s = createRunStats(0);
    const updated = recordJump(s, 2);
    expect(updated.systemsVisited).toContain(2);
    expect(updated.systemsVisited).toHaveLength(2);
  });

  it("does not duplicate an already-visited system", () => {
    const s = createRunStats(0);
    const after1 = recordJump(s, 1);
    const after2 = recordJump(after1, 1);
    expect(after2.systemsVisited.filter(id => id === 1)).toHaveLength(1);
  });

  it("still increments jump count for revisits", () => {
    const s = createRunStats(0);
    const after = recordJump(recordJump(s, 1), 1);
    expect(after.jumpsCompleted).toBe(2);
  });
});

describe("recordMissionCompleted", () => {
  it("increments missions completed", () => {
    const s = createRunStats();
    expect(recordMissionCompleted(s).missionsCompleted).toBe(1);
  });

  it("does not change other fields", () => {
    const s = createRunStats();
    const updated = recordMissionCompleted(s);
    expect(updated.missionsFailed).toBe(0);
    expect(updated.jumpsCompleted).toBe(0);
  });
});

describe("recordMissionFailed", () => {
  it("increments missions failed", () => {
    const s = createRunStats();
    expect(recordMissionFailed(s).missionsFailed).toBe(1);
  });
});

describe("recordEnemyDestroyed", () => {
  it("increments enemies destroyed", () => {
    const s = createRunStats();
    expect(recordEnemyDestroyed(s).enemiesDestroyed).toBe(1);
  });

  it("accumulates kills", () => {
    let s = createRunStats();
    s = recordEnemyDestroyed(s);
    s = recordEnemyDestroyed(s);
    s = recordEnemyDestroyed(s);
    expect(s.enemiesDestroyed).toBe(3);
  });
});

describe("advanceTimePlayed", () => {
  it("adds dt to timePlayed", () => {
    const s = createRunStats();
    expect(advanceTimePlayed(s, 1.5).timePlayed).toBeCloseTo(1.5);
  });

  it("accumulates over multiple calls", () => {
    let s = createRunStats();
    s = advanceTimePlayed(s, 30);
    s = advanceTimePlayed(s, 30);
    expect(s.timePlayed).toBeCloseTo(60);
  });
});

describe("setDeathCause", () => {
  it("stores the cause of death", () => {
    const s = createRunStats();
    expect(setDeathCause(s, "Hull failure").causeOfDeath).toBe("Hull failure");
  });

  it("overwrites the default Unknown value", () => {
    const s = createRunStats();
    expect(s.causeOfDeath).toBe("Unknown");
    expect(setDeathCause(s, "Destroyed in combat").causeOfDeath).toBe("Destroyed in combat");
  });
});

describe("formatTimePlayed", () => {
  it("formats zero as 00:00", () => {
    expect(formatTimePlayed(0)).toBe("00:00");
  });

  it("formats 90 seconds as 01:30", () => {
    expect(formatTimePlayed(90)).toBe("01:30");
  });

  it("formats 3661 seconds correctly", () => {
    expect(formatTimePlayed(3661)).toBe("61:01");
  });

  it("pads minutes and seconds with leading zeros", () => {
    expect(formatTimePlayed(65)).toBe("01:05");
  });
});

describe("run reset semantics", () => {
  it("createRunStats produces a fresh slate", () => {
    let s = createRunStats(0);
    s = addCreditsEarned(s, 9999);
    s = recordJump(s, 1);
    s = recordJump(s, 2);
    s = recordMissionCompleted(s);
    s = recordEnemyDestroyed(s);

    const fresh = createRunStats(0);
    expect(fresh.totalCreditsEarned).toBe(0);
    expect(fresh.jumpsCompleted).toBe(0);
    expect(fresh.missionsCompleted).toBe(0);
    expect(fresh.enemiesDestroyed).toBe(0);
  });
});
