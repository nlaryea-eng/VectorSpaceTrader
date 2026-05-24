import { describe, expect, it } from "vitest";
import { getPilotRank, getRankScore, RANK_THRESHOLDS } from "../src/game/Rank";
import type { RankInputs } from "../src/game/Rank";

function inputs(totalBalEarned: number, missionsCompleted = 0, enemiesDestroyed = 0): RankInputs {
  return { totalBalEarned, missionsCompleted, enemiesDestroyed };
}

describe("RANK_THRESHOLDS", () => {
  it("has at least 6 tiers", () => {
    expect(RANK_THRESHOLDS.length).toBeGreaterThanOrEqual(6);
  });

  it("first threshold starts at score 0", () => {
    expect(RANK_THRESHOLDS[0].score).toBe(0);
  });

  it("thresholds are in ascending order", () => {
    for (let i = 1; i < RANK_THRESHOLDS.length; i++) {
      expect(RANK_THRESHOLDS[i].score).toBeGreaterThan(RANK_THRESHOLDS[i - 1].score);
    }
  });

  it("all titles are non-empty strings", () => {
    for (const t of RANK_THRESHOLDS) {
      expect(t.title).toBeTypeOf("string");
      expect(t.title.length).toBeGreaterThan(0);
    }
  });
});

describe("getRankScore", () => {
  it("returns only BAL score when no missions or kills", () => {
    expect(getRankScore(inputs(1000))).toBe(1000);
  });

  it("adds 800 per mission completed", () => {
    expect(getRankScore(inputs(0, 2, 0))).toBe(1600);
  });

  it("adds 300 per enemy destroyed", () => {
    expect(getRankScore(inputs(0, 0, 3))).toBe(900);
  });

  it("combines all three factors", () => {
    const score = getRankScore(inputs(500, 1, 1));
    expect(score).toBe(500 + 800 + 300);
  });
});

describe("getPilotRank", () => {
  it("returns tier 0 (Drifter) at score 0", () => {
    const rank = getPilotRank(inputs(0));
    expect(rank.tier).toBe(0);
    expect(rank.title).toBe("Drifter");
  });

  it("returns minimum rank for a fresh player", () => {
    const rank = getPilotRank(inputs(0, 0, 0));
    expect(rank.tier).toBe(0);
  });

  it("advances to Hauler at the correct threshold", () => {
    const haulerThreshold = RANK_THRESHOLDS[1].score;
    const below = getPilotRank(inputs(haulerThreshold - 1));
    const at = getPilotRank(inputs(haulerThreshold));
    expect(below.tier).toBe(0);
    expect(at.tier).toBe(1);
    expect(at.title).toBe("Hauler");
  });

  it("reaches maximum rank at the top threshold", () => {
    const topThreshold = RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1].score;
    const rank = getPilotRank(inputs(topThreshold));
    expect(rank.tier).toBe(RANK_THRESHOLDS.length - 1);
    expect(rank.title).toBe("Station Legend");
  });

  it("stays at max rank beyond the top threshold", () => {
    const rank = getPilotRank(inputs(99999999));
    expect(rank.tier).toBe(RANK_THRESHOLDS.length - 1);
  });

  it("advances correctly through each tier boundary", () => {
    for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
      const rank = getPilotRank(inputs(RANK_THRESHOLDS[i].score));
      expect(rank.tier).toBe(i);
      expect(rank.title).toBe(RANK_THRESHOLDS[i].title);
    }
  });

  it("rank advances when missions completed stat increases", () => {
    const base = getPilotRank(inputs(0, 0, 0));
    const improved = getPilotRank(inputs(0, 10, 0));
    expect(improved.tier).toBeGreaterThanOrEqual(base.tier);
  });

  it("rank advances when enemies destroyed stat increases", () => {
    const base = getPilotRank(inputs(0, 0, 0));
    const improved = getPilotRank(inputs(0, 0, 20));
    expect(improved.tier).toBeGreaterThanOrEqual(base.tier);
  });

  it("typical 10-minute run reaches at least tier 2", () => {
    // About 3000 BAL earned plus 2 missions in a short demo run.
    const rank = getPilotRank(inputs(3000, 2, 1));
    expect(rank.tier).toBeGreaterThanOrEqual(2);
  });
});
