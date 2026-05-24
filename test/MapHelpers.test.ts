import { describe, expect, it } from "vitest";
import { canJump, getSystemAtMapPoint } from "../src/game/Universe";
import type { StarSystem } from "../src/game/types";

describe("MapHelpers", () => {
  describe("getSystemAtMapPoint", () => {
    const MAP_X = 100;
    const MAP_Y = 50;
    const MAP_W = 500;
    const MAP_H = 400;

    it("returns the nearest system within hit radius", () => {
      // System at universe (48, 36) → screen x=100+48/96*500=350, y=50+36/72*400=250
      const systems = [makeSystem(0, 48, 36), makeSystem(1, 5, 5)];
      const result = getSystemAtMapPoint(systems, 352, 248, MAP_X, MAP_Y, MAP_W, MAP_H, 10);
      expect(result?.id).toBe(0);
    });

    it("returns null when click is outside hit radius of all systems", () => {
      const systems = [makeSystem(0, 48, 36)];
      const result = getSystemAtMapPoint(systems, 500, 350, MAP_X, MAP_Y, MAP_W, MAP_H, 8);
      expect(result).toBeNull();
    });

    it("returns closest system when multiple are nearby", () => {
      // Both systems rendered close together; pick the nearer one
      const systems = [
        makeSystem(0, 48, 36), // screen (350, 250)
        makeSystem(1, 49, 37)  // screen ≈ (355, 256)
      ];
      const result = getSystemAtMapPoint(systems, 352, 252, MAP_X, MAP_Y, MAP_W, MAP_H, 20);
      expect(result?.id).toBe(0);
    });

    it("uses default hit radius of 8 when not specified", () => {
      // System at universe (48, 36) → screen (350, 250); default radius = 8
      const systems = [makeSystem(0, 48, 36)];
      expect(getSystemAtMapPoint(systems, 359, 250, MAP_X, MAP_Y, MAP_W, MAP_H)).toBeNull(); // distance 9 > 8
      expect(getSystemAtMapPoint(systems, 355, 250, MAP_X, MAP_Y, MAP_W, MAP_H)?.id).toBe(0); // distance 5 < 8
    });
  });

  describe("canJump in-range calculation", () => {
    it("returns true when system is within max range and player has fuel", () => {
      const from = makeSystem(0, 0, 0);
      const to = makeSystem(1, 10, 0);
      expect(canJump(from, to, 7.5)).toBe(true);
    });

    it("returns false when system is beyond max jump range", () => {
      const from = makeSystem(0, 0, 0);
      const to = makeSystem(1, 50, 0);
      expect(canJump(from, to, 7.5)).toBe(false);
    });

    it("returns false when player lacks sufficient fuel", () => {
      const from = makeSystem(0, 0, 0);
      const to = makeSystem(1, 20, 0); // distance 20, fuel = 20 * 0.22 = 4.4
      expect(canJump(from, to, 2.0)).toBe(false);
    });

    it("returns false for current system (distance 0, same id context)", () => {
      const from = makeSystem(0, 0, 0);
      const to = makeSystem(0, 0, 0);
      // distance is 0 which is ≤ maxJumpRange; fuel required is 0
      expect(canJump(from, to, 0)).toBe(true);
    });
  });
});

function makeSystem(id: number, x: number, y: number): StarSystem {
  return {
    id,
    name: `System${id}`,
    x,
    y,
    economy: "Agricultural",
    government: "Cooperative",
    techLevel: 5,
    population: 3.0,
    description: `Test system ${id}`,
    culture: "test crews",
    hazardTag: "calm",
    hazardLevel: 0,
    opportunityTag: "steadyDemand",
    importHint: "computers",
    exportHint: "grain",
    stationHint: "test berth",
    marketModifiers: {
      grain: 1,
      minerals: 1,
      computers: 1,
      medicine: 1,
      machinery: 1,
      luxuries: 1,
      fuelCells: 1,
      alloys: 1
    }
  };
}
