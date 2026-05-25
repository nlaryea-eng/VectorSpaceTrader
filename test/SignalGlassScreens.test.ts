import { describe, expect, it } from "vitest";

import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import {
  classifyEquipment,
  formatDeltaBadge,
  getEquipmentDisplayOrder,
  getMissionCardState,
  getRouteValidity,
  getShipComparison,
  getStationRecommendation,
  getStationServiceTiles
} from "../src/game/SignalGlassScreens";
import { getStationProfile } from "../src/game/StationServices";
import { generateUniverse } from "../src/game/Universe";
import { createMissionId } from "../src/game/MissionIds";
import type { MarketItem, Mission, PlayerState } from "../src/game/types";

const systems = generateUniverse(492017);

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 60,
    maxShield: 60,
    energy: 100,
    balance: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0, 1],
    docked: true,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}

function mission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: createMissionId(4, BigInt(1)),
    type: "courier",
    typeLabel: "Courier",
    title: "Signal Packet",
    briefing: "Move a sealed packet.",
    originSystemId: 0,
    destinationSystemId: 1,
    reward: 120,
    reputationChange: 1,
    legalRiskChange: 0,
    failureReputationChange: -1,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    cargoLabel: "packet",
    deadlineJumps: 4,
    riskLabel: "low",
    riskLevel: 1,
    ...overrides
  };
}

describe("Signal Glass screen helpers", () => {
  it("recommends repair before browsing missions when hull is low", () => {
    const recommendation = getStationRecommendation(player({ hull: 60 }), systems[0], [], 200);
    expect(recommendation.kind).toBe("repair");
    expect(recommendation.actionId).toBe("touch-equipment");
  });

  it("recommends selling profitable cargo with auditable delta text", () => {
    const market: MarketItem[] = [{ id: "grain", name: "Grain", basePrice: 7, baseQuantity: 18, mass: 1, price: 20, quantity: 5 }];
    const recommendation = getStationRecommendation(player({
      cargo: { grain: 6 },
      cargoCostBasis: { grain: 7 }
    }), systems[0], market, 0);

    expect(recommendation.kind).toBe("sell");
    expect(recommendation.detail).toContain("+78 BAL");
  });

  it("reports service availability without hiding unavailable services", () => {
    const tiles = getStationServiceTiles(systems[0]);
    expect(tiles.map((tile) => tile.label)).toEqual([
      "Trade Market",
      "Mission Board",
      "Shipyard",
      "Equipment & Hull Repair"
    ]);
    expect(tiles.every((tile) => tile.why.length > 0)).toBe(true);
    expect(tiles.some((tile) => tile.label === "Refuel / Repair")).toBe(false);
  });

  it("service tile shortLabels are stable and independent of label text", () => {
    const tiles = getStationServiceTiles(systems[0]);
    expect(tiles.map((tile) => tile.shortLabel)).toEqual([
      "MARKET",
      "MISSIONS",
      "SHIPYARD",
      "EQUIPMENT"
    ]);
    expect(tiles.find((t) => t.id === "touch-trade")?.shortLabel).toBe("MARKET");
  });

  it("keeps Equipment reachable for repair-only stations without making equipment universally available", () => {
    const repairOnly = systems.find((system) => {
      const profile = getStationProfile(system);
      return profile.services.repair && !profile.services.equipment;
    });
    expect(repairOnly).toBeDefined();
    const profile = getStationProfile(repairOnly!);
    const equipmentTile = getStationServiceTiles(repairOnly!).find((tile) => tile.id === "touch-equipment");
    expect(equipmentTile?.available).toBe(true);
    expect(profile.services.equipment).toBe(false);
  });

  it("formats profit and loss badges with sign, BAL, and percent", () => {
    expect(formatDeltaBadge(4, 10, 15).text).toBe("+20 BAL / +50.0%");
    expect(formatDeltaBadge(4, 10, 5).text).toBe("-20 BAL / -50.0%");
  });

  it("mirrors mission acceptability logic", () => {
    expect(getMissionCardState(player(), mission()).state).toBe("acceptable");
    expect(getMissionCardState(player({ activeMission: mission(), activeMissionId: "m-1" }), mission()).state).toBe("conflict");
    expect(getMissionCardState(player({ cargoCapacity: 0 }), mission({ cargoUnitsRequired: 2 })).state).toBe("locked");
  });

  it("reports route validity from existing jump logic", () => {
    const validity = getRouteValidity(systems[0], systems[1], player());
    expect(["valid", "warning", "outOfRange"]).toContain(validity.state);
    expect(validity.distance).toBeGreaterThanOrEqual(0);
    expect(validity.fuelRequired).toBeGreaterThanOrEqual(0);
  });

  it("classifies equipment by installed and station availability", () => {
    const sections = classifyEquipment(player(), getStationProfile(systems[0]));
    expect(sections.installed.some((item) => item.id === "pulseLaser")).toBe(true);
    expect(sections.available.length).toBeGreaterThan(0);
  });

  // R4 acceptance: getEquipmentDisplayOrder returns installed → available → unavailable.
  it("R4: getEquipmentDisplayOrder puts installed first, then available, then unavailable", () => {
    const station = getStationProfile(systems[0]);
    // Build a player with exactly 1 installed item known to be installed.
    const p = player();
    const sections = classifyEquipment(p, station);

    // Sanity-check the fixture has items in all three buckets.
    expect(sections.installed.length).toBeGreaterThanOrEqual(1);
    expect(sections.available.length).toBeGreaterThanOrEqual(1);
    expect(sections.unavailable.length).toBeGreaterThanOrEqual(1);

    const ordered = getEquipmentDisplayOrder(p, station);

    // Total length must equal sum of all sections.
    expect(ordered.length).toBe(sections.installed.length + sections.available.length + sections.unavailable.length);

    // The first N items must all be installed.
    const installedIds = new Set(sections.installed.map((i) => i.id));
    const availableIds = new Set(sections.available.map((i) => i.id));
    const unavailableIds = new Set(sections.unavailable.map((i) => i.id));

    let zone: "installed" | "available" | "unavailable" = "installed";
    for (const item of ordered) {
      if (zone === "installed") {
        if (!installedIds.has(item.id)) {
          zone = "available";
        }
      }
      if (zone === "available") {
        if (!availableIds.has(item.id)) {
          zone = "unavailable";
        }
      }
      if (zone === "unavailable") {
        expect(unavailableIds.has(item.id)).toBe(true);
      }
    }
    expect(zone).toBe("unavailable"); // confirmed we reached all three zones
  });

  it("computes ship comparison deltas and cargo overflow", () => {
    const summary = getShipComparison(player({ cargo: { grain: 18 }, cargoCapacity: 20 }), "vaskRelay");
    expect(summary.rows.some((row) => row.label === "Cargo")).toBe(true);
    expect(summary.cargoOverflow).toBeGreaterThanOrEqual(0);
    expect(summary.affordabilityLabel).toContain("BAL");
  });
});
