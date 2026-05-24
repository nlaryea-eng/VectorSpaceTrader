import { describe, expect, it } from "vitest";
import { canJump } from "../src/game/Universe";
import { getSystemAtProjectedMapPoint, DEFAULT_MAP_FILTERS } from "../src/game/MapSearch";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import type { PlayerState, StarSystem } from "../src/game/types";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    balance: 1000,
    fuel: 10,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}

const MAP_X = 100;
const MAP_Y = 50;
const MAP_W = 500;
const MAP_H = 400;

describe("Map Selection Logic", () => {
  describe("getSystemAtProjectedMapPoint", () => {
    it("returns the nearest system within hit radius", () => {
      // System at universe (48, 36) → screen x=100+48/96*500=350, y=50+36/72*400=250
      const systems = [makeSystem(0, 48, 36), makeSystem(1, 5, 5)];
      const player = makePlayer();
      const result = getSystemAtProjectedMapPoint(systems, 352, 248, MAP_X, MAP_Y, MAP_W, MAP_H, 96, 72, player, DEFAULT_MAP_FILTERS, 10);
      expect(result?.id).toBe(0);
    });

    it("returns null when click is outside hit radius of all systems", () => {
      const systems = [makeSystem(0, 48, 36)];
      const player = makePlayer();
      const result = getSystemAtProjectedMapPoint(systems, 500, 350, MAP_X, MAP_Y, MAP_W, MAP_H, 96, 72, player, DEFAULT_MAP_FILTERS, 8);
      expect(result).toBeNull();
    });

    it("returns closest system when multiple are nearby", () => {
      // Both systems rendered close together; pick the nearer one
      const systems = [
        makeSystem(0, 48, 36), // screen (350, 250)
        makeSystem(1, 49, 37)  // screen ≈ (355, 256)
      ];
      const player = makePlayer();
      const result = getSystemAtProjectedMapPoint(systems, 352, 252, MAP_X, MAP_Y, MAP_W, MAP_H, 96, 72, player, DEFAULT_MAP_FILTERS, 20);
      expect(result?.id).toBe(0);
    });

    it("favors matched systems in tie-breaks", () => {
       const systems = [
        makeSystem(0, 48, 36), // screen (350, 250)
        makeSystem(1, 49, 37)  // screen ≈ (355, 256)
      ];
      const player = makePlayer();
      // Click at (353, 253)
      // Dist to S0 (350, 250) = sqrt(3^2 + 3^2) = sqrt(18) ≈ 4.24
      // Dist to S1 (355, 256) = sqrt(2^2 + 3^2) = sqrt(13) ≈ 3.6
      const filters = { ...DEFAULT_MAP_FILTERS, query: "System0" };
      const result = getSystemAtProjectedMapPoint(systems, 353, 253, MAP_X, MAP_Y, MAP_W, MAP_H, 96, 72, player, filters, 20);
      expect(result?.id).toBe(0);
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
    importHint: "machinery",
    exportHint: "grain",
    stationHint: "test port",
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
      localDescriptor: "bustling",
      tradeHint: "Active exchange",
      serviceHint: "Basic provisions",
      missionHint: "Routine hauls",
      travelCaution: "Clear lanes",
      discoveryNote: "Historic site"
    }
  };
}
});
