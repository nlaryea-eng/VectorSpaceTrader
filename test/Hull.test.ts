import { describe, expect, it } from "vitest";
import { applyDamage, applyPlayerDamage, createEnemyShip, resolveProjectileHits, selectEnemyClass } from "../src/game/Combat";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { calcRepairCost, repairHull, REPAIR_COST_PER_HULL } from "../src/game/Trading";
import { deserializeSave, saveGame, loadGame, SAVE_KEY } from "../src/game/SaveGame";
import type { PlayerState, Projectile } from "../src/game/types";
import { vec3 } from "../src/game/Physics";

// ── player factory ──────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: vec3(),
    velocity: vec3(),
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 50,
    maxShield: 100,
    energy: 100,
    credits: 500,
    fuel: 7.5,
    cargo: {},
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

// ── hull damage ──────────────────────────────────────────────────────────────

describe("applyPlayerDamage", () => {
  it("shield absorbs damage first", () => {
    const player = makePlayer({ shield: 50, hull: 100 });
    const result = applyPlayerDamage(player, 30);
    expect(result.shield).toBe(20);
    expect(result.hull).toBe(100);
  });

  it("overflow after shield depleted damages hull", () => {
    const player = makePlayer({ shield: 10, hull: 100 });
    const result = applyPlayerDamage(player, 30);
    expect(result.shield).toBe(0);
    expect(result.hull).toBe(80);
  });

  it("hull depletes to zero when overwhelmed", () => {
    const player = makePlayer({ shield: 0, hull: 20 });
    const result = applyPlayerDamage(player, 999);
    expect(result.hull).toBe(0);
  });

  it("never reduces hull below zero", () => {
    const player = makePlayer({ shield: 0, hull: 5 });
    const result = applyPlayerDamage(player, 1000);
    expect(result.hull).toBeGreaterThanOrEqual(0);
  });

  it("shield and hull remain independent of energy", () => {
    const player = makePlayer({ shield: 0, hull: 100, energy: 100 });
    const result = applyPlayerDamage(player, 40);
    expect(result.energy).toBe(100); // energy untouched by combat damage
    expect(result.hull).toBe(60);
  });
});

// ── game-over condition via resolveProjectileHits ────────────────────────────

describe("game-over via hull depletion", () => {
  it("hull reaches zero when repeated enemy hits land", () => {
    const enemy = createEnemyShip();
    // create an enemy projectile aimed right at origin
    const projectile: Projectile = {
      id: "test",
      owner: "enemy",
      position: vec3(0, 0, 3),
      velocity: vec3(0, 0, -1),
      damage: 200,
      ttl: 2
    };
    const player = makePlayer({ shield: 0, hull: 10 });
    const result = resolveProjectileHits([projectile], enemy, player, 0.016);
    expect(result.player.hull).toBe(0);
  });
});

// ── applyDamage for ships (existing behaviour unchanged) ─────────────────────

describe("applyDamage (enemy ship)", () => {
  it("shield absorbs first, then hull", () => {
    const ship = createEnemyShip();
    const partialDamage = applyDamage(ship, ship.shield - 1);
    expect(partialDamage.shield).toBe(1);
    expect(partialDamage.hull).toBe(ship.maxHull);
  });
});

// ── repair ───────────────────────────────────────────────────────────────────

describe("repairHull", () => {
  it("restores hull when credits are sufficient", () => {
    const player = makePlayer({ hull: 60, maxHull: 100, credits: 500 });
    const result = repairHull(player);
    expect(result.ok).toBe(true);
    expect(result.player.hull).toBe(100);
    expect(result.player.credits).toBe(500 - 40 * REPAIR_COST_PER_HULL);
  });

  it("partially repairs when credits are limited", () => {
    const creditsFor10 = 10 * REPAIR_COST_PER_HULL;
    const player = makePlayer({ hull: 60, maxHull: 100, credits: creditsFor10 });
    const result = repairHull(player);
    expect(result.ok).toBe(true);
    expect(result.player.hull).toBe(70);
    expect(result.player.credits).toBe(0);
  });

  it("fails when credits are zero", () => {
    const player = makePlayer({ hull: 50, maxHull: 100, credits: 0 });
    const result = repairHull(player);
    expect(result.ok).toBe(false);
  });

  it("fails when hull is already full", () => {
    const player = makePlayer({ hull: 100, maxHull: 100, credits: 1000 });
    const result = repairHull(player);
    expect(result.ok).toBe(false);
  });

  it("never exceeds maxHull", () => {
    const player = makePlayer({ hull: 99, maxHull: 100, credits: 10000 });
    const result = repairHull(player);
    expect(result.player.hull).toBeLessThanOrEqual(player.maxHull);
  });

  it("costs correct amount per missing hull point", () => {
    const missing = 20;
    const player = makePlayer({ hull: 100 - missing, maxHull: 100, credits: 1000 });
    const costBefore = calcRepairCost(player);
    expect(costBefore).toBe(missing * REPAIR_COST_PER_HULL);
    const result = repairHull(player);
    expect(result.player.credits).toBe(player.credits - missing * REPAIR_COST_PER_HULL);
  });
});

// ── save / load hull persistence and migration ───────────────────────────────

describe("save/load hull persistence", () => {
  it("persists hull and maxHull in save data", () => {
    const storage = new MemStorage();
    const player = makePlayer({ hull: 72, maxHull: 100 });
    const save = { version: 1 as const, savedAt: 1, seed: 42, player };
    saveGame(save, storage);
    const loaded = loadGame(storage);
    expect(loaded?.player.hull).toBe(72);
    expect(loaded?.player.maxHull).toBe(100);
  });

  it("migrates old saves missing hull to defaults of 100/100", () => {
    // simulate a save written before hull was added (hull fields absent)
    const legacyPlayer = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { pitch: 0, yaw: 0, roll: 0 },
      speed: 0,
      shield: 80,
      maxShield: 100,
      energy: 100,
      credits: 500,
      fuel: 7.5,
      cargo: {},
      cargoCapacity: 20,
      currentSystemId: 0,
      discoveredSystemIds: [0],
      docked: false,
      legalRisk: 0,
      reputation: 0,
      equipment: { ...DEFAULT_EQUIPMENT }
      // no hull / maxHull
    };
    const raw = JSON.stringify({ version: 1, savedAt: 1, seed: 42, player: legacyPlayer });
    const result = deserializeSave(raw);
    expect(result).not.toBeNull();
    expect(result?.player.hull).toBe(100);
    expect(result?.player.maxHull).toBe(100);
  });

  it("does not override hull when already present in save", () => {
    const player = makePlayer({ hull: 55, maxHull: 100 });
    const raw = JSON.stringify({ version: 1, savedAt: 1, seed: 42, player });
    const result = deserializeSave(raw);
    expect(result?.player.hull).toBe(55);
    expect(result?.player.maxHull).toBe(100);
  });
});

// ── enemy class selection (respawn scaling) ──────────────────────────────────

describe("selectEnemyClass", () => {
  it("returns class 0 for a new player with no reputation", () => {
    expect(selectEnemyClass(0, 0)).toBe(0);
  });

  it("advances class index with higher reputation", () => {
    const low = selectEnemyClass(0, 0);
    const high = selectEnemyClass(30, 0);
    // higher reputation should generally pick a higher (or wrapped) class
    expect(typeof high).toBe("number");
    expect(high).toBeGreaterThanOrEqual(0);
    // they should differ for a large reputation gap
    expect(low).not.toBe(high);
  });

  it("bumps class when legal risk exceeds threshold", () => {
    const safe = selectEnemyClass(0, 0);
    const risky = selectEnemyClass(0, 3);
    expect(risky).not.toBe(safe);
  });

  it("always returns a valid class index", () => {
    const classCount = 4; // ENEMY_CLASSES.length
    for (const rep of [0, 5, 10, 20, 50, 100]) {
      for (const risk of [0, 1, 3, 5]) {
        const idx = selectEnemyClass(rep, risk);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(classCount);
      }
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(selectEnemyClass(15, 1)).toBe(selectEnemyClass(15, 1));
  });
});

// ── helper ───────────────────────────────────────────────────────────────────

class MemStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
}

// suppress unused import warning
void SAVE_KEY;
