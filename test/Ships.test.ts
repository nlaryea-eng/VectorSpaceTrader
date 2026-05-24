import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { deserializeSave, serializeSave } from "../src/game/SaveGame";
import { buyShip, getPlayerShipStats, PLAYER_SHIPS } from "../src/game/Ships";
import { createRunStats } from "../src/game/RunStats";
import type { PlayerState, SaveData } from "../src/game/types";

describe("Ships", () => {
  it("defines unique valid player ships", () => {
    const ids = new Set(PLAYER_SHIPS.map((ship) => ship.id));
    expect(ids.size).toBe(PLAYER_SHIPS.length);
    expect(PLAYER_SHIPS.length).toBeGreaterThanOrEqual(6);
    for (const ship of PLAYER_SHIPS) {
      expect(ship.name.trim()).not.toBe("");
      expect(ship.maxHull).toBeGreaterThan(0);
      expect(ship.maxShield).toBeGreaterThan(0);
      expect(ship.cargoCapacity).toBeGreaterThan(0);
      expect(ship.fuelCapacity).toBeGreaterThan(0);
      expect(ship.price).toBeGreaterThanOrEqual(0);
    }
  });

  it("blocks ship purchase without enough BAL", () => {
    const result = buyShip(makePlayer({ balance: 10 }), "vaskRelay");

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("BAL");
  });

  it("blocks cargo overflow when buying a smaller ship", () => {
    const player = makePlayer({
      shipId: "vannicHold",
      cargoCapacity: 52,
      cargo: { grain: 20 },
      balance: 10000
    });

    const result = buyShip(player, "vaskRelay");

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Cargo overflow");
  });

  it("preserves hull and shield ratios after purchase", () => {
    const player = makePlayer({ hull: 50, maxHull: 100, shield: 25, maxShield: 100, balance: 10000 });
    const result = buyShip(player, "brontWard");

    expect(result.ok).toBe(true);
    expect(result.player.shipId).toBe("brontWard");
    expect(result.player.hull).toBe(Math.round(result.player.maxHull * 0.5));
    expect(result.player.shield).toBe(Math.round(result.player.maxShield * 0.25));
    expect(result.player.hull).toBeLessThanOrEqual(result.player.maxHull);
  });

  it("keeps installed equipment compatible and reflected in stats", () => {
    const player = makePlayer({
      balance: 10000,
      equipment: { ...DEFAULT_EQUIPMENT, cargoExpansion: true, shieldBooster: true }
    });
    const result = buyShip(player, "talemRange");

    expect(result.ok).toBe(true);
    expect(result.player.equipment.cargoExpansion).toBe(true);
    expect(getPlayerShipStats(result.player).cargoCapacity).toBeGreaterThan(24);
    expect(getPlayerShipStats(result.player).maxShield).toBeGreaterThan(106);
  });

  it("persists selected ship through save round-trip", () => {
    const save = makeSave({ shipId: "calderaSpan", maxHull: 145, hull: 120 });
    const loaded = deserializeSave(serializeSave(save));

    expect(loaded?.player.shipId).toBe("calderaSpan");
    expect(loaded?.player.maxHull).toBe(145);
  });
});

function makeSave(playerOverrides: Partial<PlayerState> = {}): SaveData {
  const player = makePlayer(playerOverrides);
  return {
    version: 1,
    savedAt: 1,
    seed: 492017,
    player,
    runStats: createRunStats(player.currentSystemId)
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
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0,
    ...overrides
  };
}
