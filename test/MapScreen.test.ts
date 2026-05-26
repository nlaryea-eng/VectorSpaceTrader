import { describe, expect, it } from "vitest";

import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { DEFAULT_MAP_FILTERS } from "../src/game/MapSearch";
import { createMissionId } from "../src/game/MissionIds";
import { getActiveFilterLabels, getMissionDestinationIds, getTradeSignalHints } from "../src/game/render/screens/MapScreen";
import type { MarketItem, Mission, PlayerState } from "../src/game/types";

function player(overrides: Partial<PlayerState> = {}): PlayerState {
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
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0,
    ...overrides
  };
}

function mission(destinationSystemId: number): Mission {
  return {
    id: createMissionId(4, BigInt(destinationSystemId + 1)),
    type: "courier",
    typeLabel: "Courier",
    title: "Signal Packet",
    briefing: "Move a sealed packet.",
    originSystemId: 0,
    destinationSystemId,
    reward: 120,
    reputationChange: 1,
    legalRiskChange: 0,
    failureReputationChange: -1,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    cargoLabel: "packet",
    deadlineJumps: 4,
    riskLabel: "low",
    riskLevel: 1
  };
}

function marketItem(name: string, signal: MarketItem["marketSignal"]): MarketItem {
  return {
    id: "grain",
    name,
    basePrice: 7,
    baseQuantity: 18,
    mass: 1,
    price: 9,
    quantity: 12,
    marketSignal: signal
  };
}

describe("Map decision surface selectors", () => {
  it("combines active mission and mission-board destinations", () => {
    const active = mission(4);
    const destinations = getMissionDestinationIds({
      player: player({ activeMission: active }),
      missions: [mission(2), mission(4)]
    });

    expect([...destinations].sort((a, b) => a - b)).toEqual([2, 4]);
  });

  it("summarizes local trade signals without generating destination markets", () => {
    expect(getTradeSignalHints([
      marketItem("Grain", "SURPLUS"),
      marketItem("Medicine", "DEMAND"),
      marketItem("Alloys", "STEADY")
    ])).toBe("SURP GRAIN · DEMD MEDICINE");
  });

  it("exposes active filters for the compact legend", () => {
    const labels = getActiveFilterLabels({
      ...DEFAULT_MAP_FILTERS,
      query: "Ara",
      systemClass: "garden",
      service: "shipyard"
    });

    expect(labels).toEqual(["Q ARA", "SVC SHIPYARD", "CLASS GARDEN"]);
  });
});
