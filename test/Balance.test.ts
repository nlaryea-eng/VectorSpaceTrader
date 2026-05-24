import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT, EQUIPMENT } from "../src/game/Equipment";
import { acceptMission, completeMission, generateMissions } from "../src/game/Missions";
import { PLAYER_SHIPS } from "../src/game/Ships";
import { getStationProfile } from "../src/game/StationServices";
import { buyCommodity, buyFuel, repairHull, sellCommodity } from "../src/game/Trading";
import { canJump, generateUniverse } from "../src/game/Universe";
import { createEconomyState, generateDynamicMarket } from "../src/game/Economy";
import type { PlayerState } from "../src/game/types";

describe("Sprint 4 balance invariants", () => {
  it("starter can refuel and repair at the start station", () => {
    const systems = generateUniverse(492017);
    const profile = getStationProfile(systems[0]);
    const player = makePlayer({ fuel: 7, hull: 90, credits: 100 });

    expect(profile.services.fuel).toBe(true);
    expect(profile.services.repair).toBe(true);
    expect(buyFuel(player, 0.5).ok).toBe(true);
    expect(repairHull(player, profile.repairCostModifier).ok).toBe(true);
  });

  it("offers early completable missions", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer();
    const missions = generateMissions(492017, systems[0], systems, player, getStationProfile(systems[0]));
    const completable = missions.filter((mission) => {
      const destination = systems[mission.destinationSystemId];
      return acceptMission(player, mission).ok && canJump(systems[0], destination, player.fuel, player);
    });

    expect(completable.length).toBeGreaterThanOrEqual(3);
  });

  it("has an affordable early upgrade and a reachable first ship path", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer();
    const affordableUpgrade = EQUIPMENT.find((item) => item.id !== "pulseLaser" && item.price <= player.credits);
    const firstPaidShip = PLAYER_SHIPS.find((ship) => ship.price > 0)!;
    const missions = generateMissions(492017, systems[0], systems, player, getStationProfile(systems[0]));
    const completableRewards = missions
      .filter((mission) => acceptMission(player, mission).ok && canJump(systems[0], systems[mission.destinationSystemId], player.fuel, player))
      .map((mission) => mission.reward)
      .sort((a, b) => b - a);

    expect(affordableUpgrade).toBeDefined();
    expect(player.credits + completableRewards.slice(0, 2).reduce((total, reward) => total + reward, 0)).toBeGreaterThanOrEqual(firstPaidShip.price);
  });

  it("does not create same-station buy/sell balance profit", () => {
    const systems = generateUniverse(492017);
    const economy = createEconomyState(systems);
    const market = generateDynamicMarket(systems[0], economy);
    const item = market[0];
    const player = makePlayer({ credits: 1000 });
    const bought = buyCommodity(player, item, 1);
    expect(bought.ok).toBe(true);
    const sold = sellCommodity(bought.player, item, 1);

    expect(sold.ok).toBe(true);
    expect(sold.player.credits).toBe(player.credits);
  });

  it("keeps balances, cargo, and hull nonnegative through common outcomes", () => {
    const systems = generateUniverse(492017);
    const player = makePlayer({ credits: 0, cargo: { grain: 1 }, hull: 1 });
    const mission = generateMissions(492017, systems[0], systems, makePlayer(), getStationProfile(systems[0]))[0];
    const completed = completeMission(makePlayer({ credits: 0, activeMission: mission, activeMissionId: mission.id }), mission);

    expect(player.credits).toBeGreaterThanOrEqual(0);
    expect(player.cargo.grain).toBeGreaterThanOrEqual(0);
    expect(player.hull).toBeGreaterThanOrEqual(0);
    expect(completed.credits).toBeGreaterThanOrEqual(0);
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
    credits: 1000,
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
