import { describe, expect, it } from "vitest";
import { generateMissions } from "../src/game/Missions";
import { generateUniverse } from "../src/game/Universe";
import type { PlayerState } from "../src/game/types";

describe("Missions", () => {
  it("generates deterministic mission offers", () => {
    const systems = generateUniverse(99);
    const player = makePlayer();

    expect(generateMissions(12, systems[0], systems, player)).toEqual(generateMissions(12, systems[0], systems, player));
  });

  it("generates at least six original mission templates", () => {
    const systems = generateUniverse(99);
    const missions = generateMissions(12, systems[0], systems, makePlayer());

    expect(missions).toHaveLength(6);
    expect(new Set(missions.map((mission) => mission.type)).size).toBe(6);
  });
});

function makePlayer(): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    credits: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: {
      pulseLaser: true,
      beamLaser: false,
      cargoExpansion: false,
      fuelScoop: false,
      shieldBooster: false
    }
  };
}
