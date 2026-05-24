import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import {
  DEFAULT_MAP_FILTERS,
  filterSystems,
  getSystemAtProjectedMapPoint,
  matchesMapFilters,
  projectSystemToMap,
  selectAdjacentFilteredSystem
} from "../src/game/MapSearch";
import { getStationProfile } from "../src/game/StationServices";
import { generateUniverse, UNIVERSE_CONSTANTS } from "../src/game/Universe";
import type { PlayerState } from "../src/game/types";

describe("MapSearch", () => {
  it("searches by system name", () => {
    const systems = generateUniverse(492017);
    const target = systems[12];
    const result = filterSystems(systems, { ...DEFAULT_MAP_FILTERS, query: target.name.slice(0, 4) }, makePlayer());

    expect(result.map((system) => system.id)).toContain(target.id);
  });

  it("filters by hazard, economy, discovery, and service", () => {
    const systems = generateUniverse(492017);
    const target = systems.find((system) => getStationProfile(system).services.shipyard && system.id !== 0)!;
    const player = makePlayer({ discoveredSystemIds: [0, target.id] });
    const filters = {
      ...DEFAULT_MAP_FILTERS,
      hazard: target.hazardTag,
      economy: target.economy,
      discovery: "discovered" as const,
      service: "shipyard" as const
    };

    expect(matchesMapFilters(target, filters, player)).toBe(true);
    expect(filterSystems(systems, filters, player).every((system) => getStationProfile(system).services.shipyard)).toBe(true);
  });

  it("preserves navigation through filtered matches", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer();
    const matches = filterSystems(systems, { ...DEFAULT_MAP_FILTERS, service: "shipyard" }, player);
    const selected = selectAdjacentFilteredSystem(systems, 0, 1, { ...DEFAULT_MAP_FILTERS, service: "shipyard" }, player);

    expect(matches.map((system) => system.id)).toContain(selected);
  });

  it("projects and hit-tests systems without renderer state", () => {
    const systems = generateUniverse(492017);
    const target = systems[5];
    const point = projectSystemToMap(target, 100, 50, 500, 400, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
    const result = getSystemAtProjectedMapPoint(
      systems,
      point.x + 1,
      point.y + 1,
      100,
      50,
      500,
      400,
      UNIVERSE_CONSTANTS.width,
      UNIVERSE_CONSTANTS.height,
      8
    );

    expect(result?.id).toBe(target.id);
  });
});

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
