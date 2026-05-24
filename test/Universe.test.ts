import { describe, expect, it } from "vitest";
import { canJump, generateUniverse, getJumpDistance } from "../src/game/Universe";
import type { StarSystem } from "../src/game/types";

describe("Universe", () => {
  it("generates deterministic systems for the same seed", () => {
    expect(generateUniverse(42)).toEqual(generateUniverse(42));
  });

  it("calculates jump distance with Euclidean distance", () => {
    const a = systemAt(0, 0);
    const b = systemAt(3, 4);

    expect(getJumpDistance(a, b)).toBe(5);
  });

  it("checks fuel and max range for jumps", () => {
    const a = systemAt(0, 0);
    const nearby = systemAt(10, 0);
    const distant = systemAt(40, 0);

    expect(canJump(a, nearby, 7.5)).toBe(true);
    expect(canJump(a, nearby, 0.5)).toBe(false);
    expect(canJump(a, distant, 7.5)).toBe(false);
  });
});

function systemAt(x: number, y: number): StarSystem {
  return {
    id: 0,
    name: "Test",
    x,
    y,
    economy: "Agricultural",
    government: "Council",
    techLevel: 5,
    population: 3,
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
