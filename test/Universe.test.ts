import { describe, expect, it } from "vitest";
import { canJump, generateUniverse, getJumpDistance, UNIVERSE_CONSTANTS } from "../src/game/Universe";
import type { StarSystem } from "../src/game/types";

describe("Universe", () => {
  it("generates deterministic systems for the same seed", () => {
    expect(generateUniverse(42)).toEqual(generateUniverse(42));
  });

  it("generates the Sprint 4 target count with valid metadata", () => {
    const systems = generateUniverse(42);
    expect(systems).toHaveLength(UNIVERSE_CONSTANTS.systemCount);
    for (const system of systems) {
      expect(system.description.trim()).not.toBe("");
      expect(system.culture.trim()).not.toBe("");
      expect(system.stationHint.trim()).not.toBe("");
      expect(system.hazardLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves first 40 core systems when expanding count", () => {
    const forty = generateUniverse(42, 40);
    const expanded = generateUniverse(42, 128).slice(0, 40);

    expect(expanded.map(coreSystemFields)).toEqual(forty.map(coreSystemFields));
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
    description: "Test system",
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
    },
    profile: {
      classId: "garden",
      localDescriptor: "quiet",
      tradeHint: "Active exchange",
      serviceHint: "Basic provisions",
      missionHint: "Routine hauls",
      travelCaution: "Clear lanes",
      discoveryNote: "Early settlement"
    }
  };
}

function coreSystemFields(system: StarSystem): unknown {
  return {
    id: system.id,
    name: system.name,
    x: system.x,
    y: system.y,
    economy: system.economy,
    government: system.government,
    techLevel: system.techLevel,
    population: system.population,
    marketModifiers: system.marketModifiers
  };
}
