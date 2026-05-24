import { describe, expect, it } from "vitest";
import {
  getEnemyDifficultyModifier,
  getLegalRiskLabel,
  getMissionRewardModifier,
  getReputationLabel
} from "../src/game/Reputation";

describe("Reputation helpers", () => {
  describe("getReputationLabel", () => {
    it("returns Newcomer for zero reputation", () => {
      expect(getReputationLabel(0)).toBe("Newcomer");
    });

    it("returns Known Pilot for moderate reputation", () => {
      expect(getReputationLabel(3)).toBe("Known Pilot");
      expect(getReputationLabel(9)).toBe("Known Pilot");
    });

    it("returns Trusted Contractor at reputation 10", () => {
      expect(getReputationLabel(10)).toBe("Trusted Contractor");
      expect(getReputationLabel(19)).toBe("Trusted Contractor");
    });

    it("returns Station Ally at reputation 20+", () => {
      expect(getReputationLabel(20)).toBe("Station Ally");
      expect(getReputationLabel(100)).toBe("Station Ally");
    });

    it("returns Suspect for negative reputation", () => {
      expect(getReputationLabel(-1)).toBe("Suspect");
      expect(getReputationLabel(-10)).toBe("Suspect");
    });
  });

  describe("getLegalRiskLabel", () => {
    it("returns Clean at zero risk", () => {
      expect(getLegalRiskLabel(0)).toBe("Clean");
      expect(getLegalRiskLabel(1)).toBe("Clean");
    });

    it("returns Flagged at risk 2-4", () => {
      expect(getLegalRiskLabel(2)).toBe("Flagged");
      expect(getLegalRiskLabel(4)).toBe("Flagged");
    });

    it("returns Watched at risk 5-7", () => {
      expect(getLegalRiskLabel(5)).toBe("Watched");
      expect(getLegalRiskLabel(7)).toBe("Watched");
    });

    it("returns Hot at risk 8+", () => {
      expect(getLegalRiskLabel(8)).toBe("Hot");
      expect(getLegalRiskLabel(20)).toBe("Hot");
    });
  });

  describe("getMissionRewardModifier", () => {
    it("returns 1.0 for low reputation", () => {
      expect(getMissionRewardModifier(0)).toBe(1.0);
      expect(getMissionRewardModifier(5)).toBe(1.0);
    });

    it("returns 1.1 for trusted reputation", () => {
      expect(getMissionRewardModifier(10)).toBe(1.1);
    });

    it("returns 1.2 for top reputation", () => {
      expect(getMissionRewardModifier(20)).toBe(1.2);
    });
  });

  describe("getEnemyDifficultyModifier", () => {
    it("returns 1.0 for clean legal risk", () => {
      expect(getEnemyDifficultyModifier(0)).toBe(1.0);
      expect(getEnemyDifficultyModifier(1)).toBe(1.0);
    });

    it("returns higher multipliers for elevated risk", () => {
      expect(getEnemyDifficultyModifier(2)).toBeGreaterThan(1.0);
      expect(getEnemyDifficultyModifier(5)).toBeGreaterThan(getEnemyDifficultyModifier(2));
      expect(getEnemyDifficultyModifier(8)).toBeGreaterThan(getEnemyDifficultyModifier(5));
    });
  });
});
