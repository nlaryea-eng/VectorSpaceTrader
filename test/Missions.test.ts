import { describe, expect, it } from "vitest";
import { generateMissions, acceptMission } from "../src/game/Missions";
import { generateUniverse } from "../src/game/Universe";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import type { PlayerState } from "../src/game/types";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100, maxHull: 100, shield: 100, maxShield: 100, energy: 100,
    balance: 1000, fuel: 7.5, cargo: {}, cargoCapacity: 20,
    currentSystemId: 0, discoveredSystemIds: [0], docked: false,
    legalRisk: 0, reputation: 0, equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}

describe("Missions", () => {
  it("generates deterministic missions for a station", () => {
    const systems = generateUniverse(492017);
    const current = systems[0];
    const player = makePlayer();

    const missions1 = generateMissions(492017, current, systems, player);
    const missions2 = generateMissions(492017, current, systems, player);

    expect(missions1.length).toBeGreaterThanOrEqual(6);
    expect(missions1.length).toBeLessThanOrEqual(12);
    expect(missions1[0].id).toBe(missions2[0].id);
    expect(missions1[0].title).toBe(missions2[0].title);
  });

  it("starter station has reachable missions", () => {
    const systems = generateUniverse(492017);
    const current = systems[0];
    const player = makePlayer();

    const missions = generateMissions(492017, current, systems, player);
    expect(missions.length).toBeGreaterThanOrEqual(3);
  });

  it("accepting a mission snapshots it into player state", () => {
    const systems = generateUniverse(492017);
    const current = systems[0];
    const player = makePlayer();
    const missions = generateMissions(492017, current, systems, player);
    const mission = missions[0];

    const result = acceptMission(player, mission);
    expect(result.ok).toBe(true);
    expect(result.player.activeMissionId).toBe(mission.id);
    expect(result.player.activeMission).toEqual(mission);
  });
});
