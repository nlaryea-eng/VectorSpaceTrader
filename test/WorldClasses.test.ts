import { describe, expect, it } from "vitest";
import { createEconomyState, generateDynamicMarket } from "../src/game/Economy";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { generateMissions } from "../src/game/Missions";
import { getStationProfile } from "../src/game/StationServices";
import { canJump, generateUniverse } from "../src/game/Universe";
import {
  getWorldHazardRiskAdjustment,
  getWorldMissionTypePool,
  WORLD_CLASS_IDS
} from "../src/game/WorldClasses";
import type { MissionType, PlayerState, StarSystem, SystemClassId } from "../src/game/types";

describe("World classes", () => {
  it("generates every declared class for the release seed", () => {
    const systems = generateUniverse(492017);
    const generated = new Set(systems.map((system) => system.profile.classId));

    expect([...generated].sort()).toEqual([...WORLD_CLASS_IDS].sort());
  });

  it("generates only declared classes with deterministic distribution", () => {
    const systemsA = generateUniverse(492017);
    const systemsB = generateUniverse(492017);
    const declared = new Set(WORLD_CLASS_IDS);

    expect(systemsA.every((system) => declared.has(system.profile.classId))).toBe(true);
    expect(classDistribution(systemsA)).toEqual(classDistribution(systemsB));
  });

  it("keeps system ids and names stable when profiles are generated", () => {
    const forty = generateUniverse(492017, 40);
    const expanded = generateUniverse(492017, 128).slice(0, 40);

    expect(expanded.map((system) => ({ id: system.id, name: system.name }))).toEqual(
      forty.map((system) => ({ id: system.id, name: system.name }))
    );
  });

  it("keeps the starter station safe and useful", () => {
    const start = generateUniverse(492017)[0];
    const profile = getStationProfile(start);

    expect(start.hazardLevel).toBeGreaterThanOrEqual(0);
    expect(profile.services.market).toBe(true);
    expect(profile.services.fuel).toBe(true);
    expect(profile.services.repair).toBe(true);
    expect(profile.services.missions).toBe(true);
    expect(profile.services.equipment).toBe(true);
    expect(profile.services.shipyard).toBe(true);
  });

  it("applies trade bias to quantities without changing prices", () => {
    const system = generateUniverse(492017).find((candidate) => candidate.profile.classId !== "harbor")!;
    const economy = createEconomyState([system]);
    const baseline = generateDynamicMarket(withClass(system, "garden"), economy);
    const biased = generateDynamicMarket(withClass(system, "harbor"), economy);

    expect(biased.some((item, index) => item.quantity !== baseline[index].quantity)).toBe(true);
    expect(biased.every((item) => item.quantity >= 0)).toBe(true);
    expect(biased.map((item) => item.price)).toEqual(baseline.map((item) => item.price));
  });

  it("applies service bias deterministically without removing fuel or repair", () => {
    const system = generateUniverse(492017).find((candidate) => {
      const base = getStationProfile(withClass(candidate, "garden"));
      return !base.services.survey && candidate.id !== 0;
    })!;
    const biased = withClass(system, "observatory");
    const highService = getStationProfile(withClass(system, "cradle"));
    const lowService = getStationProfile(withClass(system, "drift"));

    expect(getStationProfile(biased)).toEqual(getStationProfile(biased));
    expect(getStationProfile(biased).services.survey).toBe(true);
    expect(getStationProfile(biased).services.fuel).toBe(true);
    expect(getStationProfile(biased).services.repair).toBe(true);
    expect(highService.marketScale).toBeGreaterThan(lowService.marketScale);
  });

  it("uses mission bias as deterministic weighting while keeping boards bounded", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer({ fuel: 100 });
    const baseTypes: readonly MissionType[] = ["courier", "fragile", "urgent", "medical", "survey", "passenger", "salvage", "supply", "restricted", "reputation"];
    let neutral: ReturnType<typeof generateMissions> | undefined;
    let biased: ReturnType<typeof generateMissions> | undefined;
    let biasedOrigin: StarSystem | undefined;

    for (const system of systems.filter((candidate) => candidate.id !== 0 && getStationProfile(candidate).services.missions)) {
      const neutralOrigin = withClass(system, "garden");
      const relayOrigin = withClass(system, "relay");
      const neutralBoard = generateMissions(492017, neutralOrigin, systems, player, getStationProfile(neutralOrigin));
      const biasedBoard = generateMissions(492017, relayOrigin, systems, player, getStationProfile(relayOrigin));
      if (neutralBoard.length >= 6 && biasedBoard.length >= 6 && neutralBoard.map((mission) => mission.type).join("|") !== biasedBoard.map((mission) => mission.type).join("|")) {
        neutral = neutralBoard;
        biased = biasedBoard;
        biasedOrigin = relayOrigin;
        break;
      }
    }

    expect(neutral).toBeDefined();
    expect(biased).toBeDefined();
    expect(biasedOrigin).toBeDefined();
    expect(getWorldMissionTypePool(biasedOrigin!, baseTypes).length).toBeGreaterThan(baseTypes.length);
    expect(biased!.map((mission) => mission.type)).not.toEqual(neutral!.map((mission) => mission.type));
    expect(biased!.length).toBeGreaterThanOrEqual(6);
    expect(biased!.length).toBeLessThanOrEqual(12);
  });

  it("keeps starter mission boards reachable and not equipment-gated", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer();
    const missions = generateMissions(492017, systems[0], systems, player, getStationProfile(systems[0]));
    const reachable = missions.filter((mission) => canJump(systems[0], systems[mission.destinationSystemId], player.fuel, player));
    const acceptable = reachable.filter((mission) => !mission.requiredCategory && !mission.requiredEquipment);

    expect(missions.length).toBeGreaterThanOrEqual(6);
    expect(missions.length).toBeLessThanOrEqual(12);
    expect(acceptable.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps hazard risk adjustment bounded", () => {
    const system = { ...generateUniverse(492017)[1], hazardLevel: 4 };

    expect(getWorldHazardRiskAdjustment(withClass(system, "veil"))).toBe(1);
    expect(getWorldHazardRiskAdjustment(withClass(system, "garden"))).toBe(-1);
    for (const classId of WORLD_CLASS_IDS) {
      expect(Math.abs(getWorldHazardRiskAdjustment(withClass(system, classId)))).toBeLessThanOrEqual(1);
    }
  });
});

function classDistribution(systems: StarSystem[]): Record<SystemClassId, number> {
  return Object.fromEntries(
    WORLD_CLASS_IDS.map((classId) => [classId, systems.filter((system) => system.profile.classId === classId).length])
  ) as Record<SystemClassId, number>;
}

function withClass(system: StarSystem, classId: SystemClassId): StarSystem {
  return { ...system, profile: { ...system.profile, classId } };
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
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0,
    ...overrides
  };
}
