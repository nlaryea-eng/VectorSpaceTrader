import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { acceptMission, completeMission, decrementMissionDeadline, failMission } from "../src/game/Missions";
import { getTotalOccupiedCargo } from "../src/game/Trading";
import type { Mission, PlayerState } from "../src/game/types";

describe("MissionCargo", () => {
  describe("acceptMission", () => {
    it("accepts mission when player has enough free cargo space", () => {
      const player = makePlayer({ cargo: { grain: 5 }, cargoCapacity: 20 });
      const mission = makeMission({ cargoUnitsRequired: 3 });
      const result = acceptMission(player, mission);
      expect(result.ok).toBe(true);
      expect(result.player.missionCargoUnits).toBe(3);
      expect(result.player.activeMission).toEqual(mission);
    });

    it("rejects mission when player lacks free cargo space", () => {
      const player = makePlayer({ cargo: { grain: 18 }, cargoCapacity: 20 });
      const mission = makeMission({ cargoUnitsRequired: 3 });
      const result = acceptMission(player, mission);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("3");
      expect(result.player.activeMission).toBeUndefined();
    });

    it("accepts mission with zero cargo requirement regardless of hold fullness", () => {
      const player = makePlayer({ cargo: { grain: 20 }, cargoCapacity: 20 });
      const mission = makeMission({ cargoUnitsRequired: 0 });
      const result = acceptMission(player, mission);
      expect(result.ok).toBe(true);
      expect(result.player.missionCargoUnits).toBe(0);
    });

    it("sets missionCargoUnits to match mission requirement", () => {
      const player = makePlayer({ cargoCapacity: 20 });
      const mission = makeMission({ cargoUnitsRequired: 5 });
      const result = acceptMission(player, mission);
      expect(result.ok).toBe(true);
      expect(result.player.missionCargoUnits).toBe(5);
    });
  });

  describe("mission cargo occupies capacity", () => {
    it("mission cargo counts toward total occupied cargo", () => {
      const player = makePlayer({ cargo: { grain: 4 }, missionCargoUnits: 3, cargoCapacity: 20 });
      expect(getTotalOccupiedCargo(player)).toBe(7);
    });

    it("mission cargo reduces space available for commodity purchases", () => {
      const player = makePlayer({ missionCargoUnits: 15, cargoCapacity: 20 });
      const available = 20 - 15;
      expect(getTotalOccupiedCargo(player)).toBe(15);
      expect(player.cargoCapacity - getTotalOccupiedCargo(player)).toBe(available);
    });
  });

  describe("completeMission", () => {
    it("releases mission cargo on completion", () => {
      const player = makePlayer({ missionCargoUnits: 3, balance: 0 });
      const mission = makeMission({ reward: 200, cargoUnitsRequired: 3 });
      const result = completeMission(player, mission);
      expect(result.missionCargoUnits).toBe(0);
      expect(result.balance).toBe(200);
      expect(result.activeMission).toBeUndefined();
    });

    it("completes before deadline if delivered in time", () => {
      const player = makePlayer({ missionCargoUnits: 1 });
      const mission = makeMission({ deadlineJumps: 3, reward: 150, reputationChange: 4 });
      const result = completeMission(player, mission);
      expect(result.missionCargoUnits).toBe(0);
      expect(result.reputation).toBe(4);
    });
  });

  describe("decrementMissionDeadline", () => {
    it("decrements deadline by one on jump", () => {
      const mission = makeMission({ deadlineJumps: 4 });
      const player = makePlayer({ activeMission: mission });
      const result = decrementMissionDeadline(player);
      expect(result.failed).toBe(false);
      expect(result.player.activeMission?.deadlineJumps).toBe(3);
    });

    it("fails mission when deadline reaches zero", () => {
      const mission = makeMission({ deadlineJumps: 1 });
      const player = makePlayer({ activeMission: mission, missionCargoUnits: 2 });
      const result = decrementMissionDeadline(player);
      expect(result.failed).toBe(true);
      expect(result.player.activeMission).toBeUndefined();
      expect(result.player.missionCargoUnits).toBe(0);
    });

    it("does not fail mission if no deadline (deadlineJumps = -1)", () => {
      const mission = makeMission({ deadlineJumps: -1 });
      const player = makePlayer({ activeMission: mission });
      const result = decrementMissionDeadline(player);
      expect(result.failed).toBe(false);
      expect(result.player.activeMission?.deadlineJumps).toBe(-1);
    });

    it("does nothing when there is no active mission", () => {
      const player = makePlayer();
      const result = decrementMissionDeadline(player);
      expect(result.failed).toBe(false);
      expect(result.player).toEqual(player);
    });
  });

  describe("failMission", () => {
    it("clears mission and releases cargo", () => {
      const mission = makeMission({ cargoUnitsRequired: 3 });
      const player = makePlayer({ activeMission: mission, missionCargoUnits: 3, reputation: 5 });
      const result = failMission(player);
      expect(result.activeMission).toBeUndefined();
      expect(result.missionCargoUnits).toBe(0);
    });

    it("applies reputation penalty on failure", () => {
      const player = makePlayer({ reputation: 5 });
      const result = failMission(player);
      expect(result.reputation).toBe(3);
    });

    it("does not reduce reputation below -10", () => {
      const player = makePlayer({ reputation: -9 });
      const result = failMission(player);
      expect(result.reputation).toBe(-10);
    });
  });
});

import { createMissionId } from "../src/game/MissionIds";

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: createMissionId(0, 1n),
    type: "courier",
    typeLabel: "Courier",
    title: "Test Run",
    briefing: "Deliver something.",
    originSystemId: 0,
    destinationSystemId: 5,
    reward: 200,
    reputationChange: 3,
    legalRiskChange: 0,
    failureReputationChange: -2,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    cargoLabel: "test cargo",
    deadlineJumps: 5,
    riskLabel: "standard",
    riskLevel: 1,
    ...overrides
  };
}

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
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    missionCargoUnits: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}
